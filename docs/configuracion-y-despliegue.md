# Configuración y despliegue local

## Requisitos

- **Java 21** (Temurin u Oracle)
- **Maven 3.9+**
- **Node.js 20+** y npm
- **Docker Desktop** con docker-compose v2
- Cuenta de [Cloudinary](https://cloudinary.com/console)
- Cuenta de [Mercado Pago developers](https://www.mercadopago.com.pe/developers/panel/app)
- Cuenta de [ngrok](https://dashboard.ngrok.com/) (dominio reservado si es posible)
- WhatsApp Business o personal para escanear el QR de notificaciones

## Variables de entorno

Copiar [.env.example](../.env.example) a `.env` en la raíz y completar:

```bash
# BDs locales (docker)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<password-local>
MYSQL_USER=root
MYSQL_PASSWORD=<password-local>

# JWT — misma en usuarios, propiedades, catalogos, pagos
JWT_SECRET=<secreto-aleatorio-≥256-bits>
JWT_EXPIRATION=86400000

# Cloudinary (upload de imágenes)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Mercado Pago
MP_ACCESS_TOKEN=APP_USR-...
MP_PUBLIC_KEY=APP_USR-...
MP_NOTIFICATION_URL=https://<tu-dominio>.ngrok-free.dev/api/v1/pagos/webhook

# ngrok
NGROK_AUTHTOKEN=...
NGROK_DOMAIN=<tu-dominio>.ngrok-free.dev
```

> Estas variables las consume tanto `docker-compose.yml` como los YAML del config-server (a través de `${VAR}`).

## Levantar infraestructura (Docker)

```bash
docker compose up -d
```

Esto arranca:

| Contenedor | Puerto host |
|------------|-------------|
| `alquilaya-postgres` | 5433 |
| `alquilaya-mysql` | 3307 |
| `alquilaya-zookeeper` | 2181 |
| `alquilaya-kafka` | 9092 / 29092 |
| `alquilaya-ngrok` | 4040 (UI de ngrok) |

Verifica con `docker compose ps` que estén `healthy`.

**Scripts de init:**
- [database/init.sql](../database/init.sql) crea `alquilaya_propiedades` y `alquilaya_pagos`.
- [database/data.sql](../database/data.sql) seed inicial.
- [database/extra_permissions.sql](../database/extra_permissions.sql) permisos adicionales.

## Arranque rápido (recomendado)

Hay un script que levanta todo en ventanas cmd separadas respetando el orden correcto (discovery → config → resto):

```powershell
.\scripts\start-all.ps1           # todo: infra + Java + Node + frontend
.\scripts\start-all.ps1 -Minimal  # solo Java (sin Node ni frontend ni ngrok)
.\scripts\stop-all.ps1            # detiene servicios, deja Docker arriba
.\scripts\stop-all.ps1 -IncludeInfra  # detiene TODO incluido Docker
```

También funcionan por doble-click: `scripts\start-all.cmd` / `scripts\stop-all.cmd`.

Ver [scripts/README.md](../scripts/README.md) para todos los flags. Si preferís controlar cada servicio a mano, sigue el orden manual abajo.

## Orden de arranque (servicios Java) — manual

Cada servicio se arranca con `./mvnw spring-boot:run` desde su carpeta, o con IntelliJ/VSCode.

1. **discovery-server** (`:8761`) — debe estar UP antes que todo lo demás.
2. **config-server** (`:8888`) — los demás lo consultan al arrancar.
3. **api-gateway** (`:8080`)
4. Los servicios de dominio (orden libre, pero con config-server y discovery arriba):
   - `servicio-usuarios`
   - `servicio-propiedades` (:8082)
   - `servicio-pagos` (:8084)
   - `servicio-catalogos` (:8085)
   - `servicio-mensajeria` (:8086) — expone REST vía gateway + WebSocket STOMP directo en `/ws-mensajeria`.

Script de ayuda: [install.cmd](../install.cmd) (Windows) automatiza build/arranque.

## Servicio de notificaciones (Node.js)

```bash
cd servicio-notificaciones
npm install
npm start
```

La primera vez:
1. Aparece un QR en consola.
2. Abre WhatsApp → **Dispositivos vinculados** → Vincular.
3. Escanea el QR.
4. La sesión queda guardada por `LocalAuth`; próximos arranques no piden QR.

El servicio escucha en `:8081`. Si Kafka no está UP, reintenta hasta conectar.

## Frontend

```bash
cd AlquilaYa-Fronted
npm install
npm run dev
```

Frontend en `http://localhost:3000`. Ya apunta al gateway en `http://localhost:8080`.

## Verificación

Checks rápidos:

```bash
# Eureka — ver servicios registrados
curl http://localhost:8761/eureka/apps -H "Accept: application/json"

# Config server — traer config de un servicio
curl http://localhost:8888/servicio-usuarios/default

# Gateway health
curl http://localhost:8080/actuator/health

# Notificaciones
curl http://localhost:8081/api/v1/notifications/status
```

## Colección Postman

[postman/AlquilaYa_Universal_CRUD.postman_collection.json](../postman/AlquilaYa_Universal_CRUD.postman_collection.json) — importar en Postman. Configurar variable de entorno `base_url = http://localhost:8080` y `token` con el JWT devuelto por `/auth/login`.

## Problemas comunes

**Gateway responde 503 a todas las rutas.** El servicio destino no está registrado en Eureka. Revisa en `http://localhost:8761`.

**`Connection refused` al arrancar un servicio.** El config-server no está arriba. Recuerda que `discovery` y `config-server` van primero.

**Subir imagen falla con 401/403.** Revisar que `CLOUDINARY_*` estén en `.env` y que `Authorization: Bearer <JWT>` esté presente.

**Webhook Mercado Pago no llega.** Verifica que ngrok esté corriendo (`docker compose ps`), que `NGROK_DOMAIN` coincida con el `MP_NOTIFICATION_URL`, y que en el panel de MP la notificación apunte a la URL de ngrok.

**QR de WhatsApp expira.** Reinicia el servicio y escanea más rápido. Si se desincroniza mucho, borra la carpeta `.wwebjs_auth/` dentro de `servicio-notificaciones/` y vuelve a vincular.

**Reserva nunca pasa a `PAGADA` tras el pago.** Confirma que Kafka esté arriba y que `servicio-propiedades` esté consumiendo `pagos-topic` (logs de consumer).

## Producción — pendientes

- Validar firma `X-Signature` en el webhook de Mercado Pago.
- Mover JWT secret a un vault (HashiCorp Vault / AWS Secrets Manager).
- Reemplazar ngrok por dominio real con TLS.
- Persistencia externa de la sesión de whatsapp-web.js (hoy vive en disco local).
- Observabilidad: centralizar logs, métricas, trazas (OpenTelemetry).
- `servicio-mensajeria` está como skeleton; definir alcance antes de desplegarlo.
