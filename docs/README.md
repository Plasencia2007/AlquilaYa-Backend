# AlquilaYa — Documentación Técnica

Plataforma de alquiler de cuartos para estudiantes de la **Universidad Peruana Unión (UPeU) — Lima**. Arquitectura de microservicios con Spring Cloud + Node.js para mensajería WhatsApp.

## Índice

| Documento | Contenido |
|-----------|-----------|
| [arquitectura.md](arquitectura.md) | Diagrama del sistema, componentes, comunicación entre servicios |
| [microservicios.md](microservicios.md) | Detalle por cada microservicio: puerto, dependencias, responsabilidades |
| [api-endpoints.md](api-endpoints.md) | Referencia completa de endpoints REST |
| [base-de-datos.md](base-de-datos.md) | Modelo de datos: entidades, enums, relaciones |
| [flujos-de-negocio.md](flujos-de-negocio.md) | Registro, reserva, pago, notificaciones paso a paso |
| [configuracion-y-despliegue.md](configuracion-y-despliegue.md) | Variables de entorno, Docker, orden de arranque |
| [flyway.md](flyway.md) | Activación de migraciones Flyway antes de producción |
| [whatsapp-session.md](whatsapp-session.md) | Persistencia de la sesión WhatsApp para prod (LocalAuth → RemoteAuth) |

## Resumen ejecutivo

**Qué resuelve:** estudiantes UPeU perdían tiempo visitando cuartos al inicio del ciclo. AlquilaYa digitaliza la búsqueda, permite reservar en línea, pagar con Mercado Pago y notifica por WhatsApp a ambas partes.

**Roles:**
- `ESTUDIANTE` — busca, reserva, paga, deja reseñas
- `ARRENDADOR` — publica propiedades, aprueba/rechaza reservas
- `ADMIN` — aprueba documentos y propiedades, gestiona catálogos

**Stack:**
- Backend: Java 21, Spring Boot 3.5.13, Spring Cloud 2025.0.2
- Mensajería WhatsApp: Node.js + Express 5 + whatsapp-web.js + kafkajs
- Frontend: Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Zustand
- Datos: PostgreSQL 15, MySQL 8, Apache Kafka 7.4.0
- Infra: Docker Compose, Eureka, Spring Cloud Config (nativo), ngrok

## Servicios en un vistazo

| Servicio | Puerto | Rol | Tecnología |
|----------|--------|-----|------------|
| [discovery-server](../discovery-server/) | 8761 | Registro Eureka | Spring Cloud Netflix |
| [config-server](../config-server/) | 8888 | Configuración centralizada | Spring Cloud Config |
| [api-gateway](../api-gateway/) | 8080 | Entrada única + routing | Spring Cloud Gateway MVC |
| [servicio-usuarios](../servicio-usuarios/) | random | Auth, OTP, documentos, permisos | Spring Boot + JWT |
| [servicio-propiedades](../servicio-propiedades/) | 8082 | Propiedades, reservas, favoritos, reseñas | Spring Boot + Cloudinary + Feign |
| [servicio-pagos](../servicio-pagos/) | 8084 | Mercado Pago Checkout Pro + webhook | Spring Boot + Kafka producer |
| [servicio-catalogos](../servicio-catalogos/) | 8085 | Tipos, servicios, reglas, zonas | Spring Boot + MySQL |
| [servicio-notificaciones](../servicio-notificaciones/) | 8081 | WhatsApp + OTP + eventos | Node.js + whatsapp-web.js |
| [servicio-mensajeria](../servicio-mensajeria/) | 8086 | Chat in-app (REST + WebSocket STOMP) + moderación | Spring Boot + STOMP |

> **Nota WebSocket:** el frontend se conecta directo a `:8086/ws-mensajeria` (el gateway MVC no soporta proxy WS). REST del chat sí pasa por el gateway.

## Infraestructura local (Docker)

| Contenedor | Puerto host | Propósito |
|------------|-------------|-----------|
| `alquilaya-postgres` | 5433 | BD de usuarios, propiedades, pagos, mensajería |
| `alquilaya-mysql` | 3307 | BD de catálogos |
| `alquilaya-zookeeper` | 2181 | Dependencia de Kafka |
| `alquilaya-kafka` | 9092 / 29092 | Event streaming |
| `alquilaya-ngrok` | 4040 | Túnel HTTPS para webhooks de Mercado Pago |

## Cómo arrancar el sistema

**Rápido (Windows):**

```powershell
.\scripts\start-all.ps1            # levanta infra + Java + Node + frontend
.\scripts\start-all.ps1 -Minimal   # solo servicios Java
.\scripts\stop-all.ps1             # apaga todo
```

Ver [scripts/README.md](../scripts/README.md) y [configuracion-y-despliegue.md](configuracion-y-despliegue.md) para flags y despliegue manual paso a paso.

Orden mínimo si lo hacés a mano:

1. `docker compose up -d` (Postgres, MySQL, Kafka, ngrok)
2. `discovery-server` → `config-server` → resto de servicios Java
3. `servicio-notificaciones` (Node.js) — escanear QR la primera vez
4. Frontend: `cd AlquilaYa-Fronted && npm run dev`

## Cobertura geográfica

Las propiedades se validan contra **UPeU Lima** (lat `-11.9878`, lon `-76.8980`). Radio máximo: **15 km**. Fuera de ese radio, el servicio-propiedades rechaza el registro/edición.
