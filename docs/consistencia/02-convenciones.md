# 02 — Convenciones para la Ola 2 (Outbox + Idempotencia)

> Reglas obligatorias para los 5 agentes que implementan Ola 2 en paralelo. Todo lo que no esté aquí queda al criterio de cada agente, pero los nombres, paquetes y patrones **deben ser idénticos** entre servicios — eso garantiza que en Ola 5 podamos extraer un módulo `alquilaya-common-events`.

---

## 1. Estructura de paquetes

Cada servicio crea estos paquetes (sustituye `<servicio>` por `serviciopropiedades` / `serviciopagos` / `serviciousuarios` / `servicio_mensajeria` según corresponda — se respetan los packages actuales aunque sean inconsistentes; **no se renombran existentes en Ola 2**).

```
com.alquilaya.<servicio>.outbox
├── entity
│   └── OutboxEvent.java
├── repository
│   └── OutboxRepository.java
├── publisher
│   └── OutboxPublisher.java          ← API pública usada por la lógica de negocio
├── scheduler
│   └── OutboxScheduler.java          ← @Scheduled que drena la tabla a Kafka
└── envelope
    ├── EventEnvelope.java
    └── EventEnvelopeBuilder.java

com.alquilaya.<servicio>.kafka.idempotency
├── entity
│   └── ProcessedEvent.java
├── repository
│   └── ProcessedEventRepository.java
└── service
    └── IdempotencyService.java
```

> Si el package raíz del servicio usa guion bajo (caso `servicio_mensajeria`), se mantiene esa convención — no se renombra el package.

---

## 2. Nombres canónicos

| Concepto                | Clase                       |
|-------------------------|-----------------------------|
| Entidad outbox          | `OutboxEvent`               |
| Repositorio outbox      | `OutboxRepository`          |
| Publicador outbox       | `OutboxPublisher`           |
| Scheduler outbox        | `OutboxScheduler`           |
| Envelope (POJO)         | `EventEnvelope`             |
| Builder del envelope    | `EventEnvelopeBuilder`      |
| Entidad de idempotencia | `ProcessedEvent`            |
| Repositorio idemp.      | `ProcessedEventRepository`  |
| Servicio idemp.         | `IdempotencyService`        |

Constantes esperadas (`public static final`) en cada `<X>EventConsumer`:

```java
private static final String CONSUMER_NAME = "mensajeria-reserva-events"; // único por par (servicio, grupo)
```

El valor sigue el patrón **`<servicio>-<topic>`**, en minúsculas, para que `processed_events.consumer_name` sea legible.

---

## 3. `OutboxEvent` — esquema canónico de la entidad

```java
@Entity
@Table(name = "outbox_events")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class OutboxEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, unique = true)
    private UUID eventId;

    @Column(name = "aggregate_type", nullable = false, length = 50)
    private String aggregateType;

    @Column(name = "aggregate_id", nullable = false, length = 100)
    private String aggregateId;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(nullable = false, length = 100)
    private String topic;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String payload;   // JSON del envelope COMPLETO (no sólo payload del envelope)

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(nullable = false)
    private Integer attempts;

    @Column(name = "last_error", columnDefinition = "TEXT")
    private String lastError;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (attempts == null)  attempts  = 0;
    }
}
```

> **`payload` guarda el envelope completo serializado**, no solo el sub-payload. Esto simplifica el publisher: el scheduler hace `kafkaTemplate.send(topic, key, payload)` sin re-serializar.

---

## 4. `OutboxPublisher` — patrón canónico de uso

```java
@Service
@RequiredArgsConstructor
public class OutboxPublisher {

    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    @Value("${spring.application.name}")
    private String applicationName;

    /**
     * Persiste el evento en outbox dentro de la transacción del caller.
     * NO toca Kafka — eso lo hace el scheduler.
     */
    public void publicar(String topic, String eventType,
                         String aggregateType, String aggregateId,
                         Object payload, String correlationId) {
        EventEnvelope env = EventEnvelopeBuilder.builder()
                .eventType(eventType)
                .aggregateType(aggregateType)
                .aggregateId(aggregateId)
                .source(applicationName)
                .correlationId(correlationId)
                .payload(payload)
                .build();

        try {
            String json = objectMapper.writeValueAsString(env);
            outboxRepository.save(OutboxEvent.builder()
                    .eventId(env.getEventId())
                    .aggregateType(aggregateType)
                    .aggregateId(aggregateId)
                    .eventType(eventType)
                    .topic(topic)
                    .payload(json)
                    .build());
        } catch (JsonProcessingException e) {
            // Falla la transacción de negocio → ROLLBACK. Es lo correcto.
            throw new IllegalStateException("No se pudo serializar evento", e);
        }
    }
}
```

