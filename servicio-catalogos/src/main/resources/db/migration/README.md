# Migraciones Flyway — servicio-catalogos (MySQL)

Genera `V1__initial_schema.sql` antes de activar Flyway. Ver [docs/flyway.md](../../../../../../docs/flyway.md).

```bash
docker exec alquilaya-mysql mysqldump -uroot -p"$MYSQL_PASSWORD" \
  --no-data --routines --skip-comments alquilaya_catalogos \
  > V1__initial_schema.sql
```
