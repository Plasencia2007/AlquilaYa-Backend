# Análisis de la Arquitectura Backend - AlquilaYa

## 1. Visión General
El proyecto **AlquilaYa** (sistema de alquiler de cuartos para estudiantes) está diseñado bajo una arquitectura orientada a **Microservicios**. Este enfoque divide la aplicación en servicios pequeños, independientes y especializados, lo que permite que el equipo escale, despliegue y mantenga cada componente por separado sin afectar a todo el sistema.

---

## 2. Stack Tecnológico y su Justificación

### Backend Core
- **Java 21 & Spring Boot 3.5**: Proveen una base sólida, tipado fuerte y un vasto ecosistema empresarial ideal para construir sistemas robustos y mantenibles.
- **Spring Cloud 2025**: Es el estándar de facto en Java para gestionar patrones de microservicios (registro, configuración centralizada, enrutamiento).

### Bases de Datos
- **PostgreSQL 15**: Motor relacional principal usado por la mayoría de los servicios (Usuarios, Propiedades, Pagos, Mensajería). Se eligió por su alto cumplimiento del estándar ACID, fiabilidad en transacciones concurrentes (como el flujo de reservas) y excelente rendimiento.
- **MySQL 8**: Utilizado exclusivamente por el servicio de catálogos. Es útil para mantener datos tabulares simples y altamente cacheados.

### Mensajería y Eventos Asíncronos
- **Apache Kafka & Zookeeper**: Kafka actúa como el "sistema nervioso" del proyecto.
  - **Razón**: En lugar de que los servicios se bloqueen esperando respuestas de otros (acoplamiento fuerte), Kafka permite publicar eventos (ej. "Pago Recibido") para que los servicios interesados reaccionen en segundo plano. Esto otorga alta disponibilidad y tolerancia a fallos.

### Notificaciones y Tiempo Real
- **Node.js + whatsapp-web.js**: El servicio de notificaciones no usa Java. Se construyó en Node.js porque el ecosistema JavaScript cuenta con las librerías más estables y actualizadas para interactuar extraoficialmente con WhatsApp Web.
- **WebSocket (STOMP)**: Habilita una conexión bidireccional permanente entre el cliente y el servidor, requisito indispensable para el chat en tiempo real del servicio de Mensajería.

### Infraestructura y Herramientas Externas
- **Docker Compose**: Unifica la ejecución de todas las bases de datos, Kafka y utilidades (Ngrok) para garantizar que los entornos de desarrollo sean idénticos y fáciles de levantar.
- **Ngrok**: Expone los puertos locales a Internet. Fundamental para poder recibir los "webhooks" (notificaciones de eventos) desde MercadoPago.
- **Cloudinary**: Servicio en la nube para almacenamiento de imágenes (perfiles, fotos de propiedades), evitando sobrecargar la base de datos o el disco del servidor.
- **MercadoPago Checkout Pro**: Pasarela de pagos robusta y fácil de integrar en la región para procesar las transacciones de las reservas.

---

## 3. Componentes de la Arquitectura

### A. Servicios de Infraestructura (Spring Cloud)
Son los cimientos que permiten que los microservicios operen en conjunto:

1. **Discovery Server (Eureka - Puerto 8761)**
   - **Qué hace:** Es un directorio telefónico. Cada microservicio al arrancar se registra aquí.
   - **Por qué:** Permite que los servicios se comuniquen usando nombres (`servicio-usuarios`) en lugar de depender de direcciones IP estáticas que pueden cambiar si un servidor se reinicia o escala.

2. **Config Server (Puerto 8888)**
   - **Qué hace:** Centraliza los archivos de propiedades (`.yml`) de todos los microservicios.
   - **Por qué:** Evita tener contraseñas o configuraciones esparcidas en múltiples proyectos. Permite cambiar una configuración en un solo lugar y aplicarla globalmente.

3. **API Gateway (Puerto 8080)**
   - **Qué hace:** Es la puerta de entrada única al sistema. El frontend solo habla con el Gateway.
   - **Por qué:** Centraliza la seguridad (CORS), enruta las peticiones de forma inteligente (`lb://`) al microservicio correspondiente y actúa como balanceador de carga.

