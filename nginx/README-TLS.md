# TLS / HTTPS en el VPS real (S6)

Hoy la demo corre con **ngrok**, que ya da HTTPS (termina TLS en su edge y reenvía a `nginx:80`).
Por eso `nginx.conf` sólo escucha en `:80` y **no necesitas tocar nada para la demo**.

Cuando pases a un **VPS real con dominio propio**, activa TLS con `nginx-tls.conf`:

## 1. Requisitos
- Un dominio apuntando (registro **A**) a la IP del VPS.
- Puertos 80 y 443 abiertos.

## 2. Obtener certificados (Let's Encrypt, gratis)

Con certbot en modo webroot (recomendado, permite renovación sin downtime):

```bash
# En el VPS, con el stack levantado y nginx.conf (sólo :80) sirviendo /.well-known:
docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/www/certbot:/var/www/certbot \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d TU_DOMINIO.com --email tu-correo@ejemplo.com --agree-tos --no-eff-email
```

## 3. Activar `nginx-tls.conf`

En `docker-compose.prod.yml`, en el servicio `nginx`:

```yaml
  nginx:
    ports:
      - "80:80"
      - "443:443"          # <-- añadir
    volumes:
      - ./nginx/nginx-tls.conf:/etc/nginx/nginx.conf:ro   # <-- en vez de nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro              # <-- certificados
      - /var/www/certbot:/var/www/certbot                 # <-- reto ACME
```

Reemplaza `TU_DOMINIO.com` en `nginx-tls.conf` (2 sitios) por tu dominio real.

## 4. Verificar y recargar

```bash
docker exec alquilaya-nginx nginx -t      # valida sintaxis
docker exec alquilaya-nginx nginx -s reload
```

## 5. Renovación automática

Añade un cron/job que corra `certbot renew` (cada 60 días) y `nginx -s reload`.
Con webroot no hace falta parar nginx.

## Notas
- Con ngrok NO uses esta config (ngrok ya hace TLS); dejarías dos capas.
- La cabecera `HSTS` fuerza HTTPS en el navegador — actívala sólo cuando TLS ya funcione,
  o los usuarios no podrán volver a `http://` durante 1 año.
- El frontend detecta prod por el host (no-localhost) y usa `wss://` para el WebSocket
  automáticamente (ver `stomp-client.ts`, F1), así que el chat funciona bajo TLS sin cambios.
