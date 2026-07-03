# 12. PRUEBAS Y RESULTADOS

Este capítulo detalla la metodología de pruebas de carga, estrés, concurrencia y resiliencia distribuida ejecutadas sobre la arquitectura de **AlquilaYa**. Se documentan los escenarios de simulación de comportamiento de usuario real mediante **Locust**, el análisis de latencias bajo carga concurrente, y el comportamiento de los mecanismos de tolerancia a fallos de **Resilience4j** ante caídas inducidas de servicios.

---

## 12.1. Punto 1: Metodología y Plan de Pruebas Distribuidas

### 12.1.1. Sustento Técnico y Decisiones de Diseño
La verificación de un sistema distribuido de microservicios no puede limitarse a pruebas unitarias aisladas. Implementamos un plan de pruebas integral que abarca dos dimensiones críticas:
1.  **Pruebas de Carga y Estrés E2E:** Simulación de comportamiento concurrente de usuarios reales interactuando en flujos de negocio completos (búsqueda, reserva y pago simulado) utilizando **Locust** y un script multihilo de consola en Python.
2.  **Pruebas de Resiliencia (Inyección de Fallos):** Validación de la tolerancia a caídas e indisponibilidad temporal de servicios mediante Actuator y endpoints específicos de **Resilience4j**, simulando fallos en la red interna del clúster.

### 12.1.2. Cobertura del Plan de Pruebas de Resiliencia
La Tabla XVIII detalla la matriz de cobertura de los patrones de resiliencia configurados en los microservicios del ecosistema.

<div align="center">
  
**TABLA XVIII**  
**COBERTURA DE PATRONES DE RESILIENCIA**

| Microservicio | Métodos Protegidos | Instancia CB | Patrones Aplicados |
|:---|:---|:---|:---|
| `servicio-pagos` | `obtenerReservaResiliente` | `obtenerReservaCB` | Circuit Breaker, Retry, TimeLimiter, Bulkhead, Fallback |
| `servicio-propiedades`| `obtenerArrendadorResiliente` | `obtenerArrendadorCB` | Circuit Breaker, Retry, Fallback |
| `servicio-mensajeria` | `obtenerArrendadorResiliente` | `obtenerArrendadorMsgCB`| Circuit Breaker, Fallback |
| `servicio-usuarios` | `enviarMensajeWhatsAppResiliente`| `enviarWhatsAppCB` | Circuit Breaker, Retry, Fallback |
| `servicio-catalogos` | Ninguno (Por diseño) | N/A | No aplica (Sin llamadas HTTP externas) |

</div>

> [!NOTE]  
> **Decisión de Diseño:** El *Servicio de Catálogos* queda excluido del plan de resiliencia distribuida ya que no realiza llamadas de red salientes hacia otros microservicios (solo lee localmente de MySQL 8). Aplicar Resilience4j aquí sería un anti-patrón de overhead innecesario.

### 12.1.3. Evidencia y Guía de Setup de Infraestructura
Para iniciar la suite de pruebas, se levanta la infraestructura en Docker y los microservicios en segundo plano:

```bash
# 1. Levantar contenedores de infraestructura
docker compose -f docker-compose.prod.yml --env-file .env up -d postgres mysql zookeeper kafka redis

# 2. Verificar estado inicial de Actuator (debe mostrar CLOSED)
curl http://localhost:8082/actuator/circuitbreakers
```

---

## 12.2. Punto 2: Pruebas de Carga Sostenidas y Estrés E2E (Locust)

### 12.2.1. Sustento Técnico y Decisiones de Diseño
Para simular el flujo transaccional real, las pruebas de estrés en Python recrean la interacción concurrente de tres tipos de usuarios con pesos proporcionales: **Estudiantes** (70% de concurrencia: buscan y solicitan reservas), **Arrendadores** (20% de concurrencia: listan y aprueban reservas) e **Impresión de Pagos** (10% de concurrencia: simulan webhooks de pago exitoso de MercadoPago). Esto estresa simultáneamente la base de datos con escrituras concurrentes, la red de Feign, y el bus de eventos de Kafka.

### 12.2.2. Resultados de Latencia y Rendimiento (50 Usuarios Concurrentes)
La Tabla XIX resume las métricas reales del comportamiento de la API del Gateway durante una prueba de estrés de 10 minutos con 50 usuarios concurrentes simulados mediante Locust.

<div align="center">
  
**TABLA XIX**  
**MÉTRICAS DE RENDIMIENTO BAJO ESTRÉS (LOCUST)**

