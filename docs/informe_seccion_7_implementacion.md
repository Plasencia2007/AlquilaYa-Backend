# 7. IMPLEMENTACIÓN DE MICROSERVICIOS

Este capítulo detalla la implementación y codificación de los cinco microservicios de dominio de la plataforma **AlquilaYa**. Cada sección describe el sustento técnico de las decisiones tomadas, el catálogo estructurado de sus endpoints en formato de tabla, y la evidencia del código fuente que soporta las reglas lógicas más críticas del servicio.

---

## 7.1. Microservicio 1: Servicio de Usuarios (servicio-usuarios)

### 7.1.1. Sustento Técnico y Decisiones de Diseño
El microservicio `servicio-usuarios` implementa el aislamiento de los datos sensibles y perfiles de los usuarios. Utiliza **Spring Security** y **stateless JWT** para la autorización. La decisión clave de diseño fue delegar la verificación del segundo factor de autenticación (OTP) al servicio de notificaciones a través de WhatsApp, reduciendo así la carga operativa del microservicio y aislando la dependencia del navegador Puppeteer.

### 7.1.2. Interfaz de Comunicación y API Endpoints
La Tabla IV define el catálogo de endpoints expuestos por este microservicio a través del API Gateway.

<div align="center">
  
**TABLA IV**  
**ENDPOINTS DEL SERVICIO DE USUARIOS**

| Método | Path Relativo | Rol Requerido | Descripción |
|:---|:---|:---|:---|
| POST | `/api/v1/usuarios/auth/register` | Público | Registra inquilino/arrendador y dispara SMS/WhatsApp OTP. |
| POST | `/api/v1/usuarios/auth/verify-otp` | Público | Valida código OTP de 6 dígitos y activa la cuenta. |
| POST | `/api/v1/usuarios/auth/login` | Público | Autentica credenciales y emite el token JWT firmado (HS256). |
| POST | `/api/v1/usuarios/documentos/upload`| Autenticado | Sube fotos del DNI/RUC del arrendador hacia Cloudinary. |
| GET | `/api/v1/usuarios/documentos/admin/pending`| `ROLE_ADMIN` | Recupera documentos pendientes de aprobación por el admin. |

</div>

### 7.1.3. Evidencia de Código Crítico: Generación y Envío de OTP
El código implementado en `OtpService.java` genera de forma segura un código OTP temporal y lo despacha de forma asíncrona:

```java
package com.alquilaya.serviciousuarios.services;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {
    private static final int OTP_EXPIRATION_MINUTES = 5;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, OtpData> otpStorage = new ConcurrentHashMap<>();
    private final RestTemplate restTemplate = new RestTemplate();

    public String generarYEnviarOtp(String telefono) {
        String otp = String.format("%06d", secureRandom.nextInt(1000000));
        otpStorage.put(telefono, new OtpData(otp, LocalDateTime.now().plusMinutes(OTP_EXPIRATION_MINUTES)));
        
        String notificationUrl = "http://servicio-notificaciones:8081/api/v1/notifications/whatsapp/send-otp";
        Map<String, String> body = Map.of("telefono", telefono, "codigo", otp);
        
        try {
            restTemplate.postForEntity(notificationUrl, body, String.class);
        } catch (Exception e) {
            System.err.println("Fallo al enviar OTP por canal de WhatsApp: " + e.getMessage());
        }
        return otp;
    }

    public boolean validarOtp(String telefono, String codigoIntroducido) {
        OtpData data = otpStorage.get(telefono);
        if (data == null || LocalDateTime.now().isAfter(data.getExpiracion())) {
            otpStorage.remove(telefono);
            return false;
        }
        boolean esValido = data.getCodigo().equals(codigoIntroducido);
        if (esValido) otpStorage.remove(telefono);
        return esValido;
    }

    private static class OtpData {
        private final String codigo;
        private final LocalDateTime expiracion;
        public OtpData(String c, LocalDateTime e) {
            this.codigo = c;
            this.expiracion = e;
        }
        public String getCodigo() { return codigo; }
        public LocalDateTime getExpiracion() { return expiracion; }
    }
}
```

