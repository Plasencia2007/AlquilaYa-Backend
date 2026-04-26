# Flujos de Negocio

Flujos del ciclo de vida típico de un usuario en AlquilaYa.

---

## 1. Registro de estudiante con OTP

```
Frontend ──► /api/v1/usuarios/auth/register
              │
              ▼
         servicio-usuarios
           ├── guarda Usuario (estado=PENDING)
           ├── genera OTP 6 dígitos (tabla otp_verifications)
           └── HTTP → servicio-notificaciones :8081
                        └── WhatsApp: "Tu código es 123456"

Frontend ──► /api/v1/usuarios/auth/verify-otp { telefono, codigo }
              │
              ▼
         servicio-usuarios
           ├── valida OTP + expiración
           ├── estado → VERIFIED
           └── devuelve JWT
```

Notas:
- Si OTP expira (≤ 5 min) o intenta > 3 veces, se invalida.
- El teléfono debe llegar en formato internacional `+51XXXXXXXXX`.

---

## 2. Verificación de arrendador (documentos)

```
Arrendador ──► POST /api/v1/usuarios/documentos/upload (multipart DNI/RUC)
                │
                ▼
           servicio-usuarios
             └── crea Documento (estado=PENDIENTE)

Admin ──► GET /api/v1/usuarios/documentos/admin/pending
       ──► PUT /api/v1/usuarios/documentos/{id}  (APROBADO | RECHAZADO + motivo)
             │
             ▼
        servicio-usuarios
          ├── actualiza Documento
          ├── si todos APROBADOS → Usuario.estado = VERIFIED
          └── Kafka → user-approval-events
                      { tipo, nombre, telefono, motivo? }
                              │
                              ▼
                    servicio-notificaciones
                         └── WhatsApp formateado al arrendador
```

---

## 3. Búsqueda y creación de reserva

```
Estudiante ──► GET /api/v1/propiedades/buscar?tipo=HABITACION&precioMax=800&servicios=WIFI
                │
                ▼
           servicio-propiedades
             ├── consulta catálogos activos (vía /api/v1/catalogos)
             ├── aplica filtros + validación geo (≤ 15 km UPeU)
             └── devuelve propiedades aprobadas y disponibles

Estudiante ──► POST /api/v1/reservas { propiedadId, fechaInicio, fechaFin, montoTotal }
                │
                ▼
           servicio-propiedades
             ├── valida disponibilidad (no choque de fechas)
             ├── Feign → servicio-usuarios (valida estudiante VERIFIED)
             ├── Feign → servicio-usuarios (trae arrendador)
             ├── crea Reserva (estado=SOLICITADA)
             └── Kafka → reserva-events (RESERVA_SOLICITADA)
                          │
                          ▼
                servicio-notificaciones
                    └── WhatsApp al arrendador: "Nueva solicitud de reserva"
```

---

## 4. Aprobación de reserva y pago

```
Arrendador ──► PUT /api/v1/reservas/{id} { estado: APROBADA }
                │
                ▼
           servicio-propiedades
             ├── estado → APROBADA
             └── Kafka → reserva-events (RESERVA_APROBADA)
                          └── WhatsApp al estudiante: "Reserva aprobada, procede al pago"

Estudiante ──► POST /api/v1/pagos/preferencia/{reservaId}
                │
                ▼
           servicio-pagos
             ├── Feign → servicio-propiedades (trae reserva + arrendador + estudiante)
             ├── arma Preference con:
             │     - items: monto reserva
             │     - payer: email/nombre (con defaults por si vienen vacíos)
             │     - back_urls: localhost:3000/pago/{exito|fallo|pendiente}
             │     - notification_url: ${MP_NOTIFICATION_URL} (ngrok)
             ├── Mercado Pago SDK → crea Preference
             ├── guarda Pago (estado=PENDING, preferencia_id)
             └── devuelve init_point

Frontend redirige a init_point ──► Usuario paga en Checkout Pro

Mercado Pago ──► POST /api/v1/pagos/webhook
                    │
                    ▼
               servicio-pagos
                 ├── consulta Payment detail en MP
                 ├── actualiza Pago (estado=SUCCESS, payment_id)
                 └── Kafka → pagos-topic
                             │
                             ▼
                   servicio-propiedades (consumer)
                     ├── Reserva.estado → PAGADA
                     └── Kafka → reserva-events (RESERVA_PAGADA)
                                  └── servicio-notificaciones
                                        ├── WhatsApp al arrendador: "Pago confirmado"
                                        └── WhatsApp al estudiante: "Pago exitoso"
```

**Puntos importantes:**
- El webhook debe responder `200 OK` rápido; MP reintenta si no.
- `MP_NOTIFICATION_URL` tiene que ser HTTPS y accesible públicamente → de ahí el ngrok.
- En desarrollo se puede usar `POST /api/v1/pagos/simular-exito/{reservaId}` para saltarse MP.
- Validación de firma `X-Signature` está pendiente para producción.