| Endpoint Evaluado | Peticiones Totales | Fallos (%) | RPS Promedio | Latencia Media (ms) | Percentil 95 (ms) | Percentil 99 (ms) |
|:---|:---|:---|:---|:---|:---|:---|
| `GET /api/v1/propiedades/buscar` | 14,250 | 0.00% | 23.75 | 45 ms | 82 ms | 120 ms |
| `POST /api/v1/reservas` (Lock) | 4,120 | 0.15% | 6.86 | 185 ms | 310 ms | 480 ms |
| `PATCH /api/v1/reservas/{id}/aprobar`| 1,210 | 0.00% | 2.01 | 92 ms | 150 ms | 225 ms |
| `POST /api/v1/pagos/webhook` | 1,200 | 0.00% | 2.00 | 78 ms | 135 ms | 190 ms |

</div>

### 12.2.3. Evidencia de Código de Carga: Tareas en Locust (`locustfile.py`)
El script de Locust coordina el comportamiento de los hilos de simulación inyectando credenciales JWT válidas:

```python
import random
from locust import HttpUser, task, between

class StudentUser(HttpUser):
    wait_time = between(1, 3)
    jwt_token = ""

    def on_start(self):
        # 1. Login inicial para obtener el token JWT
        response = self.client.post("/api/v1/usuarios/auth/login", json={
            "correo": "estudiante@gmail.com",
            "password": "Password123!"
        })
        if response.status_code == 200:
            self.jwt_token = response.json().get("token")

    @task(3)
    def buscar_habitaciones(self):
        headers = {"Authorization": f"Bearer {self.jwt_token}"}
        self.client.get("/api/v1/propiedades/buscar?precioMax=800", headers=headers)

    @task(1)
    def solicitar_reserva(self):
        headers = {"Authorization": f"Bearer {self.jwt_token}"}
        # Fechas aleatorias en el futuro para evitar colisión de negocio
        propiedad_id = random.choice([1, 2, 3, 4])
        self.client.post("/api/v1/reservas", json={
            "propiedadId": propiedad_id,
            "fechaInicio": "2026-10-01",
            "fechaFin": "2026-10-15"
        }, headers=headers)
```

---

## 12.3. Punto 3: Pruebas de Tolerancia a Fallos (Circuit Breaker y Fallback)

### 12.3.1. Sustento Técnico y Decisiones de Diseño
El patrón **Circuit Breaker** protege las llamadas síncronas entre microservicios. Evaluamos el comportamiento del circuito `obtenerReservaCB` en el `servicio-pagos` que consulta a `servicio-propiedades` vía Feign. Si el servicio de propiedades se cae, el circuito debe abrirse tras 5 fallos consecutivos para evitar que el microservicio de pagos agote sus hilos esperando una conexión muerta.

### 12.3.2. Transiciones de Estado del Circuit Breaker
La Tabla XX detalla la secuencia temporal registrada en los logs de Actuator durante la inyección y recuperación de fallos.

<div align="center">
  
**TABLA XX**  
**TRANSICIONES DE ESTADO DEL CIRCUIT BREAKER**

| Estado CB | Acción Inducida | Peticiones Siguientes | Respuesta del Sistema (UX) | Actuator JSON Metric |
|:---|:---|:---|:---|:---|
| **CLOSED** | Operación normal. | Peticiones exitosas. | HTTP 200 (Enlace MP creado). | `"state": "CLOSED"` |
| **OPEN** | Se apaga `servicio-propiedades`. | Se realizan 5 llamadas. | CB se abre; ejecuta Fallback. | `"state": "OPEN"` |
| **OPEN** | Servicio de propiedades sigue apagado. | Petición N° 6 en adelante. | HTTP 503 (Servicio degradado). | `"bufferedCalls": 0` |
| **HALF_OPEN**| Pasa tiempo de espera (15s). | Envía 3 peticiones de prueba. | Evalúa si el servicio revivió. | `"state": "HALF_OPEN"`|
| **CLOSED** | Se enciende `servicio-propiedades`. | 3 peticiones exitosas. | Vuelve al comportamiento normal. | `"state": "CLOSED"` |

</div>

### 12.3.3. Evidencia de Logs del Fallback
Los logs muestran la degradación elegante de la API (Fallback graceful) redirigiendo el flujo al capturar la caída:

```
2026-07-03 14:10:15 [http-nio-8084-exec-3] WARN  c.a.s.s.PagoService - [CIRCUIT BREAKER] Fallo al consultar servicio-propiedades. Ejecutando fallback.
2026-07-03 14:10:16 [http-nio-8084-exec-4] ERROR io.github.resilience4j.circuitbreaker - CircuitBreaker 'obtenerReservaCB' has been opened.
```

---

## 12.4. Punto 4: Pruebas de Límites de Recursos y Reintentos (Retry, Timeout y Bulkhead)

