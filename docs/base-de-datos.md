# Modelo de Datos

Cuatro esquemas lógicos en PostgreSQL + uno en MySQL. Cada microservicio es dueño de su esquema; no se comparten tablas.

| Esquema | Motor | Puerto | Servicio dueño |
|---------|-------|--------|----------------|
| `postgres` (default DB) | PostgreSQL 15 | 5433 | servicio-usuarios |
| `alquilaya_propiedades` | PostgreSQL 15 | 5433 | servicio-propiedades |
| `alquilaya_pagos` | PostgreSQL 15 | 5433 | servicio-pagos |
| `alquilaya_mensajeria` | PostgreSQL 15 | 5433 | servicio-mensajeria |
| `alquilaya_catalogos` | MySQL 8 | 3307 | servicio-catalogos |

Scripts de inicialización: [database/init.sql](../database/init.sql), [database/data.sql](../database/data.sql), [database/extra_permissions.sql](../database/extra_permissions.sql).

---

## servicio-usuarios

### `usuarios`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | bigint PK | IDENTITY |
| `nombre`, `apellido` | varchar | |
| `dni` | varchar(8) | UNIQUE |
| `correo` | varchar | UNIQUE |
| `password` | varchar | BCrypt hash |
| `rol` | enum | `ESTUDIANTE`, `ARRENDADOR`, `ADMIN` |
| `estado` | enum | `PENDING`, `VERIFIED`, `REJECTED`, `SUSPENDED` |
| `telefono` | varchar | formato `+51XXXXXXXXX` |
| `telefono_verificado` | boolean | |
| `fecha_creacion`, `fecha_actualizacion` | timestamp | |

Relaciones:
- `1:1` → `arrendadores` (si rol = ARRENDADOR)
- `1:1` → `estudiantes` (si rol = ESTUDIANTE)
- `1:N` → `documentos`
- `1:N` → `otp_verifications`

### `arrendadores`

| Campo | Tipo |
|-------|------|
| `id` | bigint PK |
| `usuario_id` | bigint FK (unique) |
| `nombre_comercial` | varchar |
| `ruc` | varchar |
| `telefono` | varchar |
| `direccion_propiedades` | text |
| `latitud`, `longitud` | double |
| `es_empresa` | boolean |
| `calificacion` | numeric (default 5.0) |

### `estudiantes`

| Campo | Tipo |
|-------|------|
| `id` | bigint PK |
| `usuario_id` | bigint FK (unique) |
| `universidad` | varchar (default `UPeU`) |
| `codigo_estudiante` | varchar |
| `carrera` | varchar |
| `ciclo` | int (1-12) |
| `verificado` | boolean |

### `documentos`

| Campo | Tipo |
|-------|------|
| `id` | bigint PK |
| `usuario_id` | bigint FK |
| `tipo` | enum: `DNI`, `CARNET`, `BOLETA`, `PASAPORTE` |
| `url_documento` | varchar |
| `estado` | enum: `PENDIENTE`, `APROBADO`, `RECHAZADO` |
| `motivo_rechazo` | text |
| `fecha_subida`, `fecha_revision` | timestamp |

### `otp_verifications`

| Campo | Tipo |
|-------|------|
| `id` | bigint PK |
| `usuario_id` | bigint FK |
| `codigo` | varchar (6 dígitos) |
| `intento` | int |
| `expiracion` | timestamp |

### `permisos`

Tabla para permisos granulares gestionados desde el admin. Scripts de seed en [database/extra_permissions.sql](../database/extra_permissions.sql).

---

## servicio-propiedades

### `propiedades`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | bigint PK | |
| `titulo` | varchar | |
| `descripcion` | text | |
| `precio` | numeric(10,2) | |
| `direccion` | varchar | |
| `ubicacion_gps` | varchar | descriptivo |
| `imagen_url` | varchar | principal |
| `estado` | enum | `PENDIENTE`, `APROBADO`, `RECHAZADO` |
| `arrendador_id` | bigint FK (lógica) | apunta a `arrendadores.id` del otro esquema |
| `tipo_propiedad` | varchar | proviene de `catalogos` (ej. `HABITACION`) |
| `periodo_alquiler` | varchar | `MENSUAL`, `SEMESTRAL`, `ANUAL` |
| `area` | double | m² |
| `nro_piso` | int | |
| `esta_disponible` | boolean | |
| `disponible_desde` | date | |
| `latitud`, `longitud` | double | validados con `@CoordenadaLatitud/Longitud` |
| `distancia_metros` | double | calculado contra UPeU, ≤ 15 000 m |
| `aprobado_por_admin` | boolean | |
| `calificacion` | double | promedio de reseñas |

Colecciones embebidas (`@ElementCollection`):
- `servicios_incluidos` — lista de strings (`LUZ`, `AGUA`, `WIFI`, etc.)
- `reglas` — lista de strings (`NO_MASCOTAS`, `NO_FIESTAS`, etc.)

### `propiedad_imagenes`

| Campo | Tipo |
|-------|------|
| `id` | bigint PK |
| `propiedad_id` | bigint FK |
| `url_imagen` | varchar |
| `orden` | int |
| `fecha_subida` | timestamp |

### `reservas`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | bigint PK | |
| `propiedad_id` | bigint FK | |
| `estudiante_id` | bigint | FK lógica |
| `arrendador_id` | bigint | FK lógica |
| `fecha_inicio`, `fecha_fin` | date | |
| `monto_total` | numeric(10,2) | |
| `estado` | enum | ver abajo |
| `motivo_rechazo` | text | |
| `fecha_creacion`, `fecha_actualizacion` | timestamp | |

