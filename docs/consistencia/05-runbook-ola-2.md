# 05 — Runbook de Ola 2 (Outbox + Idempotencia + Envelope)

> Runbook operativo para validar, monitorear y rollback de la Ola 2. Lo usa **dev/ops** en el momento de mergear A1-A4, durante el smoke E2E de A5, y como referencia post-deploy.

## Mapa rápido

| BD                          | Tabla                | Rol                   |
|-----------------------------|----------------------|-----------------------|
| `postgres`                  | `outbox_events`      | productor (servicio-usuarios)   |
| `postgres`                  | `processed_events`   | consumer (resenas-topic)        |
| `alquilaya_propiedades`     | `outbox_events`      | productor (reserva-events, propiedades-topic, resenas-topic) |
| `alquilaya_propiedades`     | `processed_events`   | consumer (pagos-topic)          |
| `alquilaya_pagos`           | `outbox_events`      | productor (pagos-topic)         |
| `alquilaya_mensajeria`      | `processed_events`   | consumer (reserva-events, pagos-topic, user-approval-events) |

Conexión al cluster Postgres:

```bash
docker exec -it alquilaya-postgres psql -U postgres
# luego: \c <database>
```

Conexión al broker Kafka:

```bash
docker exec -it alquilaya-kafka bash
```

---

## 1. Métricas SQL (copy/paste)

### 1.1 Salud del outbox (corre en CADA BD productora)

```sql
-- Conteo global
SELECT
  COUNT(*)                                                   AS total,
  COUNT(*) FILTER (WHERE sent_at IS NULL)                    AS pendientes,
  COUNT(*) FILTER (WHERE sent_at IS NULL AND attempts >= 5)  AS stuck_dlq,
  COUNT(*) FILTER (WHERE sent_at IS NOT NULL)                AS publicados,
  MAX(created_at) FILTER (WHERE sent_at IS NULL)             AS pendiente_mas_reciente,
  MIN(created_at) FILTER (WHERE sent_at IS NULL)             AS pendiente_mas_antiguo
FROM outbox_events;
```

### 1.2 Eventos atascados (DLQ lógico) — disparar alarma si > 0

```sql
SELECT
  id, event_id, event_type, topic, aggregate_id,
  attempts, created_at, last_error
FROM outbox_events
WHERE sent_at IS NULL AND attempts >= 5
ORDER BY created_at ASC
LIMIT 50;
```

### 1.3 Latencia de publicación (P95 aproximada)

```sql
SELECT
  event_type,
  COUNT(*)                                              AS n,
  AVG(EXTRACT(EPOCH FROM (sent_at - created_at)))::int  AS avg_seg,
  MAX(EXTRACT(EPOCH FROM (sent_at - created_at)))::int  AS max_seg
FROM outbox_events
WHERE sent_at IS NOT NULL
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY event_type
ORDER BY n DESC;
```

> Objetivo: `max_seg < 10`. El scheduler corre cada 2s; latencias > 10s indican lag.

### 1.4 Pendientes "viejos" (red flag: scheduler no está corriendo)

```sql
SELECT COUNT(*) AS pendientes_mas_de_1min
FROM outbox_events
WHERE sent_at IS NULL
  AND attempts < 5
  AND created_at < NOW() - INTERVAL '1 minute';
```

> Si esta query devuelve > 0 sostenidamente: el `OutboxScheduler` del servicio no está activo (revisar `@EnableScheduling` o logs).

### 1.5 Idempotencia: ratio duplicados (corre en cada BD consumer)

```sql
SELECT
  consumer_name,
  COUNT(*)                                                              AS total_procesados,
  COUNT(*) FILTER (WHERE processed_at > NOW() - INTERVAL '1 hour')      AS ultima_hora
FROM processed_events
GROUP BY consumer_name
ORDER BY total_procesados DESC;
```

### 1.6 Purga de `processed_events` (TTL 30 días, ejecutar manual o por cron)

```sql
DELETE FROM processed_events
WHERE processed_at < NOW() - INTERVAL '30 days';
```

---

## 2. Alarmas recomendadas

| # | Métrica                                                              | Umbral       | Severidad | Acción                                                       |
|---|----------------------------------------------------------------------|--------------|-----------|--------------------------------------------------------------|
| 1 | `outbox_events WHERE sent_at IS NULL AND attempts >= 5`              | > 0          | CRÍTICA   | Inspeccionar `last_error`; ver §5 (DLQ lógico)               |
| 2 | `outbox_events WHERE sent_at IS NULL AND created_at < NOW()-1min`    | > 0 por 3min | ALTA      | Revisar logs del servicio: ¿scheduler corre? ¿Kafka UP?      |
| 3 | Latencia P95 `sent_at - created_at`                                  | > 10s        | MEDIA     | Throughput insuficiente: aumentar `BATCH_SIZE` o instancias  |
| 4 | Crecimiento neto de `outbox_events` (pendientes)                     | > 100/min    | MEDIA     | Productor más rápido que scheduler: revisar lag              |
| 5 | `processed_events` por consumer parado por > 10min en horario activo | sin filas    | MEDIA     | Consumer Kafka caído o sin tráfico                           |

