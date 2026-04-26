# Arquitectura

## Vista general

```
                          ┌──────────────────────┐
                          │    Frontend Next.js  │
                          │     (localhost:3000) │
                          └───┬──────────────┬───┘
          REST + JWT  ────────┘              └──── WebSocket (directo)
                              ▼                           │
                    ┌──────────────────────┐              │
                    │   API Gateway :8080  │              │
                    └──────────┬───────────┘              │
                               │ lb:// (load-balanced)    │
       ┌───────────────────────┼────────────────────┐     │
       ▼           ▼           ▼          ▼         ▼     │
   ┌───────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌─────────────┐
   │usuarios│ │propied.│  │ pagos  │  │catálogos│ │ mensajería  │◄┘
   │(random)│ │ :8082  │  │ :8084  │  │ :8085  │  │    :8086    │
   │JWT+OTP │ │Feign→us│  │MP+Kafka│  │ (MySQL)│  │REST + STOMP │
   └────┬───┘ └────┬───┘  └────┬───┘  └────┬───┘  └──────┬──────┘
        │          │           │           │             │
        └──────────┴───────────┴──────┬────┘             │
                                      │                  │
                       ┌──────────────┴─────────┐        │
                       ▼                        ▼        ▼
              ┌──────────────┐            ┌──────────┐ (PG)
              │  PostgreSQL  │            │  Kafka   │
              │    :5433     │            │  :9092   │
              │ (4 BDs lógicas)            └────┬─────┘
              └──────────────┘                  │
                                                ▼
              ┌──────────────┐        ┌────────────────────┐
              │    MySQL     │        │ notificaciones     │
              │    :3307     │        │    :8081 (Node)    │
              │  (catálogos) │        │ whatsapp-web.js    │
              └──────────────┘        └────────────────────┘

       Infraestructura Spring Cloud:
       ┌──────────────────┐    ┌──────────────────┐
       │ Discovery :8761  │    │  Config   :8888  │
       │    (Eureka)      │    │ (nativo fs)      │
       └──────────────────┘    └──────────────────┘
```

> **Nota WebSocket:** `servicio-mensajeria` expone dos interfaces: su REST pasa por el gateway como cualquier otro servicio, pero el canal STOMP (`ws://host:8086/ws-mensajeria`) **se conecta directo** al servicio. El gateway actual (`spring-cloud-starter-gateway-server-webmvc`, variante Servlet) no soporta proxy WebSocket; la variante reactiva sí lo haría. Deuda técnica para prod: migrar el gateway a reactivo o poner Nginx delante.

## Componentes

### Infraestructura Spring Cloud

- **discovery-server (Eureka, :8761)** — Todos los servicios se registran aquí. El gateway resuelve `lb://servicio-*` contra este registro.
- **config-server (:8888)** — Modo nativo. Sirve los `.yml` desde `config-server/src/main/resources/config/`. Cada servicio Java arranca con `spring.config.import=optional:configserver:`.
- **api-gateway (:8080)** — Punto de entrada único. Rutas definidas en `api-gateway.yml` del config-server. CORS habilitado para `http://localhost:*`.

### Microservicios de dominio

- **servicio-usuarios** — Autenticación (JWT), registro con OTP WhatsApp, gestión de documentos de verificación (DNI/RUC), permisos granulares. Expone endpoints Feign para que otros servicios consulten datos de arrendadores/estudiantes.
- **servicio-propiedades** — CRUD de propiedades (con upload a Cloudinary), reservas, favoritos, reseñas de propiedad y de arrendador. Consume `servicio-usuarios` vía Feign para enriquecer datos. Valida geolocalización contra UPeU (≤ 15 km).
- **servicio-pagos** — Genera preferencias de Mercado Pago Checkout Pro. Recibe webhook de confirmación, persiste el pago y publica a Kafka (`pagos-topic`) para que el resto del sistema reaccione.
- **servicio-catalogos** — Única base MySQL. Almacena listas configurables desde el admin: tipos de propiedad, períodos de alquiler, servicios incluidos, reglas, zonas. Cacheable.
- **servicio-mensajeria** — Chat in-app entre estudiante y arrendador con una conversación por propiedad. REST por el gateway; WebSocket STOMP (`ws://host:8086/ws-mensajeria`) directo al servicio. Autenticación JWT en el frame CONNECT. Admin puede auditar y moderar (bloquear mensajes, suspender conversaciones) con auditoría en `moderacion_log`.

