# 03 — Plan de Ola 2 (5 agentes en paralelo)

> Ola 2 implementa la **transaccionalidad** (outbox + idempotencia + version) en los servicios de dominio. Cada uno de los 5 agentes trabaja en **su servicio exclusivamente**, sin tocar archivos de otros servicios. Esta separación garantiza que las PRs no entren en conflicto y se puedan revisar/mergear en paralelo.

## Pre-condición: Ola 1 está cerrada

Antes de arrancar Ola 2:

- [x] DDLs de `01-migraciones-sql.md` aplicados en todas las BDs.
- [x] Documentos `00`–`04` revisados y aprobados por el arquitecto.

## Asignación de agentes

| Agente | Servicio                | Rol Kafka actual                              |
|--------|-------------------------|-----------------------------------------------|
| A1     | servicio-usuarios       | Productor (`user-approval-events`, `user-security-events`); consumer (`resenas-topic`) |
| A2     | servicio-propiedades    | Productor (`reserva-events`, `propiedades-topic`, `resenas-topic`); consumer (`pagos-topic`) |
| A3     | servicio-pagos          | Productor (`pagos-topic`)                     |
| A4     | servicio-mensajeria     | Consumer (`reserva-events`, `pagos-topic`, `user-approval-events`); no productor |
| A5     | config-server + docs    | Cambios YAML, observabilidad, smoke tests E2E |

---

## A1 — servicio-usuarios

### Archivos a CREAR

```
servicio-usuarios/src/main/java/com/alquilaya/serviciousuarios/
├── outbox/
│   ├── entity/OutboxEvent.java
│   ├── repository/OutboxRepository.java
│   ├── publisher/OutboxPublisher.java
│   ├── scheduler/OutboxScheduler.java
│   └── envelope/EventEnvelope.java
│   └── envelope/EventEnvelopeBuilder.java
└── kafka/idempotency/
    ├── entity/ProcessedEvent.java
    ├── repository/ProcessedEventRepository.java
    └── service/IdempotencyService.java
```

### Archivos a EDITAR

- `kafka/UserEventProducer.java` — reemplaza llamadas a `kafkaTemplate.send(...)` por `outboxPublisher.publicar(...)`. Mantiene la firma pública para no romper callers.
- `listeners/ResenaEventListener.java` — agrega `@Transactional` + `idempotency.marcarComoProcesado(...)` + soporte `parseOrLegacy`.
- `services/UsuarioService.java` (donde se invoca `userEventProducer.emitirEventoAprobacion(...)`) — sin cambios funcionales; sólo asegurar que la llamada esté dentro de la `@Transactional` que persiste el cambio de estado del usuario.
- `entities/Usuario.java` — **NO añadir `@Version` en Ola 2** (la columna sólo existe en `reservas`, `propiedades`, `pagos`).
- `ServicioUsuariosApplication.java` — agregar `@EnableScheduling` si no lo tiene.

### Archivos PROHIBIDOS de tocar

- Cualquier archivo de los otros 4 servicios (`servicio-propiedades`, `servicio-pagos`, `servicio-mensajeria`, `servicio-catalogos`, `servicio-notificaciones`, `config-server`, `api-gateway`, `discovery-server`).
- `database/init.sql`, `database/data.sql` — las migraciones de Ola 2 van en `database/V<N>__*.sql` siguiendo el patrón.

### Validación local

```bash
cd servicio-usuarios
./mvnw -DskipTests clean compile
./mvnw test
# Smoke: aprobar un arrendador manualmente y verificar
#   SELECT * FROM outbox_events ORDER BY id DESC LIMIT 1;  -- envelope correcto
```

### Entregable

- PR `feat(usuarios): outbox + idempotencia (Ola 2)` con: clases nuevas, edits a producer/listener, evidencia (screenshots/log) de un `USER_APROBADO` viajando por outbox → Kafka.

---

## A2 — servicio-propiedades

Es el agente con **más superficie** porque el servicio es productor en 3 topics y consumer en 1.

### Archivos a CREAR

```
servicio-propiedades/src/main/java/com/alquilaya/serviciopropiedades/
├── outbox/{entity,repository,publisher,scheduler,envelope}/...   (8 clases canónicas)
└── kafka/idempotency/{entity,repository,service}/...             (3 clases canónicas)
```

### Archivos a EDITAR