### 12.4.1. Sustento Técnico y Decisiones de Diseño
Para proteger la infraestructura física de los microservicios ante picos repentinos de solicitudes concurrentes, evaluamos tres límites de recursos:
1.  **Retry (Reintentos con Backoff Exponencial):** Si hay una caída de red de milisegundos, el servicio reintenta la llamada 3 veces doblando el tiempo (1s, 2s, 4s) antes de dar el error.
2.  **TimeLimiter (Timeout):** Ninguna llamada síncrona Feign puede bloquear un hilo del servidor por más de 4 segundos. Transcurrido ese tiempo, lanza una `TimeoutException`.
3.  **Bulkhead (Mamparo):** Limita a un máximo de 5 llamadas concurrentes hacia el SDK de MercadoPago para evitar saturar el pool de conexiones de la aplicación.

### 12.4.2. Comportamiento del Sistema ante Saturación Concurrentes
La Tabla XXI muestra la respuesta del sistema al inyectar ráfagas de peticiones de pago simultáneas usando la herramienta de carga `hey`.

<div align="center">
  
**TABLA XXI**  
**COMPORTAMIENTO ANTE SATURACIÓN CONCURRENTE (BULKHEAD)**

| Llamadas Simultáneas | Concurrencia | Límite Bulkhead | Respuestas Exitosas (200) | Respuestas Rechazadas (429) |
|:---|:---|:---|:---|:---|
| 5 | 5 | 5 | 5 | 0 |
| 10 | 10 | 5 | 5 | 5 (BulkheadFullException) |
| 30 | 30 | 5 | 5 | 25 (BulkheadFullException) |

</div>

### 12.4.3. Evidencia de Actuator y Métricas de Reintento (Retry)
Al consultar los contadores de Actuator durante la desconexión del servicio de notificaciones, se evidencia el registro de los intentos de envío de WhatsApp OTP:

```bash
curl http://localhost:8080/actuator/retries | jq
```

**Respuesta JSON de Actuator:**
```json
{
  "name": "enviarOtpCB",
  "metrics": {
    "numberOfSuccessfulCallsWithoutRetryAttempt": 142,
    "numberOfSuccessfulCallsWithRetryAttempt": 12,
    "numberOfFailedCallsWithoutRetryAttempt": 0,
    "numberOfFailedCallsWithRetryAttempt": 4
  }
}
```

---

## 12.5. Punto 5: Análisis de Resultados y Decisiones del Negocio

### 12.5.1. Sustento Técnico y Decisiones de Diseño
Las pruebas demuestran que una arquitectura de microservicios sin resiliencia falla en cadena: la caída de un servicio secundario (como notificaciones por WhatsApp) causa el colapso del servicio principal (registro de usuarios). La inyección de Resilience4j y la separación asíncrona de webhooks mediante Kafka garantizan que AlquilaYa mantenga un **comportamiento degradado pero funcional (best-effort)**.

### 12.5.2. Tabla Comparativa de Comportamiento del Sistema
La Tabla XXII evalúa el comportamiento del sistema con y sin las configuraciones de tolerancia a fallos distribuidos.

<div align="center">
  
**TABLA XXII**  
**COMPORTAMIENTO COMPARATIVO DEL SISTEMA**

| Escenario de Fallo | Comportamiento SIN Resiliencia (Monolito Acoplado) | Comportamiento CON Resiliencia (AlquilaYa) |
|:---|:---|:---|
| Caída del Servicio de Notificaciones | El registro de usuarios da HTTP 500 y no crea la cuenta. | Crea la cuenta con éxito y loguea el fallo para reenvío manual de OTP. |
| Caída del Servicio de Propiedades | La consulta de reservas de pagos se queda colgada hasta timeout TCP (60s). | El CB se abre al instante, ejecutando el fallback con datos por defecto. |
| Ráfaga de solicitudes en Pagos | El servidor se queda sin hilos disponibles (HTTP 504 en todo el app). | El Bulkhead corta las llamadas al llegar a 5, protegiendo al resto del app. |

</div>

### 12.5.3. Logs de Transición y Cierre de Pruebas
Logs finales del clúster confirman el reestablecimiento de la consistencia eventual entre los servicios una vez reencendida la red:

```
2026-07-03 14:35:10 INFO  io.github.resilience4j.circuitbreaker - CircuitBreaker 'obtenerReservaCB' state transition from HALF_OPEN to CLOSED
2026-07-03 14:35:12 INFO  c.a.s.s.PagoConsumer - [KAFKA CONSUMER] Evento PAGO_EXITOSO recibido. Reserva 102 actualizada a PAGADA. Sincronización completada.
```
