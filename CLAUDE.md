# AlquilaYa — Contexto para Claude

## Qué es este sistema

Plataforma de alquiler de cuartos para estudiantes de la **Universidad Peruana Unión de Lima (UPeU)**. Los arrendadores son personas cercanas a la universidad que alquilan cuartos. Los estudiantes buscan cuartos desde la app sin tener que ir físicamente a buscarlos.

**Problema que resuelve:** Estudiantes perdían tiempo viajando cuarto por cuarto al inicio de clases para ver disponibilidad. AlquilaYa digitaliza esa búsqueda.

---

## Arquitectura actual

```
discovery-server  :8761   (Eureka)
config-server     :8888   (configuración centralizada)
api-gateway       :8080   (entrada única)
servicio-usuarios :random (auth, OTP WhatsApp, documentos, permisos)
servicio-propiedades :8082 (CRUD cuartos + Cloudinary)
servicio-notificaciones :8081 (Node.js + whatsapp-web.js + Kafka consumer)
Frontend Next.js  :3000
PostgreSQL        :5433   (docker)
Kafka             :9092   (docker)
```

---

## Usuarios y reglas clave

- **Sin login** → puede ver cuartos y detalles, pero NO el contacto del arrendador
- **Estudiante logueado** → ve contacto, puede reservar y pagar (MercadoPago)
- **Arrendador** → publica cuartos, gestiona reservas. Sus cuartos NO aparecen hasta que admin apruebe sus documentos
- **Admin** → aprueba arrendadores, modera cuartos, configura filtros dinámicos

---

## Bugs ya corregidos (no tocar)

- Login sin validación de password → corregido en `AuthController.java`
- KafkaConsumer.js desconectado → integrado en `index.js` del servicio-notificaciones
- URLs hardcodeadas localhost:8081 → usan `@Value` desde config-server
- System.out.println → reemplazados por `@Slf4j` en todos los servicios
- PermisoClient sin fallback → `PermisoClientFallback.java` creado
- PostgreSQL faltaba en docker-compose → agregado con volumen persistente
- Frontend: cookie JWT se guardaba antes del OTP → corregido en `servicioAuth.ts`

---

## Próximos pasos acordados (en orden de prioridad)

### P1 — Ampliar `servicio-propiedades`
Campos nuevos en `Propiedad`:
- `tipoPropiedad` (CUARTO_INDIVIDUAL, CUARTO_COMPARTIDO, DEPARTAMENTO, SUITE)
- `periodoAlquiler` (DIARIO, MENSUAL, SEMESTRAL, ANUAL)
- `area` (m²), `nroPiso`
- `estaDisponible` (boolean)
- `disponibleDesde` (LocalDate)
- `serviciosIncluidos` (List — valores vienen de servicio-catalogos)
- `reglas` (List — valores vienen de servicio-catalogos)
- `distanciaMetros` (calculada al guardar usando lat/lng de UPeU)
- `aprobadoPorAdmin` (boolean — admin aprueba antes de aparecer en búsqueda)
- `imagenes` → tabla separada `PropiedadImagen` (múltiples fotos en Cloudinary)

Endpoints nuevos:
- `GET /propiedades/buscar` con filtros (precio, tipo, servicios, disponibilidad)
- `GET /propiedades/{id}/publico` → sin contacto del arrendador
- `GET /propiedades/{id}/completo` → con contacto, requiere JWT
- `POST /propiedades/{id}/imagenes` → múltiples fotos
- `PATCH /propiedades/{id}/disponibilidad`
- `PATCH /admin/propiedades/{id}/aprobar`

### P2 — Nuevo `servicio-catalogos` (puerto 8085)
Filtros configurables desde admin: SERVICIO, TIPO_CUARTO, REGLA, PERIODO
- `GET /catalogos/filtros/activos` (público)
- CRUD admin de filtros

### P3 — Nuevo `servicio-reservas` (puerto 8083)
Estados: SOLICITADA → CONFIRMADA → ACTIVA → FINALIZADA | CANCELADA
Kafka para notificar cambios de estado por WhatsApp

### P4 — Nuevo `servicio-pagos` (puerto 8084)
MercadoPago: crear preferencia → link de pago → webhook de confirmación

### P5 — Eventos Kafka faltantes en `servicio-notificaciones`
Nueva solicitud de reserva, reserva confirmada, pago recibido, propiedad aprobada, cancelación

---

## Coordenadas UPeU Lima
```
Latitud:  -11.9878
Longitud: -76.8980
```
Todos los cuartos son cercanos a este punto. La distancia se calcula al guardar cada propiedad.

---

## Stack tecnológico

**Backend:** Java 21, Spring Boot 3.5.13, Spring Cloud 2025.0.2, PostgreSQL, Kafka, JWT (jjwt 0.11.5), Cloudinary, OpenFeign
**Notificaciones:** Node.js + Express 5 + whatsapp-web.js + kafkajs
**Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zustand, Axios
**Infraestructura:** Docker (PostgreSQL + Kafka), Eureka, Config Server nativo
