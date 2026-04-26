# AlquilaYa — Contexto para Claude

## Qué es este sistema

Plataforma de alquiler de cuartos para estudiantes de la **Universidad Peruana Unión de Lima (UPeU)**. Los arrendadores son personas cercanas a la universidad que alquilan cuartos; los estudiantes buscan, reservan y pagan desde la app sin tener que ir físicamente a ver cada cuarto.

**Problema que resuelve:** los estudiantes perdían tiempo viajando cuarto por cuarto al inicio de clases. AlquilaYa digitaliza esa búsqueda y la reserva.

**Documentación extendida:** [docs/README.md](docs/README.md) (arquitectura, endpoints, modelo de datos, flujos, despliegue).

---

## Arquitectura actual

```
discovery-server        :8761    Eureka
config-server           :8888    Configuración centralizada (perfil nativo)
api-gateway             :8080    Entrada única (CORS + lb://)
servicio-usuarios       :random  Auth JWT, OTP WhatsApp, documentos, permisos
servicio-propiedades    :8082    CRUD cuartos + Cloudinary + reservas + reseñas
servicio-pagos          :8084    Mercado Pago Checkout Pro + webhook + Kafka producer
servicio-catalogos      :8085    Tipos, servicios, reglas, zonas (MySQL)
servicio-notificaciones :8081    Node.js + whatsapp-web.js + Kafka consumer
servicio-mensajeria     :8086    Chat in-app (REST + WebSocket/STOMP)

PostgreSQL  :5433   docker — usuarios / propiedades / pagos / mensajeria (esquemas separados)
MySQL       :3307   docker — catálogos
Kafka       :9092   docker — eventos de aprobación, reserva y pago
ngrok       :4040   docker — túnel HTTPS para webhook Mercado Pago
```

---

## Tópicos Kafka

| Tópico | Productor | Consumidor |
|--------|-----------|------------|
| `user-approval-events` | servicio-usuarios | servicio-notificaciones |
| `reserva-events` | servicio-propiedades | servicio-notificaciones |
| `pagos-topic` | servicio-pagos | servicio-propiedades (marca reserva como `PAGADA`) |
| `propiedades-topic` | servicio-propiedades | (declarado, sin consumidor aún) |

---

## Logros Recientes y Bugs Corregidos (No tocar)

- **Migración a MySQL:** `servicio-catalogos` migrado de Postgres a MySQL 8 (arquitectura híbrida intencional).
- **Integración Mercado Pago:** generación de preferencias dinámica basada en datos de la reserva.
- **Propagación de JWT (Feign):** `FeignClientConfig` inyecta `Authorization: Bearer <token>` en llamadas inter-servicios (corrigió 403 entre servicios).
- **Validación geo-distancia:** `servicio-propiedades` rechaza propiedades a más de 15 km de UPeU.
- **Flujo de reservas:** estado `PAGADA` se activa automáticamente vía Kafka cuando el servicio de pagos confirma el pago.
- **Robustez de Checkout:** defaults en email/nombre del `payer` para evitar fallos en Mercado Pago.
- **Login sin validación de password** → corregido en `AuthController.java`.
- **KafkaConsumer.js desconectado** → ahora se arranca desde `index.js` en servicio-notificaciones.
- **URLs hardcodeadas `localhost:8081`** → leídas con `@Value` desde config-server.

---

## Estado de Próximos Pasos

### Completados
- **servicio-propiedades** — campos avanzados, múltiples imágenes y reservas terminados.
- **servicio-catalogos** — MySQL configurado, seed inicial funcionando.
- **servicio-pagos** — integración Mercado Pago + webhook listos.
- **servicio-notificaciones** — consume `user-approval-events` y `reserva-events`, envía WhatsApp formateado.

### Pendientes
- **Refactor de servicio-reservas:** la lógica vive dentro de servicio-propiedades. Extraer a microservicio propio solo si el volumen crece.
- **WebSocket vía gateway:** el `api-gateway` es webmvc (no soporta proxy WS). El frontend conecta directo a `:8086/ws-mensajeria`. Migrar a gateway reactivo o a Nginx para prod (ver [docs/arquitectura.md](docs/arquitectura.md)).
- **Seguridad webhook:** validar firma `X-Signature` de Mercado Pago antes de producción.
- **Sesión WhatsApp persistente:** hoy `LocalAuth` guarda en disco local; migrar a storage externo para desplegar.

### Completado en esta iteración (mensajería)
- **servicio-mensajeria :8086** — chat in-app completo:
  - REST: `/api/v1/mensajeria/conversaciones` (crear/listar/detalle), `/.../mensajes` (enviar/listar/marcar-leida), `/api/v1/admin/mensajeria/**` (moderación).
  - WebSocket STOMP: `ws://host:8086/ws-mensajeria`. Cliente envía a `/app/chat.enviar/{id}`, recibe en `/user/queue/conversacion.{id}`.
  - Autorización: `ConversacionService.verificarAcceso` — admin pasa, participantes pasan, terceros reciben 403. Destinos `/user/*` aíslan mensajes por Principal.
  - Moderación: admin puede BLOQUEAR mensajes (ocultos a participantes, visibles a admin) y SUSPENDER conversaciones (bloquea envíos); cada acción queda en `moderacion_log`.
  - BD: `alquilaya_mensajeria` (Postgres). 3 tablas: `conversaciones` (UNIQUE estudiante+arrendador+propiedad), `mensajes`, `moderacion_log`.

---

## Coordenadas UPeU Lima

```
Latitud:      -11.9878
Longitud:     -76.8980
Radio máximo:  15.0 km
```

Validación en servicio-propiedades con anotaciones `@CoordenadaLatitud` / `@CoordenadaLongitud` + cálculo haversine.

---

## Stack tecnológico

**Backend:** Java 21, Spring Boot 3.5.13, Spring Cloud 2025.0.2, PostgreSQL 15, MySQL 8, Kafka 7.4.0, JWT (jjwt 0.11.5), Cloudinary, OpenFeign + Resilience4j.
**Notificaciones:** Node.js + Express 5 + whatsapp-web.js 1.34 + kafkajs 2.2.
**Frontend:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Zustand, Axios, React Hook Form + Zod, Leaflet.
**Infraestructura:** Docker Compose (Postgres 15, MySQL 8, Zookeeper, Kafka 7.4.0, ngrok), Eureka, Spring Cloud Config nativo.
