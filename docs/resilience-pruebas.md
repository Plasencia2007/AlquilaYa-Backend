# Guía de pruebas — Resilience4j (5 patrones)

Documento de apoyo para reproducir cada patrón de Resilience4j en los 4 microservicios donde fue implementado, y obtener las capturas que pide el profesor.

> **Cobertura aplicada:** servicio-pagos, servicio-propiedades, servicio-mensajeria, servicio-usuarios. `servicio-catalogos` queda fuera por diseño: no realiza llamadas salientes a otros servicios, por lo que aplicar Resilience4j sería artificial.

---

## Setup global

### 1. Levantar infraestructura
```bash
docker-compose up -d postgres mysql zookeeper kafka ngrok
```

### 2. Levantar microservicios (en orden)
1. `discovery-server` (Eureka, :8761)
2. `config-server` (:8888)
3. `servicio-usuarios` (puerto dinámico — ver Eureka)
4. `servicio-propiedades` (:8082)
5. `servicio-pagos` (:8084)
6. `servicio-mensajeria` (:8086)
7. `api-gateway` (:8080)

### 3. Verificar Actuator en cada servicio
```bash
curl http://localhost:8082/actuator/circuitbreakers   # propiedades
curl http://localhost:8084/actuator/circuitbreakers   # pagos
curl http://localhost:8086/actuator/circuitbreakers   # mensajeria
curl http://<usuarios-port>/actuator/circuitbreakers  # usuarios (puerto dinámico, ver Eureka)
```
Cada uno debe devolver JSON con sus instancias `*CB`.

---

## Capturas requeridas para el Word

### A — Configuración (1 captura por servicio)
Capturar el bloque `resilience4j` completo de cada YAML:
- `config-server/src/main/resources/config/servicio-pagos.yml` (instancia `obtenerReservaCB`)
- `config-server/src/main/resources/config/servicio-propiedades.yml` (3 instancias: `obtenerArrendadorCB`, `obtenerEstudianteCB`, `verificarPermisoCB`)
- `config-server/src/main/resources/config/servicio-mensajeria.yml` (3 instancias: `obtenerArrendadorMsgCB`, `obtenerEstudianteMsgCB`, `obtenerPropiedadMsgCB`)
- `config-server/src/main/resources/config/servicio-usuarios.yml` (2 instancias: `enviarWhatsAppCB`, `enviarOtpCB`)

### B — Código (método con las 5 anotaciones, 1 por servicio)
| Servicio | Archivo | Método |
|---|---|---|
| pagos | `PagoService.java` | `obtenerReservaResiliente` |
| propiedades | `PropiedadService.java` | `obtenerArrendadorResiliente` |
| mensajeria | `ConversacionService.java` | `obtenerArrendadorResiliente` |
| usuarios | `NotificationService.java` | `enviarMensajeWhatsAppResiliente` |

### C — Estado inicial (CLOSED)
```bash
curl http://localhost:8084/actuator/circuitbreakers | jq
```
Capturar JSON con `"state": "CLOSED"` para cada instancia.

### D — Endpoint de eventos
```bash
curl http://localhost:8084/actuator/circuitbreakerevents | jq
```
Capturar antes de las pruebas (lista vacía o con eventos previos).

---

## Pruebas funcionales por servicio

### 1. servicio-pagos (flujo principal)

**Patrón Fallback + CircuitBreaker:**
1. Crear una reserva pendiente (vía servicio-propiedades).
2. Apagar `servicio-propiedades`:
   ```bash
   docker stop servicio-propiedades   # o detener el proceso Java
   ```
3. Llamar 6 veces seguidas:
   ```bash
   curl -X POST http://localhost:8084/api/v1/pagos/preferencia \
        -H "Authorization: Bearer <JWT>" \
        -H "Content-Type: application/json" \
        -d '{"reservaId": <ID>}'
   ```
4. Logs muestran `[FALLBACK] obtenerReserva(...)`.
5. Después del 5° fallo: `curl /actuator/circuitbreakers` → `"state": "OPEN"` para `obtenerReservaCB`.
6. HTTP response: `503 SERVICE_UNAVAILABLE`.

**Patrón Recuperación (HALF_OPEN → CLOSED):**
1. Reencender servicio-propiedades.
2. Esperar 15s (waitDurationInOpenState).
3. Hacer 3 llamadas exitosas.
4. `curl /actuator/circuitbreakerevents` → ver transición `OPEN → HALF_OPEN → CLOSED`.

---

### 2. servicio-propiedades

**Patrón Fallback graceful:**
1. Apagar `servicio-usuarios`.
2. Llamar:
   ```bash
   curl http://localhost:8082/api/v1/propiedades/<id>/completo
   ```
3. La respuesta llega con `arrendador.nombre = "Arrendador"` (fallback default).
4. Log: `[FALLBACK] obtenerArrendador(...)`.
5. `/actuator/circuitbreakers` → `obtenerArrendadorCB` con `"state": "OPEN"` después de 5 fallos.

**Patrón verificarPermiso (fail-safe):**
1. Apagar `servicio-usuarios`.
2. Realizar acción autenticada que requiere permiso (ej. `POST /api/v1/propiedades`).
3. Resultado: `HTTP 403 FORBIDDEN` (fallback devuelve `false`).

---

### 3. servicio-mensajeria

**Patrón Fallback degradado:**
1. Apagar `servicio-usuarios`.
2. Llamar:
   ```bash
   curl http://localhost:8086/api/v1/mensajeria/conversaciones \
        -H "Authorization: Bearer <JWT>"
   ```