---

## 5. Reseñas y calificación

```
Estudiante ──► POST /api/v1/resenas/propiedad { propiedadId, calificacion, comentario }
           ──► POST /api/v1/resenas/arrendador { arrendadorId, calificacion, comentario }
                │
                ▼
           servicio-propiedades
             ├── persiste ReseñaPropiedad / ReseñaArrendador
             └── recalcula promedio y actualiza Propiedad.calificacion / Arrendador.calificacion
```

Solo los estudiantes cuya reserva haya pasado por `PAGADA` o `FINALIZADA` pueden reseñar.

---

## Estados clave

**Usuario:** `PENDING → VERIFIED` (por OTP) → luego el admin puede pasar a `REJECTED` o `SUSPENDED`.

**Propiedad:** `PENDIENTE → APROBADO / RECHAZADO` (por el admin).

**Reserva:**
```
SOLICITADA ─► APROBADA ─► PAGADA ─► FINALIZADA
     │            │
     ▼            ▼
RECHAZADA    CANCELADA
```

**Pago:** `PENDING → SUCCESS / FAILURE`.

---

## 6. Chat in-app por propiedad (estudiante ↔ arrendador)

```
Estudiante ──► POST /api/v1/mensajeria/conversaciones
                    { contraparteId: <arrendadorId>, propiedadId }
                    │ (idempotente)
                    ▼
               servicio-mensajeria
                 ├── busca por UNIQUE(estudianteId, arrendadorId, propiedadId)
                 ├── si existe → 200
                 └── si no existe → crea + 201
                        │
Estudiante ─── abre WebSocket:
    ws://host:8086/ws-mensajeria
    connectHeaders: Authorization: Bearer <jwt>
                        │
               WebSocketAuthInterceptor (CONNECT frame)
                 ├── valida JWT
                 └── setea Principal del Socket session

    client.subscribe('/user/queue/conversacion.42', cb)

Estudiante ──► SEND /app/chat.enviar/42 { contenido: "Hola" }
                        │
               ChatWebSocketController.enviar
                 ├── verificarAcceso(42, estudiante)
                 ├── verifica estado != SUSPENDIDA
                 ├── persiste Mensaje (ENVIADO)
                 ├── actualiza ultimoMensajePreview + fechaUltimaActividad
                 └── emit a /user/{estudianteId}/queue/conversacion.42  (él mismo)
                     emit a /user/{arrendadorId}/queue/conversacion.42

Arrendador ya suscrito ──► recibe MensajeDTO en tiempo real
```

Flujo adicional de lectura:
```
Arrendador ──► PATCH /api/v1/mensajeria/conversaciones/42/marcar-leida
                        │
               MensajeService.marcarLeidos
                 ├── todos los mensajes del estudiante con estado=ENVIADO → LEIDO
                 └── emit evento { tipo: "MENSAJES_LEIDOS", lectorPerfilId, mensajes: N }
                     a /user/queue/conversacion.42.eventos (ambos lados)
```

---

## 7. Moderación por ADMIN

```
Admin ──► GET /api/v1/admin/mensajeria/conversaciones?estado=SUSPENDIDA
       ──► GET /admin/mensajeria/conversaciones/42/mensajes   (incluye BLOQUEADO)

Admin ──► POST /admin/mensajeria/mensajes/100/bloquear { motivo: "Contenido ofensivo" }
                        │
               ModeracionService.bloquearMensaje
                 ├── Mensaje.estado → BLOQUEADO (participantes dejan de verlo)
                 ├── ModeracionLog (admin, accion, target, motivo)
                 └── emit evento MENSAJE_BLOQUEADO a participantes vía WS

Admin ──► POST /admin/mensajeria/conversaciones/42/suspender { motivo: "Abuso reiterado" }
                        │
               ModeracionService.suspender
                 ├── Conversacion.estado → SUSPENDIDA
                 ├── ModeracionLog
                 └── emit evento CONVERSACION_SUSPENDIDA a participantes

Estudiante intenta enviar en conversación suspendida → 409 Conflict
  (y si lo hace por WS, recibe ERROR frame en /user/queue/errors)

Admin ──► POST /admin/mensajeria/conversaciones/42/reactivar { motivo: "Partes reconciliadas" }
               → estado ACTIVA, envíos habilitados de nuevo.
```

---

## Estados clave del chat

**Conversación:** `ACTIVA ⇄ SUSPENDIDA` (acción de admin, bidireccional).

**Mensaje:** `ENVIADO → LEIDO`. Admin puede forzar `ENVIADO ⇄ BLOQUEADO`.
