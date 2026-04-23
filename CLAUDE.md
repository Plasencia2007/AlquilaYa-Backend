# AlquilaYa — Contexto para Claude

## Qué es este sistema

Plataforma de alquiler de cuartos para estudiantes de la **Universidad Peruana Unión de Lima (UPeU)**. Los arrendadores son personas cercanas a la universidad que alquilan cuartos. Los estudiantes buscan cuartos desde la app sin tener que ir físicamente a buscarlos.

**Problema que resuelve:** Estudiantes perdían tiempo viajando cuarto por cuarto al inicio de clases para ver disponibilidad. AlquilaYa digitaliza esa búsqueda.

---

## Arquitectura actual

```
discovery-server     :8761   (Eureka)
config-server        :8888   (Configuración centralizada)
api-gateway          :8080   (Entrada única)
servicio-usuarios    :random (Auth, OTP WhatsApp, documentos, permisos)
servicio-propiedades :8082   (CRUD cuartos + Cloudinary + Reservas)
servicio-pagos       :8084   (Mercado Pago Checkout Pro + Kafka producer)
servicio-catalogos   :8085   (Gestión de filtros, servicios y reglas)
servicio-notificaciones :8081 (Node.js + whatsapp-web.js + Kafka consumer)
PostgreSQL           :5433   (docker - propiedades, pagos, usuarios)
MySQL                :3307   (docker - catalogos)
Kafka                :9092   (docker - eventos de pago y notificaciones)
```

---

## Logros Recientes y Bugs Corregidos (No tocar)

- **Migración a MySQL:** `servicio-catalogos` migrado de Postgres a MySQL 8 para arquitectura híbrida.
- **Integración Mercado Pago:** Generación de preferencias (links de pago) dinámica basada en reservas.
- **Propagación de JWT (Feign):** Implementado `FeignClientConfig` con interceptor para pasar el token Bearer en llamadas inter-servicios (solucionado 403 Forbidden).
- **Validación Geo-Distancia:** Implementada validación en `servicio-propiedades` que impide registrar/editar cuartos a más de 15km de la UPeU.
- **Flujo de Reservas:** Implementado estado de reserva `PAGADA` que se activa automáticamente vía Kafka cuando el servicio de pagos confirma una transacción.
- **Robustez de Checkout:** Manejo de datos de pagador por defecto en Mercado Pago para evitar fallos por emails/nombres vacíos.
- Login sin validación de password → corregido en `AuthController.java`
- KafkaConsumer.js desconectado → integrado en `index.js` del servicio-notificaciones
- URLs hardcodeadas localhost:8081 → usan `@Value` desde config-server

---

## Estado de Próximos Pasos

### ✅ COMPLETADOS (P1, P2, P4)
- **Servicio-Propiedades:** Campos avanzados, múltiples imágenes y lógica de reservas terminada.
- **Servicio-Catalogos:** MySQL configurado y carga de datos inicial funcionando.
- **Servicio-Pagos:** Integración con Mercado Pago y Webhook simulado terminada.

### ⏳ PENDIENTES (Prioridad Media/Baja)
- **P3 — Refactor de Servicio-Reservas:** Actualmente la lógica de reservas vive dentro de `servicio-propiedades`. Se podría extraer a un microservicio independiente si el volumen crece.
- **P5 — Notificaciones WhatsApp Reales:** Conectar el tópico `pagos-topic` de Kafka con el `servicio-notificaciones` de Node.js para avisar al arrendador por WhatsApp.
- **Seguridad Webhook:** Implementar validación de firmas `X-Signature` de Mercado Pago para producción.

---

## Coordenadas UPeU Lima
```
Latitud:  -11.9878 (Referencia Arrendador)
Longitud: -76.8980 (Referencia Arrendador)
Radio máximo: 15.0 KM
```

---

## Stack tecnológico

**Backend:** Java 21, Spring Boot 3.5.13, Spring Cloud 2025.0.2, PostgreSQL, MySQL 8, Kafka, JWT (jjwt 0.11.5), Cloudinary, OpenFeign
**Notificaciones:** Node.js + Express 5 + whatsapp-web.js + kafkajs
**Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zustand, Axios
**Infraestructura:** Docker (Postgres 16, MySQL 8, Kafka), Eureka, Config Server nativo
