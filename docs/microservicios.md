# Microservicios

Detalle por cada servicio. Los YAML de configuración viven en `config-server/src/main/resources/config/` y se sirven por el config server en `:8888`.

---

## discovery-server

- **Puerto:** 8761
- **Rol:** Registro Eureka. Todos los servicios se registran al arrancar.
- **Dependencias clave:** `spring-cloud-starter-netflix-eureka-server`
- **Config:** [discovery-server/src/main/resources/application.properties](../discovery-server/src/main/resources/application.properties)
- **UI:** `http://localhost:8761` muestra el estado de los servicios registrados.

## config-server

- **Puerto:** 8888
- **Rol:** Configuración centralizada, perfil **nativo** (lee del classpath).
- **Dependencias clave:** `spring-cloud-config-server`, `spring-cloud-starter-netflix-eureka-client`
- **Archivos servidos:** [config-server/src/main/resources/config/](../config-server/src/main/resources/config/)
  - `application.yml` — defaults compartidos
  - `api-gateway.yml` — rutas, CORS, balanceo
  - `servicio-usuarios.yml`
  - `servicio-propiedades.yml`
  - `servicio-pagos.yml`
  - `servicio-catalogos.yml`
- **Uso:** cada servicio Java incluye `spring-cloud-starter-config` y lee `http://localhost:8888/{nombre}.yml` al arrancar.

## api-gateway

- **Puerto:** 8080
- **Rol:** Entrada única, routing dinámico por Eureka, CORS.
- **Dependencias clave:** `spring-cloud-starter-gateway-server-webmvc`, `spring-cloud-starter-loadbalancer`, `spring-cloud-starter-netflix-eureka-client`
- **Rutas (definidas en `api-gateway.yml`):**

| Path | Destino |
|------|---------|
| `/api/v1/usuarios/**` | `lb://servicio-usuarios` |
| `/api/v1/auth/**` | `lb://servicio-usuarios` |
| `/api/v1/propiedades/**` | `lb://servicio-propiedades` |
| `/api/v1/admin/propiedades/**` | `lb://servicio-propiedades` |
| `/api/v1/reservas/**` | `lb://servicio-propiedades` |
| `/api/v1/favoritos/**` | `lb://servicio-propiedades` |
| `/api/v1/resenas/**` | `lb://servicio-propiedades` |
| `/api/v1/catalogos/**` | `lb://servicio-catalogos` |
| `/api/v1/pagos/**` | `lb://servicio-pagos` |

- **CORS:** `http://localhost:*` en desarrollo.

---

## servicio-usuarios

