# Migraciones Flyway — servicio-usuarios

Genera `V1__initial_schema.sql` antes de activar Flyway. Ver [docs/flyway.md](../../../../../../docs/flyway.md).

```bash
docker exec alquilaya-postgres pg_dump -U postgres -s --no-owner --no-privileges postgres \
  > V1__initial_schema.sql
```