Sugerencia de instrumentación (próxima ola): exponer `outbox_pending`, `outbox_stuck`, `processed_total` como métricas Prometheus en `/actuator/prometheus`.

---

## 3. Validación de envelope por topic (kafka-console-consumer)

> Todos los comandos asumen estar dentro del contenedor `alquilaya-kafka`. Los topics son strings literales — no se crean automáticamente si `auto.create.topics.enable=false` en el broker.

### 3.1 reserva-events

```bash
kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic reserva-events \
  --from-beginning \
  --max-messages 10 \
  --property print.key=true \
  --property print.headers=true \
  --property key.separator=" || "
```

Cada mensaje debe ser un JSON con `eventId`, `eventType`, `eventVersion`, `occurredAt`, `source=servicio-propiedades`, `aggregateType=Reserva`, `aggregateId`, `payload`. Validar con `jq`:

```bash
kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic reserva-events --from-beginning --max-messages 1 \
  | jq '{eventId, eventType, eventVersion, source, aggregateType, aggregateId}'
```

### 3.2 pagos-topic

```bash
kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic pagos-topic --from-beginning --max-messages 5
```

> Durante la transición pueden aparecer mensajes legacy `"PAGO_EXITOSO:123"` (string plano). Los consumers los procesan via `parseOrLegacy`. Tras Ola 4 todos los mensajes serán envelope.

### 3.3 user-approval-events / user-security-events

```bash
kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic user-approval-events --from-beginning --max-messages 5
kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic user-security-events --from-beginning --max-messages 5
```

### 3.4 propiedades-topic / resenas-topic

```bash
kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic propiedades-topic --from-beginning --max-messages 5
kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic resenas-topic    --from-beginning --max-messages 5
```

### 3.5 Validador rápido del envelope (one-liner)

```bash
kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic reserva-events --from-beginning --max-messages 20 \
  | jq -c 'select(.eventId == null or .eventType == null or .eventVersion == null or .occurredAt == null or .source == null or .aggregateType == null or .aggregateId == null or .payload == null) | "INVALIDO: " + tostring'
```

> Si sale vacío: todos los mensajes cumplen el envelope.

### 3.6 Conteo de mensajes legacy aún en cola (sirve para Ola 4)

```bash
kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic pagos-topic --from-beginning --max-messages 100 \
  | grep -E '^"?PAGO_(EXITOSO|RECHAZADO):' | wc -l
```

---

## 4. Smoke test E2E (paso a paso)

Pre-requisito: docker compose y todos los servicios arriba.

```bash
docker compose up -d
./scripts/start-all.ps1
```

### 4.1 USER_APROBADO (servicio-usuarios)

1. Login como ADMIN en http://localhost:3000.
2. Aprobar manualmente un usuario pendiente desde `/admin-master/clientes`.
3. Verificar outbox:

```sql
\c postgres
SELECT id, event_id, event_type, topic, sent_at, attempts
FROM outbox_events
ORDER BY id DESC LIMIT 5;
```

   Esperado: una fila con `event_type='USER_APROBADO'`, `topic='user-approval-events'`, `sent_at NOT NULL` en < 5s.

4. Verificar en Kafka:

```bash
kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic user-approval-events --from-beginning --max-messages 1 | jq .
```

5. Verificar idempotencia en mensajeria:

```sql
\c alquilaya_mensajeria
SELECT * FROM processed_events
WHERE consumer_name = 'mensajeria-user-approval-events'
ORDER BY processed_at DESC LIMIT 3;
```

6. Verificar notificación WhatsApp (revisar logs de servicio-notificaciones).

### 4.2 RESERVA_APROBADA (servicio-propiedades)

1. Como ESTUDIANTE, crear reserva sobre una propiedad aprobada.
2. Como ARRENDADOR de esa propiedad, aprobar la reserva.
3. Verificar outbox en propiedades:

```sql
\c alquilaya_propiedades
SELECT event_type, topic, sent_at, attempts, created_at
FROM outbox_events
ORDER BY id DESC LIMIT 5;
```

   Esperado: filas con `RESERVA_SOLICITADA` y luego `RESERVA_APROBADA`, todas con `sent_at NOT NULL`.

4. Verificar `@Version` incrementada:

```sql
SELECT id, estado, version FROM reservas ORDER BY id DESC LIMIT 5;
```

5. Verificar notificación STOMP/WhatsApp llegó al estudiante.

