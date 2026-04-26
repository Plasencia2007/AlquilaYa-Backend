# Persistencia de sesión de WhatsApp

`servicio-notificaciones` usa [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) con la estrategia **`LocalAuth`** — la sesión (cookies, tokens de `WhatsApp Web`) se guarda en disco local en `.wwebjs_auth/session/`. Esto funciona bien en dev pero **no es seguro ni escalable para producción**.

## Por qué hay que cambiarlo

1. **No sobrevive a redeploys** — al recrear el contenedor, el disco se resetea y el admin tiene que volver a escanear el QR.
2. **No escala a múltiples réplicas** — dos pods con la misma sesión pelean por el socket de WhatsApp Web y uno muere.
3. **Secretos en disco sin encriptación** — cualquiera con acceso al volumen puede impersonar la sesión.
4. **Backup/rotación manual** — si el contenedor se corrompe, hay que escanear el QR otra vez.

## Opciones

### Opción A (mínima) — Volumen Docker persistente

Ya está preparado en el [Dockerfile](../servicio-notificaciones/Dockerfile):

```dockerfile
VOLUME ["/home/app/.wwebjs_auth"]
```

En `docker-compose.yml` de producción:

```yaml
services:
  servicio-notificaciones:
    build: ./servicio-notificaciones
    volumes:
      - whatsapp_session:/home/app/.wwebjs_auth
volumes:
  whatsapp_session:
    driver: local
```

- ✅ Solución rápida, no requiere cambiar código.
- ⚠️ Solo funciona con **una única réplica** — no escala horizontalmente.
- ⚠️ El volumen debe respaldarse. Si se pierde, toca escanear QR otra vez.

### Opción B (recomendada para prod) — `RemoteAuth` con MongoDB

whatsapp-web.js expone `RemoteAuth` con adaptadores para persistir la sesión en backend externo.

1. Agregar deps:
   ```bash
   npm install wwebjs-mongo mongoose
   ```
2. Reemplazar `LocalAuth` por `RemoteAuth` en [index.js](../servicio-notificaciones/index.js):
   ```js
   const mongoose = require('mongoose');
   const { MongoStore } = require('wwebjs-mongo');
   const { RemoteAuth } = require('whatsapp-web.js');

   await mongoose.connect(process.env.WA_SESSION_MONGO_URI);
   const store = new MongoStore({ mongoose });

   const client = new Client({
     authStrategy: new RemoteAuth({
       store,
       clientId: 'alquilaya-notifications',
       backupSyncIntervalMs: 300000,
     }),
     puppeteer: { /* ... */ },
   });
   ```
3. Env var nueva en `.env`:
   ```
   WA_SESSION_MONGO_URI=mongodb://user:pass@mongo:27017/whatsapp_sessions
   ```
4. La sesión queda encriptada (MongoStore gestiona la serialización) y se carga automáticamente al arrancar el contenedor.

- ✅ Cualquier réplica puede levantar la misma sesión.
- ✅ Sobrevive a redeploys, rolling updates y migraciones.
- ⚠️ Solo **una réplica activa a la vez** puede estar conectada — usar un `Deployment` con `replicas: 1` y `strategy: Recreate` en Kubernetes, o bien un leader-election sobre las réplicas.

### Opción C — `RemoteAuth` con Redis

Igual que B pero con [wwebjs-redis-auth](https://www.npmjs.com/package/wwebjs-redis-auth). Útil si ya tienes Redis en la pila.

## Rotación / recuperación

Aun con persistencia externa, la sesión puede expirar (WhatsApp la revoca si no se conecta en ~14 días). Recomendaciones:

- **Monitor**: exponer `/api/v1/notifications/status` en un healthcheck. Si devuelve `{ready: false}` por más de X minutos, alertar al admin.
- **Plan B**: endpoint interno para regenerar el QR desde el panel admin cuando el status muestra `not ready` (hoy solo aparece en logs).
- **Logs del evento `disconnected`**: el reason indica por qué (`CONFLICT`, `LOGOUT`, `UNPAIRED`). Loggear a nivel WARN para que se vea en la agregación de logs.

## Decisión recomendada

- **Dev:** `LocalAuth` (actual) — sin cambios.
- **Staging/Preprod:** Opción A (volumen persistente) — validar que sobrevive reinicios.
- **Prod:** Opción B (RemoteAuth + Mongo) — antes del primer deploy real con usuarios.