- **Puerto:** aleatorio (`server.port=0`) — se accede vía gateway.
- **BD:** PostgreSQL — `postgres` (jdbc:postgresql://localhost:5433/postgres)
- **Rol:** autenticación JWT, registro con OTP WhatsApp, documentos de verificación, permisos granulares, perfiles de estudiante/arrendador.
- **Dependencias clave:**
  - `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, `spring-boot-starter-web`
  - `spring-kafka` (productor `user-approval-events`)
  - `io.jsonwebtoken:jjwt-api:0.11.5` + runtime + jackson
  - `spring-cloud-starter-openfeign` (opcional, llamadas salientes)
- **Config clave:**
  ```yaml
  jwt:
    secret: ${JWT_SECRET}
    expiration: ${JWT_EXPIRATION}
  notification:
    service:
      url: http://localhost:8081
  ```
- **Integraciones salientes:**
  - HTTP directo a `servicio-notificaciones` (`/api/v1/notifications/whatsapp/send-otp`)
  - Kafka producer → `user-approval-events` cuando el admin aprueba/rechaza documentos
- **Endpoints:** ver [api-endpoints.md](api-endpoints.md).

## servicio-propiedades

- **Puerto:** 8082
- **BD:** PostgreSQL — `alquilaya_propiedades`
- **Rol:** CRUD de propiedades, upload de imágenes a Cloudinary, gestión de reservas, favoritos, reseñas, validación geográfica (≤ 15 km de UPeU).
- **Dependencias clave:**
  - `spring-boot-starter-data-jpa`, `spring-boot-starter-security`
  - `spring-kafka` (productor `reserva-events`, consumidor `pagos-topic`)
  - `jjwt:0.11.5`
  - `com.cloudinary:cloudinary-http44:1.36.0`
  - `spring-cloud-starter-openfeign` + `spring-cloud-starter-circuitbreaker-resilience4j`
- **Config clave:**
  ```yaml
  cloudinary:
    cloud-name: ${CLOUDINARY_CLOUD_NAME}
    api-key: ${CLOUDINARY_API_KEY}
    api-secret: ${CLOUDINARY_API_SECRET}
  spring:
    kafka:
      template:
        default-topic: propiedades-topic
  feign:
    circuitbreaker:
      enabled: true
  ```
- **Integraciones:**
  - Feign → `servicio-usuarios` (datos de arrendador/estudiante, check de permisos)
  - Kafka producer → `reserva-events` en cada cambio de estado
  - Kafka consumer → `pagos-topic` para marcar reserva como `PAGADA`
- **Validación geográfica:** anotaciones `@CoordenadaLatitud`, `@CoordenadaLongitud` y cálculo haversine contra `(-11.9878, -76.8980)`.

## servicio-pagos

- **Puerto:** 8084
- **BD:** PostgreSQL — `alquilaya_pagos`
- **Rol:** generación de preferencias Mercado Pago Checkout Pro, recepción del webhook, persistencia de pagos, publicación a Kafka.
- **Dependencias clave:**
  - `spring-boot-starter-data-jpa`
  - `com.mercadopago:sdk-java:2.1.27`
  - `spring-kafka` (productor `pagos-topic`)
  - `spring-cloud-starter-openfeign`
- **Config clave:**
  ```yaml
  mercadopago:
    access-token: ${MP_ACCESS_TOKEN}
    public-key: ${MP_PUBLIC_KEY}
    back-urls:
      success: http://localhost:3000/pago/exito
      failure: http://localhost:3000/pago/fallo
      pending: http://localhost:3000/pago/pendiente
    notification-url: ${MP_NOTIFICATION_URL}   # URL ngrok
  ```
- **Integraciones:**
  - Feign → `servicio-propiedades` (datos de reserva para armar la preferencia)
  - Mercado Pago SDK para crear `Preference` y consultar `Payment`
  - Kafka producer → `pagos-topic` al confirmar pago
- **Pendiente:** validación de firma `X-Signature` del webhook (hoy confía en el payload).

## servicio-catalogos

- **Puerto:** 8085
- **BD:** MySQL 8 — `alquilaya_catalogos` (jdbc:mysql://localhost:3307/alquilaya_catalogos)
- **Rol:** listas configurables desde el admin: tipos de propiedad, períodos, servicios, reglas, zonas.
- **Dependencias clave:**
  - `spring-boot-starter-data-jpa`
  - `spring-boot-starter-cache`
  - `mysql-connector-j`
- **Config clave:**
  ```yaml
  spring:
    datasource:
      url: jdbc:mysql://localhost:3307/alquilaya_catalogos
  jwt:
    secret: ${JWT_SECRET}
  ```
- **Seed:** `DataInitializer` carga los items iniciales en el arranque si la tabla está vacía.

---

## servicio-notificaciones (Node.js)

- **Puerto:** 8081
- **Rol:** enviar mensajes WhatsApp (OTP, aprobaciones, eventos de reserva). No usa config-server ni Eureka.
- **Dependencias clave (package.json):**
  - `express` ^5.2.1
  - `whatsapp-web.js` ^1.34.6 (con `LocalAuth`)
  - `kafkajs` ^2.2.4
  - `qrcode`, `qrcode-terminal` (generación del QR inicial)
- **Arquitectura interna:**
  - `index.js` — arranca Express + cliente WhatsApp + Kafka consumer
  - `KafkaConsumer.js` — suscribe a `user-approval-events` y `reserva-events`
- **Endpoints HTTP expuestos (no pasan por el gateway):**

| Endpoint | Método | Uso |
|----------|--------|-----|
| `/api/v1/notifications/whatsapp/send-otp` | POST | Llamado por `servicio-usuarios` al registrar usuario |
| `/api/v1/notifications/whatsapp/send-message` | POST | Mensaje genérico |
| `/api/v1/notifications/status` | GET | Estado del cliente WhatsApp (conectado/desconectado) |

- **Primera vez:** al arrancar se genera un QR en terminal. Escanear desde WhatsApp → Dispositivos vinculados. La sesión queda guardada por `LocalAuth`.

## servicio-mensajeria

- **Puerto:** 8086
- **BD:** PostgreSQL — `alquilaya_mensajeria`
- **Rol:** chat in-app estudiante ↔ arrendador (complementa WhatsApp, no lo reemplaza). Una conversación por **tupla única** `(estudianteId, arrendadorId, propiedadId)` — distintos cuartos del mismo arrendador son hilos separados. Admin puede auditar todo y moderar (bloquear mensajes, suspender conversaciones).
- **Dependencias clave:**
  - `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, `spring-boot-starter-web`, `spring-boot-starter-validation`
  - `spring-boot-starter-websocket` (STOMP server + broker simple)
  - `spring-kafka`, `spring-cloud-starter-config`, `spring-cloud-starter-netflix-eureka-client`
  - `spring-cloud-starter-openfeign` + `spring-cloud-starter-circuitbreaker-resilience4j`
  - `jjwt 0.11.5`, `flyway-core` + `flyway-database-postgresql`
- **Integraciones:**
  - Feign → `servicio-usuarios` (enriquecer conversaciones con nombre de contraparte; fallback graceful)
  - Feign → `servicio-propiedades` (título de la propiedad en los listados)
  - Mismo `JWT_SECRET` que el resto para validar tokens en REST y en el CONNECT de STOMP.
- **Endpoints REST:** ver [api-endpoints.md](api-endpoints.md).
- **WebSocket STOMP:**
  - Endpoint HTTP de upgrade: `ws://host:8086/ws-mensajeria`. **NO pasa por el gateway** (ver [arquitectura.md](arquitectura.md)).
  - Auth: JWT en `connectHeaders` del frame CONNECT (validado por `WebSocketAuthInterceptor`).
  - Cliente envía a `/app/chat.enviar/{conversacionId}`.
  - Cliente se suscribe a `/user/queue/conversacion.{id}` (Spring resuelve `/user/*` al Principal, aísla mensajes por sesión).
  - Eventos adicionales en `/user/queue/conversacion.{id}.eventos` (MENSAJE_BLOQUEADO, CONVERSACION_SUSPENDIDA, MENSAJES_LEIDOS, etc.).
- **Autorización granular:** `ConversacionService.verificarAcceso(id, user)` — admin pasa directo; participantes se validan contra `estudianteId`/`arrendadorId` + rol del JWT. Invocado desde REST y desde el handler WS.
- **Moderación (admin):** `BLOQUEAR_MENSAJE`/`DESBLOQUEAR_MENSAJE`/`SUSPENDER_CONVERSACION`/`REACTIVAR_CONVERSACION`. Cada acción persiste en `moderacion_log` con admin email, motivo y timestamp.
