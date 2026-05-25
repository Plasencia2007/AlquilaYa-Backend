# 04 — Catálogo de eventos

> Catálogo cerrado y versionado de todos los eventos que viajan por Kafka en AlquilaYa, después de Ola 2.  
> Todo evento listado aquí lleva el envelope estándar definido en `00-event-envelope.md` con `eventVersion: 1`.  
> Cualquier evento **nuevo** que no esté en esta tabla requiere actualizar este documento **antes** de implementarlo.

## Resumen por topic

| Topic                  | eventTypes                                                                                              | Productor(es)            |
|------------------------|---------------------------------------------------------------------------------------------------------|--------------------------|
| `user-approval-events` | `USER_APROBADO`, `USER_RECHAZADO`                                                                       | servicio-usuarios        |
| `user-security-events` | `USER_INTENTOS_FALLIDOS`                                                                                | servicio-usuarios        |
| `reserva-events`       | `RESERVA_SOLICITADA`, `RESERVA_APROBADA`, `RESERVA_RECHAZADA`, `RESERVA_PAGADA`, `RESERVA_CANCELADA`, `RESERVA_FINALIZADA`, `RESERVA_EXPIRADA` | servicio-propiedades     |
| `pagos-topic`          | `PAGO_PENDIENTE`, `PAGO_EXITOSO`, `PAGO_FALLIDO`, `PAGO_EN_REVISION`, `REFUND_REQUERIDO`                | servicio-pagos, servicio-propiedades (saga) |
| `propiedades-topic`    | `PROPIEDAD_CREADA`, `PROPIEDAD_APROBADA`, `PROPIEDAD_RECHAZADA`, `PROPIEDAD_ACTUALIZADA`                | servicio-propiedades     |
| `resenas-topic`        | `RESENA_PROPIEDAD_CREADA`, `RESENA_ARRENDADOR_CREADA`, `RESENA_ESTUDIANTE_CREADA`, `CALIFICACION_ARRENDADOR_ACTUALIZADA` | servicio-propiedades     |

---

## Topic `user-approval-events`

### `USER_APROBADO`
- **Estado:** reemplaza al legacy `{"tipo":"APROBACION", ...}`.
- **Productor:** servicio-usuarios — al confirmar verificación de documentos del usuario.
- **Consumers:** servicio-mensajeria → notificación in-app + WhatsApp.
- **Payload:**

```json
{
  "usuarioId":      17,
  "correo":         "ana@upeu.edu.pe",
  "nombre":         "Ana Pérez",
  "telefono":       "+51987654321",
  "rol":            "ESTUDIANTE | ARRENDADOR"
}
```

| Campo       | Tipo     | Obligatorio | Notas |
|-------------|----------|-------------|-------|
| usuarioId   | long     | sí          | aggregateId del envelope = usuarioId.toString() |
| correo      | string   | sí          | email del usuario |
| nombre      | string   | sí          | usado para saludo |
| telefono    | string   | sí          | E.164 con `+51...` |
| rol         | string   | sí          | enum string `ESTUDIANTE`/`ARRENDADOR` |

### `USER_RECHAZADO`
- **Estado:** reemplaza al legacy `{"tipo":"RECHAZO", ...}`.
- **Productor:** servicio-usuarios.
- **Consumers:** servicio-mensajeria.
- **Payload:**

```json
{
  "usuarioId":  17,
  "correo":     "ana@upeu.edu.pe",
  "nombre":     "Ana Pérez",
  "telefono":   "+51987654321",
  "rol":        "ESTUDIANTE",
  "motivo":     "DNI ilegible"
}
```

| Campo       | Tipo   | Obligatorio | Notas |
|-------------|--------|-------------|-------|
| (los 5 anteriores) | igual | sí | |
| motivo      | string | sí          | máx. 500 chars, mostrado al usuario |

---

## Topic `user-security-events`

### `USER_INTENTOS_FALLIDOS`
- **Estado:** reemplaza al legacy `{"tipo":"INTENTOS_FALLIDOS", ...}`.
- **Productor:** servicio-usuarios al bloquear cuenta tras N intentos fallidos.
- **Consumers:** servicio-mensajeria → alerta WhatsApp + log de seguridad.
- **Payload:**

