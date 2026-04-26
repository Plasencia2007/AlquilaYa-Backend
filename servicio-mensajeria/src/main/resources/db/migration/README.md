# Migraciones Flyway — servicio-mensajeria

Genera `V1__initial_schema.sql` antes de activar Flyway. Ver [docs/flyway.md](../../../../../../docs/flyway.md).

```bash
docker exec alquilaya-postgres pg_dump -U postgres -s --no-owner --no-privileges alquilaya_mensajeria \
  > V1__initial_schema.sql
```

Activar luego con `FLYWAY_ENABLED=true` + `HIBERNATE_DDL_AUTO=validate`.
