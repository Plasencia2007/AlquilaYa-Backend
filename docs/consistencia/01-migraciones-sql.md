# 01 — Migraciones SQL (Ola 1, cimientos)

> DDL completo y verificado contra el estado actual de la BD (`database/init.sql`, `database/V2__add_vistas_to_propiedades.sql`) y contra los `@Entity` de cada servicio.  
> Cada bloque indica explícitamente en qué **schema/BD** debe ejecutarse.

## Mapeo schemas → servicios (recordatorio)

| BD                          | Engine        | Servicios que la usan |
|-----------------------------|---------------|-----------------------|
| `postgres`                  | PostgreSQL 15 | servicio-usuarios     |
| `alquilaya_propiedades`     | PostgreSQL 15 | servicio-propiedades  |
| `alquilaya_pagos`           | PostgreSQL 15 | servicio-pagos        |
| `alquilaya_mensajeria`      | PostgreSQL 15 | servicio-mensajeria   |
| `alquilaya_catalogos`       | MySQL 8       | servicio-catalogos    |

Las migraciones de Ola 1 sólo aplican a Postgres. **`servicio-catalogos` (MySQL) queda fuera de Ola 1**: no es productor ni consumer Kafka actualmente; entra en Ola 5 si pasa a serlo.

## Verificación de nombres reales de tabla (hecha sobre el código)

| Entidad Java                                                    | Tabla real            | BD                       |
|-----------------------------------------------------------------|-----------------------|--------------------------|
| `com.alquilaya.serviciopropiedades.entities.Reserva`            | `reservas`            | `alquilaya_propiedades`  |
| `com.alquilaya.serviciopropiedades.entities.Propiedad`          | `propiedades`         | `alquilaya_propiedades`  |
| `com.alquilaya.serviciopagos.entities.Pago`                     | `pagos`               | `alquilaya_pagos`        |
| `com.alquilaya.serviciousuarios.entities.Usuario`               | `usuarios`            | `postgres`               |

Convención de ubicación física de los archivos SQL: cada servicio gestiona sus propias migraciones (Flyway/Liquibase, hoy a definir). Para Ola 1 estos scripts se ejecutan manualmente o se colocan en `database/V<N>__<descripcion>.sql` siguiendo el patrón de `V2__add_vistas_to_propiedades.sql`.

> **Decisión:** se respeta el patrón existente — un único archivo `.sql` por migración, prefijo `V<N>__`, con `\c <database>` cuando se conecta vía `psql` al cluster compartido. Convivencia con futura migración a Flyway por servicio queda fuera del alcance de Ola 1.

---

## A) Tabla `outbox_events` (idéntica en cada servicio productor)

> Esta misma tabla se crea **tres veces**, una por BD: `postgres`, `alquilaya_propiedades`, `alquilaya_pagos`.

```sql
-- V3__outbox_events.sql  (ejecutar en cada DB que sea productora)
CREATE TABLE IF NOT EXISTS outbox_events (
    id              BIGSERIAL    PRIMARY KEY,
    event_id        UUID         NOT NULL UNIQUE,
    aggregate_type  VARCHAR(50)  NOT NULL,
    aggregate_id    VARCHAR(100) NOT NULL,
    event_type      VARCHAR(100) NOT NULL,
    topic           VARCHAR(100) NOT NULL,
    payload         TEXT         NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    sent_at         TIMESTAMP    NULL,
    attempts        INT          NOT NULL DEFAULT 0,
    last_error      TEXT         NULL
);

-- Índice parcial: solo eventos pendientes de publicar.
CREATE INDEX IF NOT EXISTS idx_outbox_pending
    ON outbox_events (sent_at, created_at)
    WHERE sent_at IS NULL;

-- Índice por agregado: útil para depurar / reconstruir historia.
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate
    ON outbox_events (aggregate_type, aggregate_id);
```

### Ejecución por BD

```sql
\c postgres
\i V3__outbox_events.sql

\c alquilaya_propiedades
\i V3__outbox_events.sql

\c alquilaya_pagos
\i V3__outbox_events.sql
```

> **`servicio-mensajeria` (DB `alquilaya_mensajeria`) NO crea `outbox_events` en Ola 1**: hoy es sólo consumer. Si en Ola 3 emite eventos (notif. delivered/leído), se le agrega entonces.

---

## B) Tabla `processed_events` (idéntica en cada servicio consumer)

> Se crea en las BDs cuyos servicios consumen Kafka: `postgres` (usuarios consume `resenas-topic`), `alquilaya_propiedades` (consume `pagos-topic`), `alquilaya_mensajeria` (consume varios).

```sql
-- V4__processed_events.sql
CREATE TABLE IF NOT EXISTS processed_events (
    event_id      UUID         NOT NULL,
    consumer_name VARCHAR(100) NOT NULL,
    processed_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, consumer_name)
);

-- Índice opcional para purga periódica (TTL 30 días en cron).
CREATE INDEX IF NOT EXISTS idx_processed_events_at
    ON processed_events (processed_at);
```

### Ejecución por BD

```sql
\c postgres
\i V4__processed_events.sql

\c alquilaya_propiedades
\i V4__processed_events.sql

\c alquilaya_mensajeria
\i V4__processed_events.sql
```

> `servicio-pagos` **no es consumer Kafka actualmente** (sólo productor). Si lo es en el futuro, se aplica entonces.

---

## C) Columnas `@Version` (optimistic locking)

JPA detectará `version BIGINT` automáticamente cuando la entidad declare `@Version`. La columna **debe** tener `DEFAULT 0` para que los rows existentes pasen el chequeo en la primera carga.

### C.1 `reservas` — DB `alquilaya_propiedades`