**Estados de reserva:**
```
SOLICITADA → APROBADA → PAGADA → FINALIZADA
              │           │
              ▼           ▼
          RECHAZADA   CANCELADA
```

Índices: `idx_reserva_estudiante`, `idx_reserva_arrendador`, `idx_reserva_propiedad`.

### `favoritos`

| Campo | Tipo |
|-------|------|
| `id` | bigint PK |
| `usuario_id` | bigint |
| `propiedad_id` | bigint FK |
| `fecha_agregado` | timestamp |

### `resenas_propiedades` / `resenas_arrendadores`

| Campo | Tipo |
|-------|------|
| `id` | bigint PK |
| `propiedad_id` / `arrendador_id` | bigint |
| `estudiante_id` | bigint |
| `calificacion` | int (1-5) |
| `comentario` | text |
| `fecha_resena` | timestamp |

---

## servicio-pagos

### `pagos`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | bigint PK | |
| `reserva_id` | bigint | FK lógica |
| `preferencia_id` | varchar | ID de `Preference` de Mercado Pago |
| `payment_id` | varchar | ID de `Payment` al confirmar |
| `monto` | numeric(10,2) | |
| `estado` | varchar | `PENDING`, `SUCCESS`, `FAILURE` |
| `fecha_creacion`, `fecha_pago` | timestamp | |

---

## servicio-mensajeria

### `conversaciones`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | bigint PK | |
| `estudiante_id` | bigint | FK lógica → `usuarios.estudiantes.id` |
| `arrendador_id` | bigint | FK lógica → `usuarios.arrendadores.id` |
| `propiedad_id` | bigint | FK lógica → `propiedades.propiedades.id` |
| `estado` | enum | `ACTIVA`, `SUSPENDIDA` |
| `fecha_creacion`, `fecha_ultima_actividad` | timestamp | |
| `ultimo_mensaje_preview` | varchar(200) | cache para listar sin JOIN |

Índices:
- **UNIQUE** `(estudiante_id, arrendador_id, propiedad_id)` — un hilo por propiedad entre ese par de usuarios.
- `(estudiante_id, fecha_ultima_actividad DESC)`, `(arrendador_id, fecha_ultima_actividad DESC)`.

### `mensajes`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | bigint PK | |
| `conversacion_id` | bigint FK | ON DELETE CASCADE |
| `emisor_perfil_id` | bigint | quién envió (es el estudiante o arrendador del hilo) |
| `emisor_rol` | enum | `ESTUDIANTE`, `ARRENDADOR` |
| `contenido` | text (1-2000) | |
| `estado` | enum | `ENVIADO`, `LEIDO`, `BLOQUEADO` |
| `fecha_envio`, `fecha_lectura` | timestamp | |

Índices: `(conversacion_id, fecha_envio ASC)`, `(conversacion_id, estado)`.

### `moderacion_log`

Auditoría de todas las acciones de admin sobre mensajes o conversaciones.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | bigint PK | |
| `admin_id`, `admin_email` | bigint / varchar(150) | snapshot para auditoría |
| `accion` | enum | `BLOQUEAR_MENSAJE`, `DESBLOQUEAR_MENSAJE`, `SUSPENDER_CONVERSACION`, `REACTIVAR_CONVERSACION` |
| `target_type` | enum | `MENSAJE`, `CONVERSACION` |
| `target_id` | bigint | id del target |
| `motivo` | varchar(500) | |
| `fecha` | timestamp | |

---

## servicio-catalogos (MySQL)

### `items_catalogo`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | bigint PK | |
| `nombre` | varchar | etiqueta mostrada |
| `valor` | varchar | clave que usan los otros servicios (ej. `WIFI`) |
| `tipo` | enum `TipoItem` | ver abajo |
| `activo` | boolean | default true |
| `icono` | varchar | URL opcional |
| `descripcion` | text | |
| `fecha_creacion` | timestamp | |

**Enum `TipoItem`:**
- `TIPO_PROPIEDAD` — `HABITACION`, `DEPARTAMENTO`, `CASA`, …
- `PERIODO_ALQUILER` — `MENSUAL`, `SEMESTRAL`, `ANUAL`
- `SERVICIOS` — `LUZ`, `AGUA`, `WIFI`, `GAS`, `INTERNET`, …
- `REGLAS` — `NO_MASCOTAS`, `NO_FIESTAS`, `HORARIO_ENTRADA`, …
- `ZONAS` — `ZONA_UPEU`, `ZONA_CENTRO`, `ZONA_NORTE`, …

El admin puede activar/desactivar items sin tocar código; `servicio-propiedades` consume la lista activa para validar y mostrar filtros.

---

## Relaciones lógicas entre esquemas

Las FKs entre esquemas no están enforced por la base (imposible cruzando motores). Se mantienen vía Feign y eventos Kafka:

```
usuarios.arrendadores.id  ──────►  propiedades.arrendador_id
usuarios.estudiantes.id   ──────►  propiedades.reservas.estudiante_id
propiedades.reservas.id   ──────►  pagos.reserva_id
usuarios.arrendadores.id  ──────►  mensajeria.conversaciones.arrendador_id
usuarios.estudiantes.id   ──────►  mensajeria.conversaciones.estudiante_id
propiedades.propiedades.id ─────►  mensajeria.conversaciones.propiedad_id
catalogos.items.valor     ──────►  propiedades.tipo_propiedad / servicios_incluidos / reglas
```

Cuando un servicio necesita datos del otro, los trae vía Feign (ver [microservicios.md](microservicios.md)).
