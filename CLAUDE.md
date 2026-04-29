# AlquilaYa — CLAUDE.md

## Proyecto
Sistema de alquiler de cuartos para estudiantes de **UPeU Lima**. Tres roles: `ESTUDIANTE`, `ARRENDADOR`, `ADMIN`.

## Stack
- **Backend:** Java 21, Spring Boot 3.5, Spring Cloud 2025, Maven
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zustand, Zod, Axios
- **Infraestructura:** Docker Compose — PostgreSQL 15 (:5433), MySQL 8 (:3307), Kafka (:9092), ngrok
- **Extras:** Node.js/Express (WhatsApp), Cloudinary (imágenes), MercadoPago Checkout Pro

## Servicios y puertos

| Servicio               | Puerto  | BD                          | Función principal                                    |
|------------------------|---------|-----------------------------|------------------------------------------------------|
| discovery-server       | 8761    | —                           | Eureka registry                                      |
| config-server          | 8888    | —                           | Config centralizada (`config-server/.../config/*.yml`) |
| api-gateway            | 8080    | —                           | Entrada única, rutas `lb://`, CORS                   |
| servicio-usuarios      | random  | PostgreSQL `postgres`       | JWT, OTP, Google OAuth, documentos, permisos         |
| servicio-propiedades   | 8082    | PostgreSQL `alquilaya_propiedades` | Propiedades, reservas, favoritos, reseñas, Cloudinary |
| servicio-pagos         | 8084    | PostgreSQL `alquilaya_pagos` | MercadoPago, webhook, Kafka producer                 |
| servicio-catalogos     | 8085    | MySQL `alquilaya_catalogos` | Tipos, períodos, servicios, reglas, zonas            |
| servicio-mensajeria    | 8086    | PostgreSQL `alquilaya_mensajeria` | Chat REST + WebSocket STOMP directo (no gateway)   |
| servicio-notificaciones | 8081   | —                           | Node.js, WhatsApp vía whatsapp-web.js, Kafka consumer |

## Orden de arranque

1. `docker compose up -d` — Postgres, MySQL, Kafka, ngrok
2. `discovery-server` — Eureka debe estar UP primero
3. `config-server`
4. `api-gateway`
5. Servicios de dominio (cualquier orden): usuarios, propiedades, pagos, catalogos, mensajeria
6. `cd servicio-notificaciones && npm start` — primera vez: escanear QR en WhatsApp
7. `cd AlquilaYa-Fronted && npm run dev` → http://localhost:3000

Script rápido (Windows): `.\scripts\start-all.ps1` | `.\scripts\stop-all.ps1`

## Variables de entorno

Copiar `.env.example` → `.env` en la raíz:

```env
POSTGRES_USER / POSTGRES_PASSWORD
MYSQL_USER / MYSQL_PASSWORD
JWT_SECRET=<≥256 bits, mismo secreto para todos los servicios>
JWT_EXPIRATION=86400000
CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
MP_ACCESS_TOKEN / MP_PUBLIC_KEY
MP_NOTIFICATION_URL=https://<dominio>.ngrok-free.dev/api/v1/pagos/webhook
NGROK_AUTHTOKEN / NGROK_DOMAIN
```

## Arquitectura de comunicación

```
Frontend :3000
  ├── REST → API Gateway :8080 → lb://servicio-* (via Eureka)
  └── WebSocket directo → servicio-mensajeria :8086/ws-mensajeria
```

- **Feign (sync):** propiedades→usuarios | pagos→propiedades | mensajeria→usuarios+propiedades
- **Kafka (async):** `user-approval-events` | `reserva-events` | `pagos-topic` | `propiedades-topic`
- **JWT:** mismo `JWT_SECRET` en todos. `FeignClientConfig` propaga el header `Authorization` en cada llamada Feign.

> El gateway es variante **Servlet MVC** (`spring-cloud-starter-gateway-server-webmvc`), no soporta proxy WebSocket. El WS STOMP conecta directo al :8086. Deuda técnica: migrar a gateway reactivo.

## Rutas del gateway (`/api/v1/...`)

| Path                          | Destino               |
|-------------------------------|-----------------------|
| `/usuarios/**`, `/auth/**`    | servicio-usuarios     |
| `/propiedades/**`, `/reservas/**`, `/favoritos/**`, `/resenas/**`, `/admin/propiedades/**` | servicio-propiedades |
| `/catalogos/**`               | servicio-catalogos    |
| `/pagos/**`                   | servicio-pagos        |
| `/mensajeria/**`, `/admin/mensajeria/**` | servicio-mensajeria |

## Estructura del frontend (`AlquilaYa-Fronted/src/`)

```
app/(public)/        home, búsqueda, detalle propiedad, reset-password
app/(private)/student/  dashboard, perfil, favoritos, mensajes, reservas
app/landlord/        dashboard, propiedades, mensajes, finanzas, perfil
app/admin-master/    catálogos, clientes, propiedades, finanzas, métricas
services/            capas de API (Axios)
stores/              Zustand: auth, modal, favoritos, historial, notificaciones, tema
schemas/             Zod: auth, perfil-estudiante, búsqueda, documentos
```

## Flujos principales

**Registro:** `POST /auth/register` → OTP WhatsApp → `POST /auth/verify-otp` → JWT

**Reserva:** crear (SOLICITADA) → arrendador aprueba (APROBADA) → pago MP (PAGADA via Kafka) → FINALIZADA

**Pago:** `POST /pagos/preferencia/{reservaId}` → `init_point` → MP webhook → Kafka `pagos-topic` → reserva=PAGADA
Dev only: `POST /pagos/simular-exito/{reservaId}` (omite MercadoPago)

**Chat:** `POST /mensajeria/conversaciones` (idempotente) → WS STOMP → `/app/chat.enviar/{id}` → `/user/queue/conversacion.{id}`

## Base de datos

FKs entre esquemas no están enforced en BD; se mantienen vía Feign y Kafka.

- **PostgreSQL :5433** — `postgres` (usuarios), `alquilaya_propiedades`, `alquilaya_pagos`, `alquilaya_mensajeria`
- **MySQL :3307** — `alquilaya_catalogos`
- Scripts init: `database/init.sql`, `data.sql`, `extra_permissions.sql`

## Problemas comunes

| Síntoma | Causa probable |
|---------|---------------|
| Gateway 503 | Servicio no registrado en Eureka → revisar http://localhost:8761 |
| `Connection refused` al arrancar | config-server no está UP; levantar discovery→config primero |
| Reserva no pasa a PAGADA | Kafka caído o servicio-propiedades no consume `pagos-topic` |
| Webhook MP no llega | ngrok no corre, o `NGROK_DOMAIN` ≠ `MP_NOTIFICATION_URL` |
| QR WhatsApp expiró | Reiniciar servicio-notificaciones; si persiste, borrar `.wwebjs_auth/` |
| 401/403 en subida de imagen | Faltan vars `CLOUDINARY_*` en `.env` o no se envía el JWT |

## Pendientes para producción

- Validar firma `X-Signature` en webhook de MercadoPago
- JWT secret → vault (HashiCorp Vault / AWS Secrets Manager)
- Migrar gateway a variante reactiva (habilitar proxy WebSocket)
- Reemplazar ngrok por dominio real con TLS
- Observabilidad: OpenTelemetry, logs y métricas centralizados
