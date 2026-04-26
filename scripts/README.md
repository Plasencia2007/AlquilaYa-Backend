# Scripts de arranque / detención — AlquilaYa

Scripts Windows que levantan todos los servicios con logs visibles y orden controlado.

**Detecta Windows Terminal automáticamente:**
- Si `wt.exe` está instalado → abre **una sola ventana** de Windows Terminal con una tab por servicio (recomendado).
- Si no → fallback a una ventana `cmd` por servicio (10 ventanas).

Si estás en Windows 11, Windows Terminal ya viene instalado. En Windows 10, instalá desde [Microsoft Store](https://aka.ms/terminal) (gratis) y al siguiente arranque el script lo detecta solo.

## Uso

### Arrancar todo

Doble-click (Windows) o desde consola:

```powershell
.\scripts\start-all.ps1
# o en cmd/Explorer:
.\scripts\start-all.cmd
```

Levanta en este orden:

1. **Infra Docker**: `postgres`, `mysql`, `zookeeper`, `kafka`, `ngrok`.
2. **discovery-server** :8761 → espera 20s.
3. **config-server** :8888 → espera 15s.
4. **Paralelo**: `api-gateway` :8080, `servicio-usuarios` (random), `servicio-propiedades` :8082, `servicio-pagos` :8084, `servicio-catalogos` :8085, `servicio-mensajeria` :8086.
5. **servicio-notificaciones** :8081 (Node).
6. **frontend** :3000 (Next.js).

### Flags útiles

```powershell
.\scripts\start-all.ps1 -Minimal        # solo servicios Java (sin node/frontend/ngrok)
.\scripts\start-all.ps1 -SkipDocker     # asume infra ya arriba (re-arranques rápidos)
.\scripts\start-all.ps1 -NoNgrok        # sin túnel MP
.\scripts\start-all.ps1 -NoFrontend     # sin Next.js
.\scripts\start-all.ps1 -NoNotifications
```

### Detener todo

```powershell
.\scripts\stop-all.ps1                  # detiene servicios, deja Docker arriba
.\scripts\stop-all.ps1 -IncludeInfra    # baja todo incluida la infra
```

## Notas

- Los `.cmd` son solo bootstrap — invocan PowerShell con `-ExecutionPolicy Bypass` para saltarse bloqueos.
- **servicio-usuarios** usa puerto aleatorio (`server.port=0`). El stop lo detecta por línea de comandos del `java.exe`.
- Si una ventana muestra errores de arranque (p.ej. "config-server not available"), espera unos segundos y reintenta — el orden secuencial en el script compensa la mayoría de races, pero en máquinas lentas puede necesitar más tiempo.
- Los tiempos de espera (20s discovery, 15s config) son conservadores; se pueden ajustar editando `start-all.ps1`.

## Requisitos

- Windows 10/11 con PowerShell 5.1+ (viene de fábrica).
- Docker Desktop con Compose v2.
- JDK 21 + `./mvnw` accesible en cada servicio (ya está).
- Node 20+ para servicio-notificaciones y frontend (`npm install` previo en cada uno).
