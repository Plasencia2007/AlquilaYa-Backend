# Migraciones con Flyway

Flyway está **preparado pero desactivado por default** (`FLYWAY_ENABLED=false`). Esto permite que Hibernate siga creando el schema automáticamente en dev (`ddl-auto=update`) mientras no haya migraciones. **Antes de ir a producción hay que activarlo.**

## Por qué

En prod, `ddl-auto: update` es peligroso: Hibernate puede dropear/renombrar columnas por autodetección y provocar pérdida de datos silenciosa. Flyway versiona cada cambio de schema en un script SQL, lo ejecuta en orden y rechaza cambios inconsistentes.

## Estructura

Cada servicio Java con BD tiene:

```
servicio-<nombre>/
  pom.xml              # flyway-core + flyway-database-postgresql (o flyway-mysql)
  src/main/resources/
    db/migration/      # scripts V1__*.sql, V2__*.sql, etc.
```

Scripts afectados: `servicio-usuarios`, `servicio-propiedades`, `servicio-pagos` (Postgres) y `servicio-catalogos` (MySQL).

## Pasos para activar Flyway

### 1. Generar `V1__initial_schema.sql` para cada servicio

Con las BDs de dev ya pobladas por Hibernate, exportar el schema actual como punto de partida:

**Postgres** (desde el contenedor `alquilaya-postgres`):
```bash
# servicio-usuarios (esquema "postgres")
docker exec alquilaya-postgres pg_dump -U postgres -s --no-owner --no-privileges postgres \
  > servicio-usuarios/src/main/resources/db/migration/V1__initial_schema.sql

# servicio-propiedades
docker exec alquilaya-postgres pg_dump -U postgres -s --no-owner --no-privileges alquilaya_propiedades \
  > servicio-propiedades/src/main/resources/db/migration/V1__initial_schema.sql

# servicio-pagos
docker exec alquilaya-postgres pg_dump -U postgres -s --no-owner --no-privileges alquilaya_pagos \
  > servicio-pagos/src/main/resources/db/migration/V1__initial_schema.sql
```

**MySQL**:
```bash
docker exec alquilaya-mysql mysqldump -uroot -p"$MYSQL_PASSWORD" --no-data --routines --skip-comments alquilaya_catalogos \
  > servicio-catalogos/src/main/resources/db/migration/V1__initial_schema.sql
```

Revisa cada archivo generado:
- Elimina líneas `SET` específicas de la sesión si hay problemas de compat.
- Quita cualquier `CREATE DATABASE` / `USE` — Flyway asume que la BD ya existe.
- Comenta las tablas internas de Flyway si aparecen (`flyway_schema_history`).

### 2. Activar Flyway y cambiar a `validate`

En producción (o cuando quieras probar en local):

```bash
# .env de producción
HIBERNATE_DDL_AUTO=validate    # Hibernate solo valida que el schema coincida
FLYWAY_ENABLED=true            # Flyway corre las migraciones al arrancar
```

### 3. Arrancar los servicios

En el primer arranque con Flyway activado:
- Flyway detecta la BD existente y la baselinea a versión 0 (`baseline-on-migrate: true`).
- Aplica todas las migraciones con versión mayor a 0.
- Hibernate valida que las entidades coinciden con el schema.

Para cambios futuros: cada modificación de entidad requiere un nuevo script `V2__descripcion.sql`, `V3__...`, etc. Nunca modifiques un script ya aplicado — crea uno nuevo.

## Convenciones

- **Nombres:** `V<n>__<descripcion_en_snake_case>.sql`, p.ej. `V2__add_resenas_indices.sql`.
- **Orden:** cada servicio numera independientemente (V1, V2, V3 por servicio).
- **Versionado:** mantener los scripts en git; son parte del código.
- **Rollback:** Flyway no hace rollback automático. Si un V5 rompió algo, se escribe un V6 que corrige.

## Verificación

Una vez activo, confirma que el schema coincide con las entidades JPA:
```
GET /actuator/flyway
```
(requiere `management.endpoints.web.exposure.include=flyway` en el YAML).