### Patrón canónico de uso en lógica de negocio

```java
@Transactional
public Reserva aprobar(Long reservaId, CurrentUser current) {
    Reserva r = obtenerPorId(reservaId);
    // ... validaciones ...
    r.setEstado(EstadoReserva.APROBADA);
    Reserva guardada = reservaRepository.save(r);

    // ANTES (queda prohibido):  reservaEventProducer.emitir("RESERVA_APROBADA", r.getId(), extra);
    // AHORA (canónico):
    outboxPublisher.publicar(
            "reserva-events",
            "RESERVA_APROBADA",
            "Reserva",
            guardada.getId().toString(),
            ReservaAprobadaPayload.from(guardada, /*data extra*/),
            MDC.get("correlationId"));

    return guardada;
}
```

> **Regla dura:** ninguna lógica de negocio puede llamar a `kafkaTemplate.send(...)` directamente. El único caller de `KafkaTemplate` es `OutboxScheduler`.

---

## 5. `OutboxScheduler` — política de drenado

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxScheduler {

    private static final int BATCH_SIZE       = 50;
    private static final int MAX_ATTEMPTS     = 5;
    private static final long BASE_BACKOFF_MS = 1_000L; // 1s, 2s, 4s, 8s, 16s

    private final OutboxRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    /**
     * Cada 2 segundos lee un batch de eventos pendientes con LOCK pesimista
     * (FOR UPDATE SKIP LOCKED) para soportar múltiples instancias del servicio.
     */
    @Scheduled(fixedDelay = 2_000L)
    @Transactional
    public void drenar() {
        List<OutboxEvent> pendientes = outboxRepository.findPendientesParaPublicar(BATCH_SIZE);
        for (OutboxEvent ev : pendientes) {
            if (ev.getAttempts() >= MAX_ATTEMPTS) {
                continue; // dejado en BD como DLQ; alarmará a observabilidad
            }
            try {
                kafkaTemplate.send(ev.getTopic(), ev.getAggregateId(), ev.getPayload()).get();
                ev.setSentAt(LocalDateTime.now());
                ev.setLastError(null);
                outboxRepository.save(ev);
            } catch (Exception e) {
                ev.setAttempts(ev.getAttempts() + 1);
                ev.setLastError(truncar(e.getMessage(), 4000));
                outboxRepository.save(ev);
                // Backoff: no es bloqueante porque el próximo ciclo lo retomará.
                log.warn("Outbox publish falló eventId={} attempt={} err={}",
                         ev.getEventId(), ev.getAttempts(), e.getMessage());
            }
        }
    }
}
```

### Query del repositorio (skip-locked)

```java
public interface OutboxRepository extends JpaRepository<OutboxEvent, Long> {
    @Query(value = """
            SELECT * FROM outbox_events
            WHERE sent_at IS NULL AND attempts < 5
            ORDER BY created_at ASC
            LIMIT :limit
            FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    List<OutboxEvent> findPendientesParaPublicar(@Param("limit") int limit);
}
```

> `FOR UPDATE SKIP LOCKED` es la clave para soportar múltiples instancias sin pisarse: cada réplica toma un batch propio.

### Política de retries (resumen)

- **Interval del scheduler:** 2 s.
- **Batch:** 50 eventos.
- **Max attempts:** 5.
- **Backoff:** implícito (cada ciclo de 2 s vuelve a intentar). No se hace `Thread.sleep` dentro del scheduler — eso bloquearía el thread pool. La separación de 2 s entre ciclos es el backoff natural.
- **Tras 5 fallos:** el evento queda con `attempts >= 5` y `sent_at IS NULL` → cuenta como **DLQ lógico**. `last_error` describe el problema. Una alerta de observabilidad debe disparar en `count(*) WHERE attempts >= 5 AND sent_at IS NULL > 0`.

### Habilitar `@EnableScheduling`

En la clase `@SpringBootApplication` de cada servicio productor:

```java
@SpringBootApplication
@EnableScheduling
public class ServicioXxxApplication { ... }
```

Si ya tiene `@EnableScheduling`, no se duplica. Si no lo tiene, **se agrega** (no requiere otros cambios).

---

## 6. `IdempotencyService` — patrón canónico

```java
@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private final ProcessedEventRepository repo;

    /**
     * Intenta marcar el evento como procesado por este consumer.
     * @return true si el evento es NUEVO y debe procesarse;
     *         false si YA estaba procesado (descartar silenciosamente).
     *
     * Llamar DENTRO de la @Transactional del consumer. Si la lógica de negocio
     * falla, la fila de processed_events hace rollback junto con todo lo demás,
     * y el siguiente reintento de Kafka volverá a entrar.
     */
    public boolean marcarComoProcesado(UUID eventId, String consumerName) {
        if (eventId == null) {
            // Evento legacy sin eventId → no podemos garantizar idempotencia.
            // Política: dejar pasar (mejor procesar dos veces que perder).
            return true;
        }
        try {
            repo.save(new ProcessedEvent(eventId, consumerName, LocalDateTime.now()));
            return true;
        } catch (DataIntegrityViolationException e) {
            // PK (event_id, consumer_name) ya existía.
            return false;
        }
    }
}
```

### Patrón canónico de uso en el consumer

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class ReservaEventConsumer {

    private static final String CONSUMER_NAME = "mensajeria-reserva-events";

    private final IdempotencyService idempotency;
    private final NotificacionService notificacionService;
    // ...

    @KafkaListener(topics = "reserva-events", groupId = "mensajeria-notif-group")
    @Transactional
    public void escuchar(String raw) {
        EventEnvelope ev = EventEnvelope.parseOrLegacy(raw);
        if (ev != null) {
            if (!idempotency.marcarComoProcesado(ev.getEventId(), CONSUMER_NAME)) {
                log.debug("Evento {} ya procesado, ignorado.", ev.getEventId());
                return;
            }
            manejarEnvelope(ev);
        } else {
            // Ruta legacy — sin idempotencia robusta. Se eliminará en Ola 4.
            manejarLegacy(raw);
        }
    }
}
```

---

## 7. Compatibilidad legacy en consumers

`EventEnvelope.parseOrLegacy(String raw)` se implementa una sola vez por servicio (clase estática). Si retorna `null`, el consumer cae a su parser anterior. La sección 5 de `00-event-envelope.md` define el algoritmo de detección.

**Una vez todos los productores emitan envelope (fin de Ola 2)**, los consumers seguirán teniendo el fallback como red de seguridad hasta que Ola 4 lo retire.

---

## 8. Configuración Kafka adicional (cambios en `config-server`)

> **Estos cambios los hace el agente que toca cada servicio**, no se hacen centralizados en Ola 1. Aquí se documenta para que sean consistentes.

### Consumer

```yaml
spring.kafka.consumer:
  auto-offset-reset: earliest   # antes: latest — para no perder mensajes en primer arranque
  enable-auto-commit: false     # commit manual / contenedor
  isolation-level: read_committed
```

### Listener container (cualquier servicio consumer)

```yaml
spring.kafka.listener:
  ack-mode: RECORD              # commit por cada record procesado
```

> El cambio `auto-offset-reset: latest → earliest` es seguro porque los consumers son idempotentes a partir de Ola 2. En el primer arranque tras la migración, Kafka entregará mensajes "viejos" — pero `IdempotencyService` los filtrará si ya fueron procesados, y los pocos que escapen serán nuevos genuinos.

---

## 9. Reglas duras (resumen para code review)

1. Ninguna llamada a `kafkaTemplate.send(...)` fuera de `OutboxScheduler`.
2. Toda emisión usa `OutboxPublisher.publicar(...)` dentro de la `@Transactional` de negocio.
3. Todo `@KafkaListener` está anotado con `@Transactional` y arranca con `idempotency.marcarComoProcesado(...)`.
4. `EventEnvelope`, `IdempotencyService`, `OutboxPublisher` viven en sus paquetes canónicos (§1).
5. Los nombres de clase son exactamente los de §2 — facilita extracción a librería compartida.
6. No se introduce `@Async` ni `ThreadPoolTaskExecutor` para outbox: el scheduler basta.
7. No se rompe el contrato actual hacia los frontends — los flujos REST son inalterados.

---

## 10. Validación local que cada agente debe correr antes de cerrar PR

```bash
# 1. Compila
cd servicio-<X>
./mvnw -DskipTests clean compile

# 2. Tests existentes siguen pasando
./mvnw test

# 3. Smoke test manual: emite un evento y verifica que llega a Kafka
#    - levantar Postgres + Kafka del docker-compose
#    - arrancar el servicio
#    - disparar la operación de negocio (POST /reservas, etc.)
#    - verificar:
#        SELECT * FROM outbox_events ORDER BY id DESC LIMIT 5;   -- sent_at NOT NULL en < 5s
#        kafka-console-consumer --topic reserva-events --from-beginning
```
