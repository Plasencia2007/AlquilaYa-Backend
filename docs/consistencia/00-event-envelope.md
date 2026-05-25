# 00 — Envelope estándar de eventos Kafka (AlquilaYa)

> Cimiento de la **Ola 1** del plan de mejora de consistencia. Todo nuevo evento publicado en cualquier topic debe ajustarse a este envelope.  
> Los productores existentes migran de forma incremental — durante la transición, **todo consumer debe aceptar AMBOS formatos**: legacy y nuevo (sección §5).

---

## 1. Estructura canónica

Todo mensaje publicado en Kafka es un JSON con esta forma:

```json
{
  "eventId":        "1d3f8a44-3a1e-4f33-9c0b-2a4b2b6b7c01",
  "eventType":      "RESERVA_APROBADA",
  "eventVersion":   1,
  "occurredAt":     "2026-05-25T10:30:00Z",
  "source":         "servicio-propiedades",
  "aggregateType":  "Reserva",
  "aggregateId":    "123",
  "correlationId":  "9a2c8c54-cf2b-4e22-9b8a-aae7c8f08c10",
  "payload":        { /* contenido específico del evento */ }
}
```

### 1.1 Campos del envelope (todos obligatorios salvo `correlationId`)

| Campo            | Tipo     | Descripción |
|------------------|----------|-------------|
| `eventId`        | UUID v4 (string)     | Identificador único del evento. Usado por la tabla `processed_events` para idempotencia. **Nunca se reutiliza.** |
| `eventType`      | string   | Nombre canónico del evento, en `MAYUSCULAS_CON_UNDERSCORE`. Catálogo cerrado en `04-event-catalog.md`. |
| `eventVersion`   | int      | Versión del esquema del `payload`. Empieza en `1`. Si cambia la forma del payload se incrementa (los consumers viejos deben rechazar versiones nuevas explícitamente). |
| `occurredAt`     | ISO-8601 UTC string | Momento en que ocurrió el hecho de negocio (no el de publicación). Ejemplo: `"2026-05-25T10:30:00Z"`. |
| `source`         | string   | Nombre del microservicio productor. Valores válidos: `servicio-usuarios`, `servicio-propiedades`, `servicio-pagos`, `servicio-mensajeria`, `servicio-catalogos`. |
| `aggregateType`  | string   | Tipo de agregado raíz que cambió. Valores válidos: `Usuario`, `Reserva`, `Pago`, `Propiedad`, `Resena`. |
| `aggregateId`    | string   | ID del agregado (siempre string, aunque la BD use BIGINT). |
| `correlationId`  | UUID v4 (string) o `null` | Hilo común de una operación de negocio que cruza múltiples servicios (Saga). El primer evento de la cadena lo genera; los siguientes lo propagan. |
| `payload`        | objeto JSON | Contenido específico del evento. Obligatorio que sea objeto (nunca null, ni primitivo). Esquema definido por `eventType` + `eventVersion`. |

### 1.2 Reglas duras

1. **`eventId` es la clave de idempotencia.** El consumer marca `(eventId, consumerName)` en `processed_events` antes de aplicar la lógica. Si ya existe, descarta.
2. **`occurredAt` siempre en UTC** con sufijo `Z`. Los servicios serializan `Instant` o `OffsetDateTime` con jackson-jsr310.
3. **`source` debe coincidir con el `spring.application.name`** del productor. Sirve para auditoría y trazabilidad.
4. **`aggregateId` siempre serializado como string** (incluso si es Long en BD), para tolerar IDs UUID en el futuro sin romper el contrato.
5. **El envelope es plano**: no se anidan envelopes dentro de envelopes. Si el payload necesita referenciar otro agregado, usa campos en el payload (ej. `payload.reservaId`).
6. **Convención de nombres `eventType`:**
   - Patrón: `<AGREGADO>_<ACCION_EN_PASADO>` — ej. `RESERVA_APROBADA`, `PAGO_EXITOSO`, `USER_APROBADO`.
   - Mayúsculas y guion bajo. Sin números, sin guiones, sin puntos.
   - Acción en participio pasado / pretérito perfecto (el evento es un hecho consumado).

### 1.3 Headers Kafka recomendados (no obligatorios para v1)

Para facilitar enrutamiento en DLQs y trazabilidad, los productores pueden duplicar metadatos del envelope en headers Kafka:

| Header           | Valor |
|------------------|-------|
| `event-id`       | `eventId` del envelope |
| `event-type`     | `eventType` |
| `event-version`  | `eventVersion` |
| `source`         | `source` |
| `correlation-id` | `correlationId` |

Los consumers **no deben depender** de estos headers en v1 — son hint para tooling (kafka-ui, ksqldb, etc.). La fuente de verdad sigue siendo el cuerpo del mensaje.