- `kafka/ReservaEventProducer.java` — convertir en wrapper sobre `OutboxPublisher` (mantiene firma `emitir(tipo, reservaId, extra)`). El método mapea `tipo` legacy → `eventType` canónico del catálogo.
- `services/KafkaProducerService.java` — idem para `enviarEventoPropiedad(...)` y `enviarCalificacionArrendador(...)`.
- `kafka/PagoEventListener.java` — agrega `@Transactional` + idempotencia + parser dual (string legacy vs envelope).
- `services/ReservaService.java` — sin cambios funcionales: las llamadas a `reservaEventProducer.emitir(...)` siguen funcionando, pero ahora persisten en outbox.
- `services/ResenaService.java` — idem, las llamadas a `kafkaProducerService.enviarCalificacionArrendador(...)` siguen funcionando.
- `entities/Reserva.java`, `entities/Propiedad.java` — agregar `@Version private Long version;`.
- `ServicioPropiedadesApplication.java` — agregar `@EnableScheduling` si no lo tiene.

### Archivos PROHIBIDOS de tocar

- Cualquier otro servicio.
- `enums/EstadoReserva.java` — la state machine está OK; no se toca en Ola 2.
- `services/PagoService.java` (es de servicio-pagos).

### Validación local

```bash
cd servicio-propiedades
./mvnw -DskipTests clean compile
./mvnw test
# Smoke 1: crear reserva → outbox_events debe tener RESERVA_SOLICITADA con envelope completo.
# Smoke 2: producir manualmente PAGO_EXITOSO en pagos-topic → reserva pasa a PAGADA y processed_events guarda la fila.
# Smoke 3: aprobar/aprobar la misma reserva dos veces concurrentemente → una falla por OptimisticLockException.
```

### Entregable

- PR `feat(propiedades): outbox + idempotencia + @Version (Ola 2)`.

---

## A3 — servicio-pagos

### Archivos a CREAR

```
servicio-pagos/src/main/java/com/alquilaya/serviciopagos/
├── outbox/{entity,repository,publisher,scheduler,envelope}/...
└── (NO crea kafka/idempotency — pagos no es consumer Kafka)
```

> **Excepción consciente:** `servicio-pagos` no consume Kafka, así que omite todo el paquete `kafka/idempotency`. Sólo crea outbox.

### Archivos a EDITAR

- `services/PagoService.java`:
  - Reemplazar `kafkaTemplate.send("pagos-topic", "PAGO_EXITOSO:" + reservaIdStr)` por `outboxPublisher.publicar("pagos-topic", "PAGO_EXITOSO", "Pago", pago.getId().toString(), payload, correlationId)`.
  - Idem para `PAGO_RECHAZADO → PAGO_FALLIDO`.
  - El payload del envelope debe incluir `pagoId`, `reservaId`, `monto`, `moneda`, `paymentId`, `fechaPago` (catálogo §04).
- `entities/Pago.java` — agregar `@Version private Long version;`.
- `ServicioPagosApplication.java` — agregar `@EnableScheduling`.
- `controllers/DevOnlyPagoController.java` — el endpoint `simular-exito` ya llama a `PagoService.simularPagoExitoso(...)`; sin cambios, pero verificar que el efecto sigue pasando por outbox.

### Archivos PROHIBIDOS de tocar

- Cualquier otro servicio.
- `config/MercadoPagoConfiguration.java` (configuración de MP), `services/PagoService.java#procesarWebhook` salvo donde se llama a `kafkaTemplate.send` — el resto del webhook (firma HMAC, lock Redis) **no se toca en Ola 2**.

### Validación local

```bash
cd servicio-pagos
./mvnw -DskipTests clean compile
./mvnw test
# Smoke: simular-exito → outbox_events tiene PAGO_EXITOSO con envelope; tras ~2 s pasa a Kafka.
```

### Entregable

- PR `feat(pagos): outbox + envelope + @Version (Ola 2)`.

---

## A4 — servicio-mensajeria

Sólo es consumer; **no se crea outbox** (no produce eventos en Ola 2).

### Archivos a CREAR

```
servicio-mensajeria/src/main/java/com/alquilaya/servicio_mensajeria/
├── kafka/idempotency/{entity,repository,service}/...   (3 clases canónicas)
└── kafka/envelope/EventEnvelope.java                    (sólo el POJO; sin builder, no es productor)
```

> Decisión: `EventEnvelope` se duplica también en mensajería para evitar dependencia entre servicios. En Ola 5 se extrae a `alquilaya-common-events`.

### Archivos a EDITAR

- `kafka/ReservaEventConsumer.java`:
  - Anotar el método con `@Transactional`.
  - Arrancar con `EventEnvelope.parseOrLegacy(raw)` + `idempotency.marcarComoProcesado(...)`.
  - **Bug fix obligatorio:** el `switch` actual matchea `"CREADA"|"APROBADA"|"RECHAZADA"|"CANCELADA"` pero el productor emite `"RESERVA_SOLICITADA"|"RESERVA_APROBADA"|...`. Migrar el switch para usar `eventType` del envelope (`RESERVA_APROBADA`, etc.). Mantener legacy path con los strings viejos por si quedaran mensajes en cola.