---

## 7.2. Microservicio 2: Servicio de Propiedades (servicio-propiedades)

### 7.2.1. Sustento Técnico y Decisiones de Diseño
Este microservicio es la lógica medular del negocio. Almacena las ofertas habitacionales y las reservas asociadas. Para resolver el problema de la sobreventa y la colisión de reservas concurrentes (Doble Reserva), implementa un bloqueo pesimista en base de datos. Adicionalmente, implementa validación geográfica a nivel de aplicación para filtrar que los alojamientos cumplan con la restricción de cercanía lineal (distancia $\le$ 15 km) respecto a la UPeU.

### 7.2.2. Interfaz de Comunicación y API Endpoints
La Tabla V especifica los endpoints que permiten la búsqueda de cuartos y la gestión del ciclo de vida de las reservas.

<div align="center">
  
**TABLA V**  
**ENDPOINTS DEL SERVICIO DE PROPIEDADES**

| Método | Path Relativo | Rol Requerido | Descripción |
|:---|:---|:---|:---|
| GET | `/api/v1/propiedades/buscar` | Público | Búsqueda filtrada por rango de precio, tipo, zona y geolocalización. |
| POST | `/api/v1/propiedades` | Arrendador | Registra propiedad y sube fotos directas a Cloudinary CDN. |
| POST | `/api/v1/reservas` | Estudiante | Crea una reserva en estado inicial SOLICITADA aplicando lock. |
| PUT | `/api/v1/reservas/{id}` | Arrendador | Aprueba, rechaza o finaliza una reserva de habitación. |

</div>

### 7.2.3. Evidencia de Código Crítico: Validación Haversine de Geolocalización
La validación geoespacial se realiza aplicando la fórmula matemática de Haversine calculada contra las coordenadas del campus central de Ñaña `(-11.9878, -76.8980)`:

```java
package com.alquilaya.serviciopropiedades.services;

import org.springframework.stereotype.Service;

@Service
public class GeofilterService {
    private static final double UPEU_LATITUDE = -11.9878;
    private static final double UPEU_LONGITUDE = -76.8980;
    private static final double EARTH_RADIUS_KM = 6371.0;
    private static final double MAX_ALLOWED_DISTANCE_KM = 15.0;

    public boolean estaDentroDelRangoPermitido(double latitud, double longitud) {
        double distancia = calcularDistanciaHaversine(UPEU_LATITUDE, UPEU_LONGITUDE, latitud, longitud);
        return distancia <= MAX_ALLOWED_DISTANCE_KM;
    }

    private double calcularDistanciaHaversine(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_KM * c;
    }
}
```

---

## 7.3. Microservicio 3: Servicio de Pagos (servicio-pagos)

### 7.3.1. Sustento Técnico y Decisiones de Diseño
El servicio de pagos desacopla el flujo crítico de MercadoPago. Su arquitectura se basa en la comunicación asíncrona mediante **Apache Kafka** para garantizar la consistencia eventual: cuando el webhook de MercadoPago confirma una transacción exitosa, el servicio persiste la orden localmente y emite un evento `PAGO_EXITOSO` en `pagos-topic`. El servicio de propiedades consume este evento para actualizar la reserva a `PAGADA`, evitando acoplamiento síncrono.

### 7.3.2. Interfaz de Comunicación y API Endpoints
La Tabla VI muestra las firmas expuestas por el microservicio de pagos.

<div align="center">
  
**TABLA VI**  
**ENDPOINTS DEL SERVICIO DE PAGOS**

| Método | Path Relativo | Rol Requerido | Descripción |
|:---|:---|:---|:---|
| POST | `/api/v1/pagos/preferencia/{reservaId}`| Estudiante | Genera preferencia de cobro y retorna link de Checkout Pro. |
| POST | `/api/v1/pagos/webhook` | Público | Webhook asíncrono invocado por la pasarela MercadoPago. |
| POST | `/api/v1/pagos/simular-exito/{reservaId}`| Dev/Test | Simula localmente un pago exitoso sin pasar por MercadoPago. |