### 4.3 PAGO_EXITOSO (servicio-pagos → servicio-propiedades)

1. Con la reserva APROBADA, ejecutar el endpoint dev:

```bash
curl -X POST http://localhost:8080/api/v1/pagos/simular-exito/<reservaId> \
  -H "Authorization: Bearer <jwt-estudiante>"
```

2. Verificar outbox en pagos:

```sql
\c alquilaya_pagos
SELECT event_type, topic, sent_at, attempts FROM outbox_events ORDER BY id DESC LIMIT 5;
```

   Esperado: `PAGO_EXITOSO` con `sent_at NOT NULL`.

3. Verificar que servicio-propiedades consumió:

```sql
\c alquilaya_propiedades
SELECT consumer_name, COUNT(*) FROM processed_events GROUP BY consumer_name;
SELECT id, estado, version FROM reservas WHERE id = <reservaId>;
```

   Esperado: `estado = 'PAGADA'`, version incrementada.

4. Verificar que servicio-propiedades emite cascada `RESERVA_PAGADA`:

```sql
SELECT event_type, sent_at FROM outbox_events ORDER BY id DESC LIMIT 3;
```

### 4.4 Idempotencia (smoke)

Reproducir el mismo `eventId` dos veces:

```bash
kafka-console-producer.sh --bootstrap-server localhost:9092 --topic reserva-events <<'JSON'
{"eventId":"00000000-0000-0000-0000-000000000099","eventType":"RESERVA_APROBADA","eventVersion":1,"occurredAt":"2026-05-25T12:00:00Z","source":"servicio-propiedades","aggregateType":"Reserva","aggregateId":"999","payload":{"reservaId":999,"estado":"APROBADA"}}
JSON
```

Enviar dos veces. Luego:

```sql
\c alquilaya_mensajeria
SELECT * FROM processed_events
WHERE event_id = '00000000-0000-0000-0000-000000000099';
```

Esperado: exactamente **1 fila** (no 2).

### 4.5 Checklist global de smoke E2E

```sql
-- En cada BD productora (postgres, alquilaya_propiedades, alquilaya_pagos)
SELECT COUNT(*) AS stuck FROM outbox_events WHERE sent_at IS NULL AND attempts >= 5;
-- Esperado: 0

-- En cada BD consumer (postgres, alquilaya_propiedades, alquilaya_mensajeria)
SELECT COUNT(*) FROM processed_events;
-- Esperado: > 0 tras el smoke
```

```bash
# Verificación cruzada vía Kafka
for t in user-approval-events user-security-events reserva-events pagos-topic propiedades-topic resenas-topic; do
  echo "=== $t ==="
  kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic $t --from-beginning --max-messages 1 --timeout-ms 3000 | jq -c '{eventType, source, aggregateId}' 2>/dev/null
done
```

---

## 5. Procedimiento de rollback

Ola 2 es estructuralmente aditiva (nuevas tablas + columna `@Version`). Rollback completo = revertir código + dropear estructuras.

### 5.1 Rollback de código

```bash
# Revertir el merge de Ola 2 (PRs A1-A5)
git revert <commit-sha-A5> <commit-sha-A4> <commit-sha-A3> <commit-sha-A2> <commit-sha-A1>
# O bien, revertir todo el rango si fueron mergeados consecutivamente:
git log --oneline main | head -20    # localizar los SHAs
git revert <sha-oldest>..<sha-newest>
git push
```

> Tras revertir, redeploy de cada servicio. Los productores volverán a `kafkaTemplate.send(...)` directo.

### 5.2 Drop de tablas (sólo si el rollback de código no basta)

```sql
\c alquilaya_propiedades
ALTER TABLE propiedades DROP COLUMN IF EXISTS version;
ALTER TABLE reservas    DROP COLUMN IF EXISTS version;
DROP TABLE IF EXISTS processed_events;
DROP TABLE IF EXISTS outbox_events;
-- saga_reserva_pago se conserva (Ola 3); si también se rolea: DROP TABLE saga_reserva_pago;

\c alquilaya_pagos
ALTER TABLE pagos DROP COLUMN IF EXISTS version;
DROP TABLE IF EXISTS outbox_events;

\c alquilaya_mensajeria
DROP TABLE IF EXISTS processed_events;

\c postgres
DROP TABLE IF EXISTS processed_events;
DROP TABLE IF EXISTS outbox_events;
```

### 5.3 Rollback parcial (un solo servicio falla)

Si sólo un servicio tiene problemas:

1. Revertir el PR de ese agente (`git revert <sha-AX>`).
2. NO dropear DDLs — las otras 3 PRs siguen necesitándolas (`outbox_events`, `processed_events` son compartidas por BD).
3. Redeploy del servicio revertido.
4. Los otros servicios siguen operando con outbox/envelope.