---

## 2. Topics y eventTypes (resumen — detalle completo en `04-event-catalog.md`)

| Topic                  | eventTypes que viajan                                                                          |
|------------------------|------------------------------------------------------------------------------------------------|
| `user-approval-events` | `USER_APROBADO`, `USER_RECHAZADO`                                                              |
| `user-security-events` | `USER_INTENTOS_FALLIDOS`                                                                       |
| `reserva-events`       | `RESERVA_SOLICITADA`, `RESERVA_APROBADA`, `RESERVA_RECHAZADA`, `RESERVA_PAGADA`, `RESERVA_CANCELADA`, `RESERVA_FINALIZADA` |
| `pagos-topic`          | `PAGO_PENDIENTE`, `PAGO_EXITOSO`, `PAGO_FALLIDO`, `PAGO_EN_REVISION`                          |
| `propiedades-topic`    | `PROPIEDAD_CREADA`, `PROPIEDAD_APROBADA`, `PROPIEDAD_RECHAZADA`, `PROPIEDAD_ACTUALIZADA`       |
| `resenas-topic`        | `RESENA_PROPIEDAD_CREADA`, `RESENA_ARRENDADOR_CREADA`, `RESENA_ESTUDIANTE_CREADA`, `CALIFICACION_ARRENDADOR_ACTUALIZADA` |

> **Política de key Kafka:** se usa `aggregateId` como key. Esto garantiza orden total por agregado dentro de la partición (clave para reservas y pagos del mismo recurso).

---

## 3. Ejemplos de mensajes

### 3.1 `RESERVA_APROBADA` (publicado por servicio-propiedades)

```json
{
  "eventId": "f4c1c3e2-f7d8-4aef-bb02-aa90f5e3b8a3",
  "eventType": "RESERVA_APROBADA",
  "eventVersion": 1,
  "occurredAt": "2026-05-25T10:32:11Z",
  "source": "servicio-propiedades",
  "aggregateType": "Reserva",
  "aggregateId": "123",
  "correlationId": "9a2c8c54-cf2b-4e22-9b8a-aae7c8f08c10",
  "payload": {
    "reservaId": 123,
    "propiedadId": 45,
    "estudianteId": 17,
    "arrendadorId": 9,
    "estado": "APROBADA",
    "montoTotal": 600.00,
    "estudianteNombre": "Ana Pérez",
    "estudianteTelefono": "+51987654321",
    "arrendadorNombre": "Carlos Ruiz",
    "arrendadorTelefono": "+51976543210"
  }
}
```

### 3.2 `PAGO_EXITOSO` (publicado por servicio-pagos)

```json
{
  "eventId": "b1e5e6e7-7c8a-4321-9aaa-1234bbbb5555",
  "eventType": "PAGO_EXITOSO",
  "eventVersion": 1,
  "occurredAt": "2026-05-25T11:05:43Z",
  "source": "servicio-pagos",
  "aggregateType": "Pago",
  "aggregateId": "789",
  "correlationId": "9a2c8c54-cf2b-4e22-9b8a-aae7c8f08c10",
  "payload": {
    "pagoId": 789,
    "reservaId": 123,
    "monto": 600.00,
    "moneda": "PEN",
    "paymentId": "1234567890",
    "fechaPago": "2026-05-25T11:05:42Z"
  }
}
```

---

## 4. Generación canónica del envelope (referencia)

> El builder vive en cada servicio en `com.alquilaya.<servicio>.outbox.EventEnvelopeBuilder`. El código se escribe en Ola 2; aquí solo se define el contrato.

Reglas:

- `eventId` se genera con `UUID.randomUUID()`.
- `occurredAt` se genera con `Instant.now()` y se serializa a ISO-8601 UTC (`DateTimeFormatter.ISO_INSTANT`).
- `correlationId` se propaga del evento entrante que disparó la operación (header MDC `correlationId`). Si no hay (operación iniciada por usuario), se genera uno nuevo.
- `payload` es un `Map<String,Object>` o un DTO serializable con jackson. **Nunca puede ser `null`**: si el evento no tiene datos, se envía `{}`.

---

## 5. Compatibilidad hacia atrás (transición)

Durante la migración (Olas 2 y 3) coexistirán dos formatos. **Todo consumer debe soportar ambos**, en este orden:

### 5.1 Detección — el primer carácter no-blanco decide

```java
public static EventEnvelope parseOrLegacy(String raw) {
    if (raw == null || raw.isBlank()) return null;
    String trimmed = raw.stripLeading();
    if (trimmed.startsWith("{")) {
        // Posible JSON envelope (o JSON legacy con campo "tipo").
        JsonNode node = MAPPER.readTree(raw);
        if (node.hasNonNull("eventId") && node.hasNonNull("eventType")) {
            return MAPPER.treeToValue(node, EventEnvelope.class);
        }
        // JSON legacy (ej. {"tipo":"APROBACION","usuarioId":7,...})
        return null;   // el consumer aplicará su parser viejo
    }
    // String legacy tipo "PAGO_EXITOSO:123"
    return null;
}
```

