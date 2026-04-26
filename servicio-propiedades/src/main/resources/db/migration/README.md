# Migraciones Flyway — servicio-propiedades

Genera `V1__initial_schema.sql` antes de activar Flyway. Ver [docs/flyway.md](../../../../../../docs/flyway.md).

```bash
docker exec alquilaya-postgres pg_dump -U postgres -s --no-owner --no-privileges alquilaya_propiedades \
  > V1__initial_schema.sql
```