### Canales asíncronos

- **Kafka (:9092)** — Event bus con estos tópicos:
  - `user-approval-events` — productor: `servicio-usuarios` | consumidor: `servicio-notificaciones`
  - `reserva-events` — productor: `servicio-propiedades` | consumidor: `servicio-notificaciones`
  - `pagos-topic` — productor: `servicio-pagos` | consumidor: `servicio-propiedades` (cambia reserva a `PAGADA`)
  - `propiedades-topic` — declarado, para futuros eventos de propiedades

### Servicios auxiliares

- **servicio-notificaciones (Node.js, :8081)** — Express + whatsapp-web.js + kafkajs. Escucha Kafka y expone endpoints HTTP (`/whatsapp/send-otp`, `/whatsapp/send-message`) usados directamente por `servicio-usuarios` para enviar OTP.
- **ngrok** — Túnel HTTPS en `docker-compose.yml` que expone el gateway (`host.docker.internal:8080`) con un dominio fijo (`NGROK_DOMAIN`) para el webhook de Mercado Pago.

## Comunicación entre servicios

### Síncrona (OpenFeign)

- `servicio-propiedades` → `servicio-usuarios` (datos de arrendador/estudiante, permisos)
- `servicio-pagos` → `servicio-propiedades` (detalles de reserva para generar preferencia)
- `servicio-mensajeria` → `servicio-usuarios` (nombres de contraparte para los listados del chat)
- `servicio-mensajeria` → `servicio-propiedades` (título de la propiedad contextual del hilo)

Propagación de JWT: `FeignClientConfig` inyecta el header `Authorization: Bearer <token>` en toda llamada Feign. Esto resolvió los 403 que había antes entre servicios.

### Asíncrona (Kafka)

- Disparadores: decisiones del admin sobre documentos, cambios de estado de reserva, confirmaciones de pago.
- Consumidor principal: `servicio-notificaciones`, que traduce eventos a mensajes WhatsApp con formato.

### Frontend → Backend

- REST: todo pasa por `:8080/api/v1/*`. El JWT se guarda en cookie `auth-token` y se inyecta via interceptor de Axios.
- WebSocket: el cliente `@stomp/stompjs` se conecta directo a `NEXT_PUBLIC_WS_URL` (default `ws://localhost:8086/ws-mensajeria`) y envía `Authorization: Bearer <jwt>` en `connectHeaders` del frame CONNECT.

## Persistencia

| BD | Motor | Puerto | Esquemas/DBs |
|----|-------|--------|--------------|
| PostgreSQL | 15 | 5433 | `postgres` (usuarios), `alquilaya_propiedades`, `alquilaya_pagos`, `alquilaya_mensajeria` |
| MySQL | 8.0 | 3307 | `alquilaya_catalogos` |

Cada microservicio Java usa su propio esquema lógico (sin compartir tablas). El init de Postgres está en `database/init.sql`.

## Decisiones de diseño

- **BD separadas por servicio** pero en motores compartidos para simplificar operación local.
- **Catálogos en MySQL** — aislados del resto por un tema arquitectónico (híbrido intencional). Permite demostrar integración multimotor.
- **Pagos desacoplado por Kafka** — el cambio de reserva a `PAGADA` no bloquea la respuesta del webhook; si el consumidor falla, el reintento es transparente.
- **Notificaciones como proceso Node separado** — `whatsapp-web.js` exige mantener una sesión de navegador viva; aislarlo del stack Java evita arrastrar esa complejidad a los servicios de dominio.
- **Puerto aleatorio en `servicio-usuarios`** — se accede siempre vía gateway (`lb://`), por lo que no necesita puerto fijo.