3. Las conversaciones llegan con nombres `"Arrendador"` / `"Estudiante"` por defecto.
4. La respuesta sigue funcionando (degradación graceful).
5. `/actuator/circuitbreakers` → `obtenerArrendadorMsgCB` y `obtenerEstudianteMsgCB` con métricas.

---

### 4. servicio-usuarios

**Patrón Fallback log-only:**
1. Apagar `servicio-notificaciones` (Node.js, :8081).
2. Login que dispara OTP:
   ```bash
   curl -X POST http://localhost:<port>/api/v1/auth/login \
        -d '{"email": "...", "password": "..."}'
   ```
3. El login completa exitosamente. Logs muestran:
   ```
   [FALLBACK] enviarOtp — ResourceAccessException: ... usuario podrá solicitar reenvío manualmente.
   ```
4. La transacción NO se rompe — comportamiento "best-effort".

---

## Pruebas específicas por patrón

### Patrón Retry
1. Habilitar logs DEBUG en `application.yml` del servicio:
   ```yaml
   logging:
     level:
       io.github.resilience4j.retry: DEBUG
   ```
2. Apagar/encender el servicio dependiente en ciclos rápidos.
3. Logs muestran: `Retry attempt 1/3, 2/3, 3/3` con espera exponencial (1s, 2s, 4s).
4. Endpoint:
   ```bash
   curl http://localhost:8084/actuator/retries | jq
   ```
   Capturar `successfulCallsWithRetryAttempt` y `failedCallsWithRetryAttempt`.

### Patrón Timeout
1. Añadir `Thread.sleep(8000)` temporal en el endpoint dependiente (rollback después).
   - Para probar pagos→propiedades, modificar `ReservaController.obtenerReserva` en servicio-propiedades.
2. Llamar al consumidor (`POST /api/v1/pagos/preferencia`).
3. Tras 4s: `TimeoutException` → HTTP `504 GATEWAY_TIMEOUT`.
4. Endpoint:
   ```bash
   curl http://localhost:8084/actuator/timelimiters | jq
   ```

### Patrón Bulkhead
1. Lanzar peticiones concurrentes (instalar `hey` o usar `ab`):
   ```bash
   hey -n 30 -c 30 -m POST \
       -H "Authorization: Bearer <JWT>" \
       -H "Content-Type: application/json" \
       -d '{"reservaId": <ID>}' \
       http://localhost:8084/api/v1/pagos/preferencia
   ```
2. `maxConcurrentCalls: 5` permite 5 simultáneas; el resto recibe `HTTP 429 TOO_MANY_REQUESTS`.
3. Endpoint:
   ```bash
   curl http://localhost:8084/actuator/bulkheads | jq
   ```
   Capturar `availableConcurrentCalls` (debería caer a 0 durante la ráfaga).

---

## Endpoints Actuator de referencia

| Endpoint | Qué muestra |
|---|---|
| `/actuator/circuitbreakers` | Estado actual (CLOSED/OPEN/HALF_OPEN) y configuración de cada CB |
| `/actuator/circuitbreakerevents` | Historial de eventos: SUCCESS, ERROR, STATE_TRANSITION |
| `/actuator/circuitbreakerevents/{name}` | Eventos de una instancia específica |
| `/actuator/circuitbreakerevents/{name}/{eventType}` | Filtra por tipo de evento |
| `/actuator/retries` | Contadores: successful, failed, with/without retry |
| `/actuator/retryevents` | Historial de eventos de Retry |
| `/actuator/bulkheads` | `availableConcurrentCalls`, `maxConcurrentCalls` |
| `/actuator/timelimiters` | Configuración de timeouts |
| `/actuator/health` | Salud general; los CB en OPEN bajan el `status` a DOWN |

---

## Estructura recomendada del Word

1. **Portada + introducción** — qué es Resilience4j y qué problema resuelve.
2. **Diagrama de arquitectura** — los 4 servicios con flechas de llamadas Feign / RestTemplate (incluir `servicio-catalogos` con nota "no aplica").
3. **Tabla de patrones aplicados** (1 fila por servicio):
   | Servicio | Métodos protegidos | Instancias CB |
   |---|---|---|
   | pagos | `obtenerReservaResiliente` | `obtenerReservaCB` |
   | propiedades | `obtenerArrendadorResiliente`, `obtenerEstudianteResiliente`, `verificarPermisoResiliente` | 3 instancias |
   | mensajeria | `obtenerArrendadorResiliente`, `obtenerEstudianteResiliente`, `obtenerPropiedadResiliente` | 3 instancias |
   | usuarios | `enviarMensajeWhatsAppResiliente`, `enviarOtpResiliente` | 2 instancias |
4. **Por cada servicio** (4 secciones):
   - Captura del YAML (sección A).
   - Captura del método con anotaciones (sección B).
   - Captura del JSON CLOSED → OPEN → HALF_OPEN → CLOSED.
   - Captura de logs del fallback.
   - Captura de la respuesta HTTP (Postman).
5. **Pruebas de patrones** (Retry, Timeout, Bulkhead) — capturas según secciones específicas.
6. **Conclusiones** — beneficios observados, comportamiento sin/con resilience.

---

## Decisión de diseño: servicio-catalogos sin Resilience4j

`servicio-catalogos` solo expone CRUD de MySQL para tipos, servicios, reglas y zonas. **No hace llamadas a otros microservicios**, por lo que no hay puntos de fallo distribuidos que proteger. Aplicar Resilience4j ahí sería un anti-patrón (overhead sin beneficio). En el Word se documenta esta decisión como parte del análisis de cobertura.
