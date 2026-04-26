# API Endpoints

Todas las rutas se acceden a través del gateway (`http://localhost:8080`). Excepción: los endpoints de `servicio-notificaciones` se consumen internamente y no están ruteados por el gateway.

**Autenticación:** header `Authorization: Bearer <JWT>` en todos los endpoints salvo `auth/register`, `auth/login` y búsquedas públicas.

**Colección Postman:** [postman/AlquilaYa_Universal_CRUD.postman_collection.json](../postman/AlquilaYa_Universal_CRUD.postman_collection.json)

---

## servicio-usuarios — `/api/v1`

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/usuarios/auth/register` | Registrar usuario; dispara OTP por WhatsApp |
| POST | `/usuarios/auth/register-admin` | Registrar administrador |
| POST | `/usuarios/auth/verify-otp` | Verificar código OTP y activar cuenta |
| POST | `/usuarios/auth/login` | Login estándar (devuelve JWT) |
| POST | `/usuarios/auth/login-admin` | Login de admin |

### Usuarios

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/usuarios` | Listar todos |
| GET | `/usuarios/{id}` | Obtener por id |
| GET | `/usuarios/rol/{rol}` | Filtrar por rol (`ESTUDIANTE`, `ARRENDADOR`, `ADMIN`) |
| PUT | `/usuarios/{id}` | Actualizar |
| DELETE | `/usuarios/{id}` | Eliminar |
| GET | `/usuarios/arrendador/{perfilId}/info` | Datos enriquecidos del arrendador (usado por Feign) |
| GET | `/usuarios/estudiante/{perfilId}/info` | Datos enriquecidos del estudiante |

### Documentos de verificación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/usuarios/documentos/upload` | Subir DNI/RUC/carnet (multipart) |
| GET | `/usuarios/documentos/{id}` | Obtener documento |
| GET | `/usuarios/documentos/usuario/{usuarioId}` | Documentos de un usuario |
| GET | `/usuarios/documentos/admin/pending` | Bandeja de pendientes (admin) |
| DELETE | `/usuarios/documentos/{id}` | Eliminar |

### Permisos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/usuarios/permisos` | Listar |
| GET | `/usuarios/permisos/{id}` | Obtener |
| POST | `/usuarios/permisos` | Crear |
| PUT | `/usuarios/permisos/{id}` | Actualizar |
| DELETE | `/usuarios/permisos/{id}` | Eliminar |
| GET | `/usuarios/permisos/check` | Verificar permiso (consumido por Feign) |

### Archivos de usuario

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/storage/{filename}` | Descargar archivo subido |

---

## servicio-propiedades — `/api/v1`

### Propiedades

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/propiedades` | Crear (multipart con imágenes) |
| GET | `/propiedades` | Listar paginado |
| GET | `/propiedades/arrendador/{arrendadorId}` | Propiedades de un arrendador |
| PUT | `/propiedades/{id}` | Actualizar |
| DELETE | `/propiedades/{id}` | Eliminar |
| GET | `/propiedades/buscar` | Filtros: `tipo`, `precioMin`, `precioMax`, `servicios`, `zona`, etc. |
| GET | `/propiedades/{id}/publico` | Vista pública (sin datos sensibles) |
| GET | `/propiedades/{id}/completo` | Detalle con imágenes + reseñas |
| POST | `/propiedades/{id}/imagenes` | Añadir imágenes adicionales |
| DELETE | `/propiedades/{id}/imagenes/{imagenId}` | Eliminar imagen |

### Admin propiedades

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET/POST/PUT/DELETE | `/admin/propiedades/**` | CRUD completo para administrador |

### Reservas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/reservas` | Crear reserva (`SOLICITADA`) |
| GET | `/reservas/mis` | Reservas del estudiante autenticado |
| GET | `/reservas/arrendador` | Reservas sobre propiedades del arrendador |
| GET | `/reservas/arrendador/estado/{estado}` | Filtrar por estado |
| GET | `/reservas/{id}` | Detalle |
| PUT | `/reservas/{id}` | Cambiar estado (aprobar/rechazar/finalizar) |
| DELETE | `/reservas/{id}` | Cancelar |

### Favoritos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/favoritos/{propiedadId}` | Agregar |
| GET | `/favoritos/mis` | Listar mis favoritos |
| GET | `/favoritos/{id}` | Detalle |
| GET | `/favoritos/check/{propiedadId}` | ¿Es favorito? |
| DELETE | `/favoritos/{id}` | Quitar |

### Reseñas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/resenas/propiedad` | Reseñar propiedad |
| POST | `/resenas/arrendador` | Reseñar arrendador |
| GET | `/resenas/{id}` | Obtener |
| GET | `/resenas/propiedad/{propiedadId}` | Reseñas de una propiedad |
| GET | `/resenas/arrendador/{arrendadorId}` | Reseñas de un arrendador |
| GET | `/resenas/arrendador/{arrendadorId}/calificacion` | Promedio |
| DELETE | `/resenas/{id}` | Eliminar |

---

## servicio-pagos — `/api/v1/pagos`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/pagos/preferencia/{reservaId}` | Genera preferencia Mercado Pago; devuelve `init_point` |
| POST | `/pagos/webhook` | Endpoint llamado por Mercado Pago (debe ser accesible vía ngrok) |
| POST | `/pagos/simular-exito/{reservaId}` | Simula pago exitoso (solo desarrollo) |