```json
{
  "usuarioId":  17,
  "correo":     "ana@upeu.edu.pe",
  "telefono":   "+51987654321",
  "ip":         "190.232.1.5",
  "intentos":   5
}
```

| Campo     | Tipo   | Obligatorio | Notas |
|-----------|--------|-------------|-------|
| usuarioId | long   | sí (0 si no se identificó) | |
| correo    | string | sí          | puede ser `""` si el correo no existe |
| telefono  | string | sí          | puede ser `""` |
| ip        | string | sí          | IPv4 o IPv6 |
| intentos  | int    | sí (nuevo)  | hoy no se enviaba — Ola 2 lo agrega |

---

## Topic `reserva-events`

> Antes de Ola 2, el `tipo` viajaba como campo del JSON ad-hoc. Ahora pasa a `eventType` del envelope. Los nombres no cambian.

### `RESERVA_SOLICITADA`
- **Productor:** servicio-propiedades (`ReservaService.crearSolicitud`).
- **Consumers:** servicio-mensajeria (notifica al arrendador con título "Nueva solicitud de reserva").  
  > **Bug fix:** el consumer actual matchea contra `"CREADA"` y nunca dispara — en Ola 2 se corrige.
- **Payload:**

```json
{
  "reservaId":          123,
  "propiedadId":        45,
  "estudianteId":       17,
  "arrendadorId":       9,
  "fechaInicio":        "2026-06-01",
  "fechaFin":           "2026-06-30",
  "estado":             "SOLICITADA",
  "montoTotal":         600.00,
  "estudianteNombre":   "Ana Pérez",
  "estudianteTelefono": "+51987654321",
  "arrendadorNombre":   "Carlos Ruiz",
  "arrendadorTelefono": "+51976543210"
}
```

### `RESERVA_APROBADA`
- **Productor:** servicio-propiedades (`ReservaService.aprobar`).
- **Consumers:** servicio-mensajeria.
- **Payload:** idéntico a `RESERVA_SOLICITADA`, con `estado = "APROBADA"`.

### `RESERVA_RECHAZADA`
- **Productor:** servicio-propiedades (`ReservaService.rechazar`).
- **Consumers:** servicio-mensajeria.
- **Payload:** idéntico a `RESERVA_SOLICITADA` con `estado = "RECHAZADA"` y campo extra:

```json
{ "motivo": "Fechas no disponibles" }
```

### `RESERVA_PAGADA`
- **Productor:** servicio-propiedades (`ReservaService.marcarPagada`, disparado por consumir `PAGO_EXITOSO`).
- **Consumers:** servicio-mensajeria.
- **Payload:** idéntico a `RESERVA_APROBADA` con `estado = "PAGADA"`.

### `RESERVA_CANCELADA`
- **Productor:** servicio-propiedades (`ReservaService.cancelar`).
- **Consumers:** servicio-mensajeria (notifica AMBAS partes).
- **Payload:** mismo set base + `"canceladaPor": "ESTUDIANTE | ARRENDADOR"`.

### `RESERVA_FINALIZADA`
- **Estado:** **nuevo en Ola 2** — hoy `ReservaService.finalizar(...)` no emite evento.
- **Productor:** servicio-propiedades.
- **Consumers:** servicio-mensajeria (recordatorio "deja una reseña").
- **Payload:** mismo set base con `estado = "FINALIZADA"`.

### `RESERVA_EXPIRADA`
- **Estado:** **nuevo en Ola 3** — emitido por `ReservaExpirationScheduler` cuando una reserva
  APROBADA no se paga dentro del plazo (`app.reserva.expiracion-horas`, default 24h).
  Transición permitida: `APROBADA → EXPIRADA` (estado terminal, libera el slot).
- **Productor:** servicio-propiedades (`ReservaExpirationScheduler` vía `ReservaEventProducer` → Outbox).
- **Consumers:** servicio-mensajeria (notif. al estudiante "tu reserva expiró por no pago").
- **Payload:** mismo set base con `estado = "EXPIRADA"` + campos extra:

```json
{
  "motivo":          "TIMEOUT_PAGO",
  "expiracionHoras": 24
}
```