</div>

### 7.3.3. Evidencia de Código Crítico: Creación de Preferencia MercadoPago
La integración del SDK para instanciar el túnel de cobro seguro se realiza de la siguiente manera:

```java
package com.alquilaya.serviciopagos.services;

import com.mercadopago.MercadoPagoConfig;
import com.mercadopago.client.preference.*;
import com.mercadopago.resources.preference.Preference;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.List;

@Service
public class PaymentGatewayService {

    public PaymentGatewayService(@Value("${mercadopago.access-token}") String accessToken) {
        MercadoPagoConfig.setAccessToken(accessToken);
    }

    public String crearEnlacePago(Long reservaId, BigDecimal montoTotal, String tituloInmueble) throws Exception {
        PreferenceClient client = new PreferenceClient();

        PreferenceItemRequest item = PreferenceItemRequest.builder()
                .id(reservaId.toString())
                .title("Reserva AlquilaYa: " + tituloInmueble)
                .quantity(1)
                .unitPrice(montoTotal)
                .currencyId("PEN")
                .build();

        PreferenceBackUrlsRequest backUrls = PreferenceBackUrlsRequest.builder()
                .success("http://localhost/pago/exito")
                .failure("http://localhost/pago/fallo")
                .pending("http://localhost/pago/pendiente")
                .build();

        PreferenceRequest request = PreferenceRequest.builder()
                .items(List.of(item))
                .backUrls(backUrls)
                .notificationUrl("https://plop-sabotage-roamer.ngrok-free.dev/api/v1/pagos/webhook")
                .autoReturn("approved")
                .expires(true)
                .expirationDateTo(java.time.OffsetDateTime.now().plusDays(1))
                .build();

        Preference preference = client.create(request);
        return preference.getInitPoint();
    }
}
```

---

## 7.4. Microservicio 4: Servicio de Mensajería (servicio-mensajeria)

### 7.4.1. Sustento Técnico y Decisiones de Diseño
Para proveer comunicación síncrona y fluida entre inquilinos y arrendadores, se implementó un túnel de chat en tiempo real utilizando **WebSockets y STOMP**. El servicio se expone directamente en el puerto dedicado `8086` (sin pasar por el Gateway MVC de Spring Cloud, debido a que éste se basa en Servlets y no gestiona eficientemente WebSockets). El servicio también incluye APIs administrativas para la auditoría y moderación del contenido de los mensajes.

### 7.4.2. Interfaz de Comunicación y API Endpoints
La Tabla VII clasifica los endpoints REST y destinos WebSocket expuestos por este microservicio.

<div align="center">
  
**TABLA VII**  
**ENDPOINTS Y DESTINOS DEL SERVICIO DE MENSAJERÍA**

| Canal / Tipo | Ruta / Dirección | Acceso | Descripción |
|:---|:---|:---|:---|
| HTTP / REST | `/api/v1/mensajeria/conversaciones` | Autenticado | Obtiene la bandeja de entrada con chats del usuario. |
| WS Handshake | `ws://localhost:8086/ws-mensajeria` | Autenticado | Punto de conexión para el apretón de manos WebSocket. |
| STOMP Send | `/app/chat.enviar/{conversacionId}` | Autenticado | Destino del cliente para enviar un mensaje nuevo. |
| STOMP Subscribe| `/user/queue/conversacion.{id}` | Autenticado | Suscripción de sesión aislada para recibir mensajes. |

</div>

### 7.4.3. Evidencia de Código Crítico: Interceptor de Sesión WebSocket JWT
La validación del token de seguridad en la conexión síncrona se efectúa decodificando las cabeceras nativas del frame `CONNECT` de STOMP:

```java
package com.alquilaya.serviciomensajeria.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.messaging.*;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {
    private final String jwtSecret;

    public WebSocketAuthInterceptor(String secret) {
        this.jwtSecret = secret;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            List<String> authHeader = accessor.getNativeHeader("Authorization");
            if (authHeader != null && !authHeader.isEmpty()) {
                String token = authHeader.get(0);
                if (token.startsWith("Bearer ")) token = token.substring(7);
                try {
                    Claims claims = Jwts.parserBuilder()
                            .setSigningKey(jwtSecret.getBytes())
                            .build()
                            .parseClaimsJws(token)
                            .getBody();
                    
                    String usuarioId = claims.getSubject();
                    String rol = claims.get("rol", String.class);
                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        usuarioId, null, List.of(() -> rol)
                    );
                    accessor.setUser(auth);
                } catch (Exception e) {
                    throw new MessageDeliveryException("Fallo de autenticación: firma JWT inválida.");
                }
            } else {
                throw new MessageDeliveryException("Falta cabecera de autenticación WebSocket.");
            }
        }
        return message;
    }
}
```

---

## 7.5. Microservicio 5: Servicio de Catálogos (servicio-catalogos)

### 7.5.1. Sustento Técnico y Decisiones de Diseño
El servicio de catálogos gestiona las opciones maestras de la aplicación. Para demostrar la consistencia y la integración multimotor, este servicio utiliza **MySQL 8** (aislado de PostgreSQL). Dado que son datos tabulares simples y poco propensos a cambiar (como zonas o servicios de habitación), implementa una estrategia de caché interna a nivel de servicio (`Spring Cache`) para optimizar el rendimiento y disminuir latencias de respuesta.

### 7.5.2. Interfaz de Comunicación y API Endpoints
La Tabla VIII detalla los endpoints REST expuestos para leer y poblar catálogos.

<div align="center">
  
**TABLA VIII**  
**ENDPOINTS DEL SERVICIO DE CATÁLOGOS**

| Método | Path Relativo | Rol Requerido | Descripción |
|:---|:---|:---|:---|
| GET | `/api/v1/catalogos/activos` | Público | Lista catálogos cargados en caché. |
| GET | `/api/v1/catalogos/tipo/{tipo}` | Público | Recupera catálogos filtrados por tipo (ZONA, SERVICIO, etc.). |
| POST | `/api/v1/catalogos` | `ROLE_ADMIN` | Inserta una nueva opción de catálogo en base de datos. |

</div>

### 7.5.3. Evidencia de Código Crítico: Inicialización de Datos Semilla (Seeding)
Para poblar automáticamente MySQL en el primer levantamiento contenerizado de la aplicación, el servicio implementa `CommandLineRunner`:

```java
package com.alquilaya.serviciocatalogos.config;

import com.alquilaya.serviciocatalogos.models.CatalogoItem;
import com.alquilaya.serviciocatalogos.models.TipoCatalogo;
import com.alquilaya.serviciocatalogos.repositories.CatalogoRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {
    private final CatalogoRepository repository;

    public DataInitializer(CatalogoRepository repo) {
        this.repository = repo;
    }

    @Override
    public void run(String... args) throws Exception {
        if (repository.count() == 0) {
            List<CatalogoItem> items = List.of(
                // Zonas de cobertura
                new CatalogoItem("Ñaña Central", TipoCatalogo.ZONA, true),
                new CatalogoItem("La Era", TipoCatalogo.ZONA, true),
                new CatalogoItem("Santa Clara", TipoCatalogo.ZONA, true),
                // Servicios
                new CatalogoItem("Internet Fibra", TipoCatalogo.SERVICIO, true),
                new CatalogoItem("Agua Caliente", TipoCatalogo.SERVICIO, true),
                new CatalogoItem("Gas central", TipoCatalogo.SERVICIO, true),
                // Reglas de convivencia
                new CatalogoItem("Prohibido el ruido molesto", TipoCatalogo.REGLA, true),
                new CatalogoItem("Prohibido fumar", TipoCatalogo.REGLA, true)
            );
            repository.saveAll(items);
            System.out.println("Base de datos MySQL inicializada con catálogos semilla.");
        }
    }
}
```