**Flujo:** frontend pide preferencia → redirige al `init_point` → Mercado Pago notifica webhook → servicio actualiza pago → publica a `pagos-topic` → `servicio-propiedades` marca reserva como `PAGADA`.

---

## servicio-catalogos — `/api/v1/catalogos`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/catalogos` | Listar todos los items |
| POST | `/catalogos` | Crear item |
| GET | `/catalogos/{id}` | Obtener |
| PUT | `/catalogos/{id}` | Actualizar |
| DELETE | `/catalogos/{id}` | Eliminar |
| GET | `/catalogos/tipo/{tipo}` | Filtrar por tipo (ver enum en [base-de-datos.md](base-de-datos.md)) |
| GET | `/catalogos/activos` | Solo activos (cacheable) |

---

## servicio-mensajeria — `/api/v1/mensajeria`

### Conversaciones (participante)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/mensajeria/conversaciones` | Crear o devolver la existente. Body `{ contraparteId, propiedadId }`. Idempotente: 201 si es nueva, 200 si ya existía. |
| GET | `/mensajeria/conversaciones` | Listar conversaciones del caller (enriquecidas con `contraparteNombre`, `propiedadTitulo`, `noLeidos`) |
| GET | `/mensajeria/conversaciones/{id}` | Detalle (solo participantes) |

### Mensajes (participante)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/mensajeria/conversaciones/{id}/mensajes?page=&size=` | Historial paginado, ascendente. Los mensajes `BLOQUEADO` se ocultan a participantes. |
| POST | `/mensajeria/conversaciones/{id}/mensajes` | Enviar. Body `{ contenido }` 1..2000 chars. También se emite por WS a los dos participantes. Rechaza 409 si la conversación está `SUSPENDIDA`. |
| PATCH | `/mensajeria/conversaciones/{id}/marcar-leida` | Marca todos los no-leídos dirigidos al caller como `LEIDO`. Emite evento WS `MENSAJES_LEIDOS`. |

### Moderación (admin)

Prefijo `/api/v1/admin/mensajeria`. Todos requieren `ROLE_ADMIN`.

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/admin/mensajeria/conversaciones?estado=&estudianteId=&arrendadorId=&propiedadId=&page=&size=` | Listado paginado con filtros opcionales |
| GET | `/admin/mensajeria/conversaciones/{id}/mensajes?page=&size=` | Historial completo (incluye `BLOQUEADO`) |
| POST | `/admin/mensajeria/mensajes/{id}/bloquear` | Body `{ motivo }`. Cambia mensaje a `BLOQUEADO` + log + evento WS |
| POST | `/admin/mensajeria/mensajes/{id}/desbloquear` | Body `{ motivo }`. Vuelve a `ENVIADO` + log |
| POST | `/admin/mensajeria/conversaciones/{id}/suspender` | Body `{ motivo }`. Estado → `SUSPENDIDA`, bloquea envíos + log + evento WS |
| POST | `/admin/mensajeria/conversaciones/{id}/reactivar` | Body `{ motivo }`. Estado → `ACTIVA` + log |
| GET | `/admin/mensajeria/moderacion-log?targetType=&targetId=&page=&size=` | Auditoría de todas las acciones de moderación |

### WebSocket STOMP

Endpoint de upgrade: `ws://host:8086/ws-mensajeria`. **No pasa por el gateway** (conexión directa al servicio).

Auth: JWT como `Authorization: Bearer <jwt>` en `connectHeaders` del frame STOMP CONNECT.

Destinos:

| Dirección | Destino | Body |
|-----------|---------|------|
| Cliente → Servidor | `/app/chat.enviar/{conversacionId}` | `{ "contenido": "..." }` |
| Servidor → participantes | `/user/queue/conversacion.{id}` | `MensajeDTO` (para cada mensaje nuevo) |
| Servidor → participantes | `/user/queue/conversacion.{id}.eventos` | `{ tipo, conversacionId, mensajeId?, motivo? }` (MENSAJE_BLOQUEADO, CONVERSACION_SUSPENDIDA, MENSAJES_LEIDOS, etc.) |
| Servidor → admins | `/topic/admin/mensajes-nuevos` | `MensajeDTO` — suscripción restringida a rol ADMIN |
| Servidor → emisor con error | `/user/queue/errors` | `{ "error": "..." }` (p.ej. intento de enviar a suspendida) |

---

## servicio-notificaciones (interno, :8081)

No expuesto vía gateway. Consumido directamente por `servicio-usuarios` y por Kafka.

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/notifications/whatsapp/send-otp` | Enviar OTP al teléfono |
| POST | `/api/v1/notifications/whatsapp/send-message` | Enviar mensaje arbitrario |
| GET | `/api/v1/notifications/status` | Estado de la sesión WhatsApp |

**Eventos Kafka consumidos:**

- `user-approval-events` — `{ tipo: 'APROBACION' \| 'RECHAZO', nombre, telefono, motivo? }`
- `reserva-events` — `{ tipo: 'RESERVA_SOLICITADA' \| 'RESERVA_APROBADA' \| 'RESERVA_RECHAZADA' \| 'RESERVA_PAGADA' \| 'RESERVA_CANCELADA', reservaId, propiedadId, montoTotal, estudianteNombre, estudianteTelefono, arrendadorNombre, arrendadorTelefono, motivo? }`