---

## Topic `pagos-topic`

> **Cambio más invasivo:** se elimina el string plano `"PAGO_EXITOSO:<reservaId>"` y se reemplaza por envelope JSON.  
> Durante Ola 2 los consumers aceptan ambos. En Ola 4 se retira la rama legacy.

### `PAGO_PENDIENTE`
- **Estado:** **nuevo en Ola 2** — hoy no se emite cuando se crea la preferencia, sólo cuando se paga.
- **Productor:** servicio-pagos (`PagoService.crearPreferencia`).
- **Consumers:** servicio-mensajeria (notif. al estudiante con el link de pago — opcional, decide A4).
- **Payload:**

```json
{
  "pagoId":        789,
  "reservaId":     123,
  "monto":         600.00,
  "moneda":        "PEN",
  "preferenciaId": "1234567890-abc",
  "initPoint":     "https://mpago.la/...",
  "estudianteUserId": 41
}
```

### `PAGO_EXITOSO`
- **Reemplaza** al legacy `"PAGO_EXITOSO:<reservaId>"`.
- **Productor:** servicio-pagos (`PagoService.manejarAprobado`, `simularPagoExitoso`).
- **Consumers:**
  - servicio-propiedades → actualiza reserva a `PAGADA` y emite `RESERVA_PAGADA`.
  - servicio-mensajeria → notif. al estudiante "Pago confirmado".
- **Payload:**

```json
{
  "pagoId":           789,
  "reservaId":        123,
  "monto":            600.00,
  "moneda":           "PEN",
  "paymentId":        "1234567890",
  "fechaPago":        "2026-05-25T11:05:42Z",
  "estudianteUserId": 41
}
```

### `PAGO_FALLIDO`
- **Reemplaza** al legacy `"PAGO_RECHAZADO:<reservaId>"`.
- **Productor:** servicio-pagos (`PagoService.manejarRechazado`).
- **Consumers:**
  - servicio-propiedades → libera el slot (lógica futura — en Ola 3 con saga).
  - servicio-mensajeria → notif. al estudiante.
- **Payload:**

```json
{
  "pagoId":           789,
  "reservaId":        123,
  "monto":            600.00,
  "moneda":           "PEN",
  "paymentId":        "1234567890",
  "motivo":           "REJECTED_BY_BANK",
  "estudianteUserId": 41
}
```

### `PAGO_EN_REVISION`
- **Estado:** **nuevo en Ola 2** — hoy `manejarPendiente` no emite nada.
- **Productor:** servicio-pagos (`PagoService.manejarPendiente`).
- **Consumers:** servicio-mensajeria.
- **Payload:**

```json
{
  "pagoId":     789,
  "reservaId":  123,
  "estadoMp":   "in_process",
  "estudianteUserId": 41
}
```

### `REFUND_REQUERIDO`
- **Estado:** **nuevo en Ola 3** — compensación de la saga reserva-pago.
  Se emite cuando llega `PAGO_EXITOSO` pero la reserva ya no puede consumirlo
  (CANCELADA / RECHAZADA / EXPIRADA), o cuando se cancela una reserva
  previamente PAGADA. El scheduler `SagaCompensationScheduler` reintenta hasta
  `MAX_INTENTOS = 5` antes de marcar la saga `FALLIDA`.
- **Productor:** servicio-propiedades — `SagaReservaPagoService` vía Outbox.
- **Consumers:** servicio-pagos (consumidor operativo: ejecutar el refund contra MercadoPago).
  Mientras no exista ese consumer, queda como señal auditable en el outbox/topic.
- **Payload:**

```json
{
  "reservaId":  123,
  "pagoId":     789,
  "motivo":     "Pago recibido pero reserva en estado CANCELADA",
  "sagaId":     "b39c5b3d-6c12-4f6e-9c0a-1f8e7b0e9d12"
}
```

| Campo     | Tipo   | Obligatorio | Notas |
|-----------|--------|-------------|-------|
| reservaId | long   | sí          | aggregateId del envelope |
| pagoId    | long   | no          | omitido si la cancelación llegó sin pago previo |
| motivo    | string | sí          | causa textual de la compensación |
| sagaId    | uuid   | sí          | id de la saga que originó el refund (trazabilidad) |