### 5.4 Rollback de configuración Kafka (revertir `auto-offset-reset`)

Si la activación de `earliest` causa floods de reprocesamiento:

```yaml
# En servicio-propiedades.yml, servicio-mensajeria.yml, servicio-usuarios.yml
spring:
  kafka:
    consumer:
      auto-offset-reset: latest   # antes era earliest en Ola 2
```

Commit + restart del config-server + restart de los servicios afectados.

---

## 6. Señales tempranas de problema (los 30 minutos post-deploy)

| Síntoma                                                              | Diagnóstico probable                                          | Acción inmediata                                                  |
|----------------------------------------------------------------------|---------------------------------------------------------------|-------------------------------------------------------------------|
| `outbox_events` crece sin que `sent_at` se llene                     | Scheduler no activo / Kafka caído                             | Revisar logs del servicio (`Outbox publish fall...`); verificar `@EnableScheduling` |
| `attempts >= 5` en filas con el mismo `last_error`                   | Topic no existe en broker / serialización ruta                | Crear topic manual; revisar payload                                |
| `processed_events` vacío tras producir eventos                       | Consumer no escucha / `consumer_name` mismatch                | Revisar `@KafkaListener.topics`, `groupId`, `CONSUMER_NAME`        |
| `OptimisticLockException` en propiedades                             | Update concurrente (es lo esperado en algunas razas)          | El caller retry; si es masivo, revisar pattern del caller         |
| Logs `Evento <uuid> ya procesado, ignorado.` en alta frecuencia      | Reprocesamiento por reset offset                              | OK si es transitorio tras restart; alarma si > 5 min               |
| Notificaciones duplicadas para el usuario                            | Idempotencia mal implementada en consumer                     | Verificar `idempotency.marcarComoProcesado(...)` corre ANTES de la lógica |
| Reserva pasa a PAGADA dos veces (version diff)                       | Falta `@Version` o consumer no idempotente                    | Verificar columna `version` y `@KafkaListener @Transactional`     |
| Mensajes legacy `"PAGO_EXITOSO:123"` ignorados                       | parseOrLegacy mal cableado                                    | Revisar consumer cae a rama legacy correctamente                  |
| `events.legacy.received` no llega a 0 tras 1 semana                  | Algún productor aún emite formato viejo                       | Auditar productores por `kafkaTemplate.send(` directo             |

### 6.1 Logs útiles a tail

```bash
# servicio-propiedades (productor + consumer)
tail -f servicio-propiedades/logs/spring.log | grep -E "Outbox|Idempotency|RESERVA_|PAGO_"

# servicio-mensajeria (consumer)
tail -f servicio-mensajeria/logs/spring.log | grep -E "Idempotency|parseOrLegacy|Evento .* ya procesado"

# servicio-pagos (productor)
tail -f servicio-pagos/logs/spring.log | grep -E "Outbox|PAGO_"
```

### 6.2 Query de "sanity check" para correr cada 5 min las primeras horas

```sql
-- En cualquier BD productora
SELECT
  NOW()                                                                            AS now,
  COUNT(*) FILTER (WHERE sent_at IS NULL AND attempts >= 5)                        AS stuck,
  COUNT(*) FILTER (WHERE sent_at IS NULL AND created_at < NOW() - INTERVAL '1 min') AS lag,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 min')                    AS recientes
FROM outbox_events;
```

`stuck > 0` o `lag > 0` durante > 1 ciclo → escalar.

---

## 7. Cambios YAML aplicados en Ola 2 (referencia)

| Archivo                          | Cambio                                                              |
|----------------------------------|---------------------------------------------------------------------|
| `application.yml`                | + `enable-auto-commit: false`, + `isolation-level: read_committed`, + `listener.ack-mode: RECORD` |
| `servicio-propiedades.yml`       | + `spring.kafka.consumer.auto-offset-reset: earliest`              |
| `servicio-mensajeria.yml`        | + `spring.kafka.consumer.auto-offset-reset: earliest`              |
| `servicio-usuarios.yml`          | (ya tenía `auto-offset-reset: earliest`)                            |
| `servicio-pagos.yml`             | sin cambios — sólo productor, hereda `latest` global                |

> El default `auto-offset-reset: latest` se conserva en `application.yml` para que cualquier servicio futuro que no sobreescriba (caso pagos) tenga la política defensiva. Cada consumer real sobreescribe explícitamente.

---

## 8. Resumen one-liner para guardia

```text
1) ¿outbox_events con attempts >= 5?  ALARMA. Ver last_error.
2) ¿outbox_events con sent_at NULL > 1min?  Scheduler caído o Kafka caído.
3) ¿processed_events crece?  Consumers OK.
4) Para validar formato: kafka-console-consumer ... | jq '.eventId, .eventType'.
5) Rollback: git revert + opcional DROP de outbox/processed/version.
```