- `kafka/PagoEventConsumer.java`:
  - Idem (@Transactional, idempotencia, parseOrLegacy).
  - En la ruta nueva (envelope), extraer `payload.estudianteUserId` (que servicio-pagos enriquecerá en Ola 2) y persistir la notificación.
- `kafka/UserApprovalEventConsumer.java`:
  - Idem.
  - Mapear `eventType` `USER_APROBADO` → `TipoNotificacion.DOCUMENTO_APROBADO`, `USER_RECHAZADO` → `TipoNotificacion.DOCUMENTO_RECHAZADO`.

### Archivos PROHIBIDOS de tocar

- Cualquier otro servicio.
- WebSocket / STOMP handlers — fuera del scope de Ola 2.

### Validación local

```bash
cd servicio-mensajeria
./mvnw -DskipTests clean compile
./mvnw test
# Smoke: producir manualmente en reserva-events un envelope RESERVA_APROBADA → notificacion creada.
# Smoke: producir el MISMO eventId dos veces → segunda vez ignorado (processed_events tiene 1 fila).
```

### Entregable

- PR `feat(mensajeria): idempotencia + envelope + bugfix switch (Ola 2)`.

---

## A5 — config-server, observabilidad y E2E

### Archivos a EDITAR

- `config-server/src/main/resources/config/application.yml` o el `*.yml` por servicio:
  - `spring.kafka.consumer.auto-offset-reset: earliest` (cambio desde `latest`).
  - `spring.kafka.consumer.isolation-level: read_committed`.
  - `spring.kafka.listener.ack-mode: RECORD`.
- `config-server/src/main/resources/config/servicio-propiedades.yml` (si existe) y `servicio-pagos.yml`, `servicio-usuarios.yml`, `servicio-mensajeria.yml`: aplicar los settings anteriores donde correspondan.

### Archivos a CREAR

- `docs/consistencia/05-runbook-ola-2.md` (creado por A5 al final de la ola): qué métricas observar, alarmas en outbox stuck (`attempts >= 5`), comandos kafka-console-consumer para validar formato, runbook de rollback.

### Archivos PROHIBIDOS de tocar

- Código Java de cualquier microservicio (esos los tocan A1–A4).

### Punto de sincronización

A5 espera a que A1–A4 hayan mergeado sus PRs en `main`. Luego corre:

```bash
# Smoke E2E completo
docker compose up -d
./scripts/start-all.ps1

# 1. Registro usuario → OTP → verify → USER_APROBADO (envelope) → notif WhatsApp
# 2. Crear propiedad → admin aprueba → PROPIEDAD_APROBADA (envelope)
# 3. Crear reserva → arrendador aprueba → RESERVA_APROBADA (envelope) → notif STOMP llega
# 4. POST /pagos/simular-exito → PAGO_EXITOSO (envelope) → reserva pasa a PAGADA → notif
# 5. Verificar:
#    - SELECT COUNT(*) FROM outbox_events WHERE sent_at IS NULL AND attempts >= 5;   -- 0
#    - SELECT COUNT(*) FROM processed_events;                                         -- > 0
#    - kafka-console-consumer --topic reserva-events --from-beginning                  -- todos JSON envelope válidos
```

### Entregable

- PR `chore(config): kafka settings y runbook (Ola 2)`.
- Reporte breve "Ola 2 cerrada" con métricas del smoke E2E.

---

## Tabla resumen de archivos NUEVOS por agente

| Agente | Java nuevas | SQL nuevas              |
|--------|-------------|-------------------------|
| A1     | 9 clases    | (Ola 1 cubrió DDLs)     |
| A2     | 11 clases   | (Ola 1 cubrió DDLs)     |
| A3     | 6 clases    | (Ola 1 cubrió DDLs)     |
| A4     | 4 clases    | (Ola 1 cubrió DDLs)     |
| A5     | 0 clases    | 0; sólo YAML + runbook  |

## Tabla de bloqueos entre agentes

| Agente | Depende de |
|--------|------------|
| A1     | Ola 1 (DDLs aplicados) |
| A2     | Ola 1 (DDLs aplicados) |
| A3     | Ola 1 (DDLs aplicados) |
| A4     | Ola 1 (DDLs aplicados) |
| A5     | A1, A2, A3, A4 mergeados en `main` |

A1–A4 pueden ejecutarse **completamente en paralelo** después de Ola 1 — no comparten archivos.

## Reglas universales de PR

1. La PR de cada agente toca **únicamente** archivos bajo `servicio-<X>/` (excepto A5).
2. La PR pasa `mvn -DskipTests clean compile` y `mvn test`.
3. La PR incluye en su descripción evidencia del smoke (al menos un log de Kafka mostrando el envelope nuevo).
4. **No se hace squash hasta que A5 confirme el E2E.** Esto permite revertir agentes individuales si A5 detecta inconsistencias.