### 5.2 Tabla de equivalencias legacy → nuevo

| Legacy                                                | Nuevo `eventType`              | Topic |
|-------------------------------------------------------|--------------------------------|-------|
| `"PAGO_EXITOSO:<reservaId>"` (string plano)           | `PAGO_EXITOSO`                 | `pagos-topic` |
| `"PAGO_RECHAZADO:<reservaId>"` (string plano)         | `PAGO_FALLIDO`                 | `pagos-topic` |
| `{"tipo":"APROBACION", ...}`                          | `USER_APROBADO`                | `user-approval-events` |
| `{"tipo":"RECHAZO", ...}`                             | `USER_RECHAZADO`               | `user-approval-events` |
| `{"tipo":"INTENTOS_FALLIDOS", ...}`                   | `USER_INTENTOS_FALLIDOS`       | `user-security-events` |
| `{"tipo":"RESERVA_SOLICITADA"/"RESERVA_APROBADA"/...}` | `RESERVA_SOLICITADA` / etc.    | `reserva-events` |
| `{"arrendadorId":..,"calificacion":..,"numResenas":..}` (sin `tipo`) | `CALIFICACION_ARRENDADOR_ACTUALIZADA` | `resenas-topic` |

### 5.3 Convención de fallback en el consumer

```java
@KafkaListener(topics = "...")
@Transactional
public void consumir(String raw) {
    EventEnvelope ev = EventEnvelope.parseOrLegacy(raw);
    if (ev != null) {
        // === ruta NUEVA ===
        if (!idempotencyService.marcarComoProcesado(ev.getEventId(), CONSUMER_NAME)) return;
        manejarPorTipo(ev);
    } else {
        // === ruta LEGACY ===  (en Ola 4 esta rama se elimina)
        manejarLegacy(raw);
    }
}
```

### 5.4 Plan de retirada del soporte legacy

- **Olas 2-3:** todos los productores migran a envelope; todos los consumers soportan ambos formatos.
- **Ola 4 (limpieza):** se verifica con métricas (counter en consumer: `events.legacy.received`) que `events.legacy.received == 0` durante una semana. Recién entonces se elimina la rama `manejarLegacy`.

---

## 6. Inconsistencias detectadas en el estado actual (a corregir en Ola 2)

1. **`servicio-propiedades.ReservaEventProducer.emitir(...)`** emite `tipo = "RESERVA_SOLICITADA"|"RESERVA_APROBADA"|...`, pero **`servicio-mensajeria.ReservaEventConsumer`** matchea contra `"CREADA"|"APROBADA"|"RECHAZADA"|"CANCELADA"` — los `case` con `RESERVA_*` **nunca matchean**. Las notificaciones de reserva están rotas en este momento. Al migrar a envelope, el consumer pasa a chequear `ev.getEventType()` contra los valores del catálogo (§2) y el bug queda fijado.
2. **`servicio-pagos.PagoService`** emite a `pagos-topic` el string plano `"PAGO_EXITOSO:<id>"` / `"PAGO_RECHAZADO:<id>"`. El consumer en `servicio-propiedades.PagoEventListener` lo entiende; el de `servicio-mensajeria.PagoEventConsumer` lo ignora explícitamente (comentario en código). Tras la migración, ambos consumirán envelope + payload con `estudianteUserId`.
3. **`servicio-usuarios.UserEventProducer`** construye JSON con `String.format` (riesgo de inyección si nombre/correo trae `"`). Al migrar al `EventEnvelopeBuilder` con jackson este problema desaparece.
4. **`servicio-propiedades.KafkaProducerService.enviarCalificacionArrendador(...)`** publica un JSON ad-hoc sin `tipo`. Al migrar se le asignará `eventType = "CALIFICACION_ARRENDADOR_ACTUALIZADA"`.

---

## 7. Resumen para implementadores de Ola 2

- Una sola clase POJO `EventEnvelope` por servicio (idéntica entre ellos — se acepta duplicación temporal hasta crear `alquilaya-common-events` en Ola 5).
- Un único builder `EventEnvelopeBuilder` por servicio.
- Toda emisión Kafka pasa por `OutboxPublisher.publicar(EventEnvelope)` — nunca `kafkaTemplate.send(...)` directo desde lógica de negocio.
- Todo consumer arranca con `EventEnvelope.parseOrLegacy(raw)` + `IdempotencyService.marcarComoProcesado(...)`.