---

## Topic `propiedades-topic`

> Hoy `KafkaProducerService.enviarEventoPropiedad(String)` recibe un string ad-hoc. En Ola 2 se rediseña a eventos tipados.

### `PROPIEDAD_CREADA`
- **Estado:** nuevo en Ola 2.
- **Productor:** servicio-propiedades (`PropiedadService.crear`).
- **Consumers:** **ninguno hoy** — queda como evento informativo; podría usarlo Ola 5 (analytics).
- **Payload:**

```json
{
  "propiedadId":  45,
  "arrendadorId": 9,
  "titulo":       "Cuarto 2 cuadras UPeU",
  "precio":       350.00,
  "direccion":    "Av. Ramiro Prialé 123"
}
```

### `PROPIEDAD_APROBADA`
- **Productor:** servicio-propiedades (`AdminPropiedadController` / service).
- **Consumers:** servicio-mensajeria → notif. al arrendador.
- **Payload:**

```json
{ "propiedadId": 45, "arrendadorId": 9, "titulo": "..." }
```

### `PROPIEDAD_RECHAZADA`
- Análogo a `PROPIEDAD_APROBADA` con campo extra `"motivo"`.

### `PROPIEDAD_ACTUALIZADA`
- Emitido en updates significativos (precio, estado). Payload incluye campos cambiados.

---

## Topic `resenas-topic`

### `CALIFICACION_ARRENDADOR_ACTUALIZADA`
- **Reemplaza** al JSON ad-hoc `{"arrendadorId":..,"calificacion":..,"numResenas":..}` (sin `tipo`).
- **Productor:** servicio-propiedades (`ResenaService.recalcularArrendador`).
- **Consumers:** servicio-usuarios → `Arrendador.calificacion` se actualiza.
- **Payload:**

```json
{
  "arrendadorId":  9,
  "calificacion":  4.75,
  "numResenas":    12
}
```

### `RESENA_PROPIEDAD_CREADA`
- **Estado:** nuevo en Ola 2 — hoy `ResenaService.resenarPropiedad` recalcula en local pero **no emite evento**.
- **Productor:** servicio-propiedades.
- **Consumers:** ninguno hoy (informativo / analytics).
- **Payload:**

```json
{
  "resenaId":      55,
  "propiedadId":   45,
  "estudianteId":  17,
  "rating":        5,
  "comentario":    "Excelente"
}
```

### `RESENA_ARRENDADOR_CREADA`
- Productor / payload análogos (sustituye `propiedadId` por `arrendadorId`).

### `RESENA_ESTUDIANTE_CREADA`
- Productor: servicio-propiedades (`ResenaService.resenarEstudiante`).
- Consumers: servicio-mensajeria → notif. al estudiante reseñado.
- Payload: `{ "resenaId", "arrendadorId", "estudianteId", "rating", "comentario" }`.

---

## Tabla maestra (productor → consumer)