### B. Microservicios de Dominio (Lógica de Negocio)
Cada servicio tiene su propia base de datos (o esquema), respetando el principio de "Database-per-Service", lo que evita cuellos de botella globales.

1. **Servicio de Usuarios (Puerto Aleatorio)**
   - **Responsabilidad:** Autenticación (JWT, Google OAuth), registro, verificación de OTP (códigos por WhatsApp) y gestión de roles/permisos y documentos.
   
2. **Servicio de Propiedades (Puerto 8082)**
   - **Responsabilidad:** Es el corazón del negocio. Administra los inmuebles, reseñas, favoritos y el **flujo de reservas** (Solicitada -> Aprobada -> Pagada -> Finalizada).

3. **Servicio de Pagos (Puerto 8084)**
   - **Responsabilidad:** Interactuar con MercadoPago.
   - **Flujo:** Genera preferencias de pago y expone el webhook para que MercadoPago notifique cuándo un pago es exitoso.

4. **Servicio de Catálogos (Puerto 8085)**
   - **Responsabilidad:** Mantenimiento de catálogos maestros (tipos de zonas, servicios, reglas). Proveer de listas estáticas a los demás servicios y al frontend.

5. **Servicio de Mensajería (Puerto 8086)**
   - **Responsabilidad:** Proveer el chat entre Arrendador y Estudiante. Guarda el historial de conversaciones y expone el túnel WebSocket.

6. **Servicio de Notificaciones (Puerto 8081 - Node.js)**
   - **Responsabilidad:** Enviar mensajes vía WhatsApp (códigos de verificación, alertas de reserva). Actúa como un *Consumer* silencioso de Kafka.

---

## 4. ¿Cómo se comunican entre ellos?

Debido a que las bases de datos están separadas (no existen *Foreign Keys* entre ellas), los servicios deben comunicarse para armar el rompecabezas de la información. Utilizan dos estrategias:

### Comunicación Síncrona (Feign Clients)
- **Cuándo se usa:** Cuando un servicio necesita datos de otro **inmediatamente** para poder continuar.
- **Cómo funciona:** Realiza una petición REST interna (backend a backend).
- **Manejo de Seguridad:** Usa `FeignClientConfig` para clonar e inyectar el token JWT del usuario en la petición, asegurando que el microservicio de destino sepa quién está haciendo la solicitud.
- **Ejemplos:**
  - *Propiedades* pregunta a *Usuarios* los detalles del arrendador para armar el perfil de un inmueble.
  - *Pagos* pregunta a *Propiedades* de cuánto es el monto de la reserva antes de crear el ticket en MercadoPago.

### Comunicación Asíncrona (Apache Kafka)
- **Cuándo se usa:** Para notificar que "algo sucedió", sin importar cuánto tarden los demás en reaccionar.
- **Cómo funciona:** Un servicio envía un mensaje a un "tópico" (canal) de Kafka, y los servicios interesados lo leen.
- **Ejemplos Reales en el Proyecto:**
  - **Pago Exitoso:** Cuando MercadoPago avisa al *Servicio de Pagos* que se cobró correctamente, este emite el evento al tópico `pagos-topic`. El *Servicio de Propiedades* escucha esto y, de forma automática e independiente, cambia el estado de la reserva a "PAGADA".
  - **Notificaciones:** Cuando ocurre un cambio importante, se manda un evento a Kafka; el *Servicio de Notificaciones (Node.js)* lo consume y dispara el mensaje de WhatsApp.

---

## 5. Deuda Técnica y Consideraciones Finales
- **WebSocket vs API Gateway:** Actualmente, el frontend se conecta de forma *directa* al puerto 8086 (Mensajería) para los WebSockets, saltándose el Gateway. Esto se debe a que el Gateway usa el módulo MVC (`spring-cloud-starter-gateway-server-webmvc`), que no soporta proxies WebSocket eficientes. Una mejora a futuro es migrar el Gateway a un entorno **reactivo** (WebFlux).
- **Consistencia Eventual:** Al depender de Kafka, los datos se sincronizan con ligeros milisegundos de retraso. Esto es esperado y estándar en arquitecturas distribuidas, pero requiere un buen manejo de errores (ej. *Dead Letter Queues*) si un mensaje falla.
