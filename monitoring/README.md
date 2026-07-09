# Observabilidad — Prometheus + Grafana + Loki + Promtail (I3 / I4)

Stack de monitoreo **aditivo** para AlquilaYa. No toca ningún servicio existente:
solo agrega 4 contenedores en un compose separado que se **mergea** con el base.

- **I3** — Métricas: Prometheus scrapea `/actuator/prometheus` (ya expuesto por los 6
  servicios JVM) y las grafica en Grafana.
- **I4** — Logs + alertas: Promtail envía los logs de los contenedores a Loki
  (consultables en Grafana), y Prometheus evalúa reglas de alerta (`alerts.yml`).

## Componentes y puertos

| Componente | URL local | Rol |
|------------|-----------|-----|
| Grafana    | http://localhost:3001 | Dashboards + explorar logs (evita el :3000 del frontend Next) |
| Prometheus | http://localhost:9090 | Scrape de métricas + reglas de alerta (`/alerts`) |
| Loki       | http://localhost:3100 | Almacén de logs (se consulta desde Grafana, no directo) |
| Promtail   | (sin puerto)          | Recolecta logs de Docker → Loki |

**Credenciales Grafana por defecto:** `admin` / `admin` (te pedirá cambiarla al entrar).
Se pueden sobreescribir con `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` en `.env`.

## Cómo levantarlo

Desde la raíz del repo, **siempre mergeando** con el compose base (para compartir la
red `alquilaya-network` y alcanzar Zipkin por DNS):

```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d prometheus grafana loki promtail
```

Para levantar TODO (infra base + observabilidad):

```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

Bajar solo la observabilidad:

```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml down
```

> Los servicios JVM (usuarios, propiedades, pagos, catalogos, mensajeria, gateway) se
> arrancan como siempre (`.\scripts\start-all.ps1`). Prometheus los alcanza vía
> `host.docker.internal` porque en dev corren como **procesos del host**, no como
> contenedores (igual que hace el servicio `ngrok`).

## Qué se scrapea (dev)

Definido en [`prometheus/prometheus.yml`](prometheus/prometheus.yml):

- **Puerto fijo** (`host.docker.internal:<puerto>`): api-gateway 8080, propiedades 8082,
  pagos 8084, catalogos 8085, mensajeria 8086.
- **servicio-usuarios** (puerto **aleatorio**): vía **Eureka SD** contra
  `discovery-server:8761`. Prometheus descubre la instancia y reescribe la dirección a
  `host.docker.internal:<puerto_real>`. Requiere discovery + usuarios UP.
- **Zipkin**: contenedor de la red, `zipkin:9411/prometheus`.

Todas las métricas usadas en dashboards y alertas fueron **verificadas** contra el
`/actuator/prometheus` real de un servicio del stack. No hay nombres inventados.

## Dashboards

Auto-provisionado: **AlquilaYa → JVM & HTTP Overview**
([`grafana/dashboards/jvm-http-overview.json`](grafana/dashboards/jvm-http-overview.json)).
Paneles: servicios UP, heap %, CPU del proceso, req/s HTTP, 5xx/s, latencia media,
tasa de logs ERROR. Los datasources (Prometheus + Loki) también se auto-provisionan.

## Alertas

[`prometheus/alerts.yml`](prometheus/alerts.yml), visibles en Prometheus `/alerts`:

- **ServicioCaido** — `up == 0` durante 1m.
- **TasaError5xxAlta** — >5% de respuestas HTTP 5xx durante 5m.
- **HeapAlto** — heap JVM >90% del máximo durante 5m.
- **LogsErrorFrecuentes** — >0.2 logs ERROR/s durante 5m.
- **KafkaConsumerLagAlto** — *comentada*: no se pudo verificar el nombre de la métrica
  en vivo (los servicios consumidores no estaban corriendo). Verificar
  `kafka_consumer_fetch_manager_records_lag` en un consumidor y descomentar.

> Prometheus **evalúa** las alertas y las muestra en su UI. Para **enrutarlas**
> (email/Slack/PagerDuty) hay que agregar **Alertmanager** (otro contenedor + su
> config); se dejó fuera del alcance de I3/I4. Grafana también puede alertar sobre
> queries de Prometheus **y** de Loki desde su propio motor de alertas.

## Explorar logs (Loki)

Grafana → **Explore** → datasource **Loki**. Ejemplos LogQL:

```logql
{compose_project="alquilaya-backend"}                 # todo el stack
{container="alquilaya-kafka"}                          # un contenedor
{compose_service="zipkin"} |= "error"                  # filtrar por texto
```

Etiquetas disponibles: `container`, `compose_service`, `compose_project`, `stream`, `job`.

> **Nota dev:** Promtail recolecta logs de **contenedores Docker**. Los servicios JVM
> que corren como procesos del host **no** aparecen en Loki en dev (sus logs van a la
> consola de `start-all.ps1`). En **prod** (todo contenerizado) sí se recolectan todos.

## Apuntar a producción

En prod los servicios **sí** son contenedores (`docker-compose.prod.yml`). Ajustes:

1. **Targets Prometheus**: reemplazar `host.docker.internal:<puerto>` por el nombre del
   servicio en la red (`api-gateway:8080`, `servicio-propiedades:8082`, etc.). Si
   usuarios también corre contenerizado con puerto fijo, agregarlo como target estático
   y quitar el job `eureka-usuarios`.
2. **Retención**: subir `--storage.tsdb.retention.time` (Prometheus) y
   `retention_period` (Loki) según disco.
3. **Grafana**: fijar `GRAFANA_ADMIN_PASSWORD` fuerte (no el default), y considerar
   `GF_SERVER_ROOT_URL` detrás de nginx/TLS.
4. **Alertmanager**: agregar el contenedor + receptores para notificaciones reales.
5. **Seguridad**: no publicar 9090/3100 al exterior; exponer solo Grafana (idealmente
   detrás del reverse proxy con TLS).

## Volúmenes

`prometheus_data`, `grafana_data`, `loki_data` (nombrados, persistentes). Borrarlos:

```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml down -v
```