| eventType                              | Topic                  | Productor             | Consumers                                       | Nuevo o reemplaza |
|----------------------------------------|------------------------|-----------------------|-------------------------------------------------|-------------------|
| `USER_APROBADO`                        | user-approval-events   | servicio-usuarios     | servicio-mensajeria                             | reemplaza         |
| `USER_RECHAZADO`                       | user-approval-events   | servicio-usuarios     | servicio-mensajeria                             | reemplaza         |
| `USER_INTENTOS_FALLIDOS`               | user-security-events   | servicio-usuarios     | servicio-mensajeria                             | reemplaza         |
| `RESERVA_SOLICITADA`                   | reserva-events         | servicio-propiedades  | servicio-mensajeria                             | reemplaza (fix bug switch) |
| `RESERVA_APROBADA`                     | reserva-events         | servicio-propiedades  | servicio-mensajeria                             | reemplaza         |
| `RESERVA_RECHAZADA`                    | reserva-events         | servicio-propiedades  | servicio-mensajeria                             | reemplaza         |
| `RESERVA_PAGADA`                       | reserva-events         | servicio-propiedades  | servicio-mensajeria                             | reemplaza         |
| `RESERVA_CANCELADA`                    | reserva-events         | servicio-propiedades  | servicio-mensajeria                             | reemplaza         |
| `RESERVA_FINALIZADA`                   | reserva-events         | servicio-propiedades  | servicio-mensajeria                             | **nuevo**         |
| `RESERVA_EXPIRADA`                     | reserva-events         | servicio-propiedades  | servicio-mensajeria                             | **nuevo Ola 3**   |
| `PAGO_PENDIENTE`                       | pagos-topic            | servicio-pagos        | servicio-mensajeria                             | **nuevo**         |
| `PAGO_EXITOSO`                         | pagos-topic            | servicio-pagos        | servicio-propiedades, servicio-mensajeria       | reemplaza string  |
| `PAGO_FALLIDO`                         | pagos-topic            | servicio-pagos        | servicio-propiedades, servicio-mensajeria       | reemplaza string  |
| `PAGO_EN_REVISION`                     | pagos-topic            | servicio-pagos        | servicio-mensajeria                             | **nuevo**         |
| `REFUND_REQUERIDO`                     | pagos-topic            | servicio-propiedades (saga) | servicio-pagos (planificado)              | **nuevo Ola 3**   |
| `PROPIEDAD_CREADA`                     | propiedades-topic      | servicio-propiedades  | (ninguno)                                       | **nuevo**         |
| `PROPIEDAD_APROBADA`                   | propiedades-topic      | servicio-propiedades  | servicio-mensajeria                             | reemplaza string ad-hoc |
| `PROPIEDAD_RECHAZADA`                  | propiedades-topic      | servicio-propiedades  | servicio-mensajeria                             | **nuevo**         |
| `PROPIEDAD_ACTUALIZADA`                | propiedades-topic      | servicio-propiedades  | (ninguno)                                       | **nuevo**         |
| `RESENA_PROPIEDAD_CREADA`              | resenas-topic          | servicio-propiedades  | (ninguno)                                       | **nuevo**         |
| `RESENA_ARRENDADOR_CREADA`             | resenas-topic          | servicio-propiedades  | (ninguno)                                       | **nuevo**         |
| `RESENA_ESTUDIANTE_CREADA`             | resenas-topic          | servicio-propiedades  | servicio-mensajeria                             | **nuevo**         |
| `CALIFICACION_ARRENDADOR_ACTUALIZADA`  | resenas-topic          | servicio-propiedades  | servicio-usuarios                               | reemplaza         |

---

## Convenciones para el payload

1. **Todos los IDs como número** (long) en el payload, aunque el envelope guarde `aggregateId` como string.
2. **Fechas:** `LocalDate` → `"YYYY-MM-DD"`. `Instant`/`OffsetDateTime` → ISO-8601 UTC con `Z`.
3. **Montos:** `BigDecimal` con scale 2; serializado como número JSON (no string).
4. **Strings opcionales:** mejor omitir el campo que enviarlo `null`; los consumers usan `payload.get("x")` y manejan `null`.
5. **No anidar más de 1 nivel** dentro del payload. Si necesitas un sub-objeto, repiensa el evento.

## Política de versionado del payload

- Cambio **aditivo** (campo nuevo opcional): no incrementa `eventVersion`. Los consumers viejos lo ignoran.
- Cambio **incompatible** (renombrar/eliminar campo, cambiar tipo): incrementa `eventVersion` a 2 y el productor debe emitir TANTO v1 como v2 hasta que todos los consumers migren. Los consumers viejos filtran por `eventVersion == 1`.
- El paso v1 → v2 se hace en una ola coordinada propia, **no** durante Ola 2.

## Reservados para olas futuras

- ~~`RESERVA_NO_CONFIRMADA_EN_TIEMPO` (Ola 3 — saga timeout).~~ → implementado en Ola 3 como `RESERVA_EXPIRADA`.
- ~~`SLOT_LIBERADO` (Ola 3 — compensación).~~ → cubierto por la transición a `EXPIRADA` (la verificación de solapamiento no incluye EXPIRADA en `ESTADOS_BLOQUEANTES`).
- `NOTIFICACION_ENTREGADA` (Ola 5 — mensajeria como productor).

Estos quedan reservados para evitar colisión de nombres.