```sql
-- V5__reservas_add_version.sql
\c alquilaya_propiedades
ALTER TABLE reservas
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
```

### C.2 `propiedades` — DB `alquilaya_propiedades`

```sql
-- V6__propiedades_add_version.sql
\c alquilaya_propiedades
ALTER TABLE propiedades
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
```

### C.3 `pagos` — DB `alquilaya_pagos`

```sql
-- V7__pagos_add_version.sql
\c alquilaya_pagos
ALTER TABLE pagos
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
```

> **No se agrega `@Version` a `usuarios`** en Ola 1. La entidad `Usuario` no es objeto de update concurrente desde múltiples vías; si en Ola 3 se identifica race condition, se añade entonces.

---

## D) Tabla `saga_reserva_pago` (en servicio-propiedades, para Ola 3)

> Se crea en Ola 1 para que el modelo de datos esté en sitio antes de que Ola 3 implemente el orquestador. **Vacía durante Ola 1-2.**

```sql
-- V8__saga_reserva_pago.sql
\c alquilaya_propiedades

CREATE TABLE IF NOT EXISTS saga_reserva_pago (
    saga_id       UUID         PRIMARY KEY,
    reserva_id    BIGINT       NOT NULL,
    estado_saga   VARCHAR(50)  NOT NULL,
    paso_actual   VARCHAR(50)  NOT NULL,
    intentos      INT          NOT NULL DEFAULT 0,
    payload       TEXT,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    completed_at  TIMESTAMP    NULL,
    ultimo_error  TEXT         NULL,
    version       BIGINT       NOT NULL DEFAULT 0
);

-- Sólo se indexan las sagas en curso.
CREATE INDEX IF NOT EXISTS idx_saga_estado
    ON saga_reserva_pago (estado_saga)
    WHERE completed_at IS NULL;

-- Soporta búsquedas frecuentes "saga vigente para esta reserva".
CREATE INDEX IF NOT EXISTS idx_saga_reserva
    ON saga_reserva_pago (reserva_id);
```

### Valores válidos de `estado_saga` (catálogo cerrado, gestionado en código)

```
INICIADA → APROBANDO → ESPERANDO_PAGO → CONFIRMANDO → COMPLETADA
                                              ↓
                                       COMPENSANDO → COMPENSADA
                                                      ↓
                                                    FALLIDA
```

> El enum Java vivirá en `com.alquilaya.serviciopropiedades.saga.EstadoSaga`. La BD se queda con `VARCHAR(50)` para evitar futuras ALTERs si cambian valores.

### Valores válidos de `paso_actual`

Strings libres que documentan el último paso ejecutado. Sugerencia: `"crear_reserva"`, `"crear_preferencia_pago"`, `"esperar_webhook"`, `"liberar_slot_compensacion"`. Sin enum.

---

## E) Orden de aplicación recomendado

Para un cluster limpio:

```sql
-- En postgres
\c postgres
\i V3__outbox_events.sql
\i V4__processed_events.sql

-- En alquilaya_propiedades
\c alquilaya_propiedades
\i V3__outbox_events.sql
\i V4__processed_events.sql
\i V5__reservas_add_version.sql
\i V6__propiedades_add_version.sql
\i V8__saga_reserva_pago.sql

-- En alquilaya_pagos
\c alquilaya_pagos
\i V3__outbox_events.sql
\i V7__pagos_add_version.sql

-- En alquilaya_mensajeria
\c alquilaya_mensajeria
\i V4__processed_events.sql
```

Para un cluster con datos: todas las DDLs anteriores son `ADD COLUMN ... DEFAULT 0` o `CREATE TABLE IF NOT EXISTS`, **idempotentes y no destructivas**. Pueden correrse online en producción sin downtime salvo lock breve en `ALTER TABLE ... ADD COLUMN DEFAULT` (Postgres 15 lo hace en O(1) gracias a metadata-only para `DEFAULT` constante).

---

## F) Rollback (en caso de necesidad)

Sólo las nuevas tablas/columnas pueden droppearse; no se toca data legacy.

```sql
\c alquilaya_propiedades
DROP TABLE IF EXISTS saga_reserva_pago;
ALTER TABLE propiedades DROP COLUMN IF EXISTS version;
ALTER TABLE reservas    DROP COLUMN IF EXISTS version;
DROP TABLE IF EXISTS processed_events;
DROP TABLE IF EXISTS outbox_events;

\c alquilaya_pagos
ALTER TABLE pagos DROP COLUMN IF EXISTS version;
DROP TABLE IF EXISTS outbox_events;

\c alquilaya_mensajeria
DROP TABLE IF EXISTS processed_events;

\c postgres
DROP TABLE IF EXISTS processed_events;
DROP TABLE IF EXISTS outbox_events;
```

---

## G) Inconsistencias / observaciones encontradas

1. La columna `payment_id` en `pagos` ya tiene `UNIQUE` (verificado en la entidad `Pago.java`). El paso a outbox no la afecta.
2. La tabla `reservas` **no tiene FK a `propiedades`** a nivel BD (cross-DB lógicamente, aunque ambas viven en la misma instancia Postgres pero en distintas DBs `alquilaya_propiedades` — espera, `reservas` y `propiedades` están en la MISMA db `alquilaya_propiedades`; la decisión de no enforce FK es consistente con el CLAUDE.md por mantener simetría con cruces inter-DB).
3. La columna `vistas` agregada en V2 ya está consolidada — las migraciones de Ola 1 parten de la numeración `V3` en adelante.
4. La entidad `Pago` usa `estado VARCHAR` con valores `"PENDIENTE" | "PAGADO" | "RECHAZADO" | "PENDIENTE_REVISION"` — no se cambian en Ola 1; sólo se documenta el catálogo en `04-event-catalog.md`.
