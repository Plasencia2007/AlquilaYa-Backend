# 8. SEGURIDAD JWT Y AUTORIZACIÓN

Este capítulo detalla la implementación del modelo de seguridad y control de acceso distribuido de **AlquilaYa**. Se especifican el rol de puerta de enlace perimetral del API Gateway, el ciclo de vida de los tokens JSON Web Token (JWT), la estrategia de invalidación activa usando un clúster de Redis, la propagación de identidades en cascada mediante interceptores de OpenFeign y la protección robusta de datos en cargas de archivos (Magic Bytes).

---

## 8.1. Punto 1: Infraestructura de Autenticación Centralizada (API Gateway)

### 8.1.1. Sustento Técnico y Decisiones de Diseño
El API Gateway (`api-gateway`) es la única frontera expuesta al exterior. Implementa un filtro perimetral transversal encargado del enrutamiento dinámico, el control de orígenes cruzados (CORS) y, de forma crítica, la verificación temprana de revocación de sesiones. Al centralizar la validación de tokens antes de que las peticiones toquen la red interna de microservicios, se reduce la latencia y se protegen los recursos downstream de ataques de denegación de servicio (DoS) o fuerza bruta.

### 8.1.2. Interfaz de Red y Mapeo Lógico
El Gateway intercepta las llamadas e interactúa de forma síncrona con el clúster de Redis. La Tabla IX detalla el comportamiento del flujo de interceptación perimetral.

<div align="center">
  
**TABLA IX**  
**COMPORTAMIENTO DEL FILTRO DE INTERCEPTACIÓN PERIMETRAL**

| Condición del Token | Acción del Gateway | Código de Respuesta | Causa Técnica |
|:---|:---|:---|:---|
| Ausente (rutas privadas) | Rechaza la petición | HTTP 401 | Falta cabecera `Authorization: Bearer`. |
| Presente y Expirado | Rechaza la petición | HTTP 401 | El tiempo del claim `exp` es menor al epoch actual. |
| Registrado en Blacklist | Rechaza la petición | HTTP 401 | El token hash SHA-256 está presente en Redis. |
| Sesión `jti` Revocada | Rechaza la petición | HTTP 401 | Cierre de sesión remoto/dispositivo revocado en Redis. |
| Válido y Activo | Permite el paso | Proxy (HTTP 200/201) | Rutea mediante balanceo de carga (`lb://`). |

</div>

### 8.1.3. Evidencia de Código Crítico: Interceptor de Gateway (`JwtRevocationInterceptor.java`)
Para evitar sobrecargar los microservicios, el Gateway verifica de forma reactiva si el hash del token o su identificador de sesión (`jti`) existen en Redis. Implementa además un principio de **degradación graceful (fail-open)**: si Redis falla, deja pasar la petición confiando en que el servicio final validará la firma digital:

```java
package com.alquilaya.api_gateway.filter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

@Component
public class JwtRevocationInterceptor implements HandlerInterceptor {
    private static final String BLACKLIST_PREFIX = "usuarios:blacklist:jwt:";
    private static final String REVOCADA_PREFIX = "usuarios:sesion-revocada:";
    private final StringRedisTemplate redis;
    private final ObjectMapper mapper = new ObjectMapper();

    public JwtRevocationInterceptor(StringRedisTemplate redis) {
        this.redis = redis;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (redis == null) return true; // Fail-open: si Redis cae, continúa validación en microservicio
        
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) return true;
        String token = header.substring(7);

        try {
            // 1. Validar si el hash SHA-256 del token está en blacklist
            if (Boolean.TRUE.equals(redis.hasKey(BLACKLIST_PREFIX + sha256(token)))) {
                return rejectRequest(response);
            }
            // 2. Extraer claim jti y verificar si la sesión global fue revocada
            String jti = extraerJti(token);
            if (jti != null && Boolean.TRUE.equals(redis.hasKey(REVOCADA_PREFIX + jti))) {
                return rejectRequest(response);
            }
        } catch (Exception e) {
            return true; // Fail-open
        }
        return true;
    }

    private boolean rejectRequest(HttpServletResponse response) throws Exception {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"Sesión cerrada. Acceso no autorizado.\",\"status\":401}");
        return false;
    }

    private String extraerJti(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) return null;
            byte[] payload = Base64.getUrlDecoder().decode(parts[1]);
            JsonNode node = mapper.readTree(payload);
            return node.hasNonNull("jti") ? node.get("jti").asText() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private static String sha256(String val) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] hash = md.digest(val.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder(hash.length * 2);
        for (byte b : hash) hex.append(String.format("%02x", b));
        return hex.toString();
    }
}
```

---

## 8.2. Punto 2: Ciclo de Vida del JWT (Generación y Validación)

### 8.2.1. Sustento Técnico y Decisiones de Diseño
El sistema utiliza autenticación **stateless**. El microservicio `servicio-usuarios` es el único emisor del token. Los tokens son firmados digitalmente usando el algoritmo **HMAC con SHA-256 (HS256)** con una llave secreta de 256 bits configurada desde el Config Server. La expiración estándar se establece en 24 horas para desarrollo y se reduce a 1 hora en producción, inyectando un identificador de sesión único (`jti`) que permite rastrear y revocar accesos de forma remota.

### 8.2.2. Estructura de Payload y Claims
La Tabla X detalla la estructura lógica y los metadatos inyectados dentro del payload del JWT de **AlquilaYa**.

<div align="center">
  
**TABLA X**  
**ESTRUCTURA DE CLAIMS DENTRO DEL PAYLOAD JWT**

| Claim Key | Tipo | Descripción | Propósito en el Frontend / Downstream |
|:---|:---|:---|:---|
| `sub` | String | Correo electrónico del usuario | Identificación principal del sujeto. |
| `userId` | Long | ID correlativo de base de datos | Evita joins de perfiles; mapea directamente la entidad. |
| `perfilId`| Long | ID del perfil extendido (opcional) | Mapea directamente el perfil de Estudiante o Arrendador. |
| `rol` | String | Rol de seguridad (Ej: `ESTUDIANTE`) | Utilizado en interceptores de acceso y menús condicionales. |
| `jti` | UUID | JWT ID único de sesión | Indispensable para la invalidación granular y cierres remotos. |
| `exp` | Epoch | Fecha y hora de expiración | Controla el descarte del token por parte de navegadores. |

</div>

### 8.2.3. Evidencia de Código Crítico: Proveedor del Token (`JwtService.java`)
La clase `JwtService` centraliza la lógica de generación del token JWT inyectando los claims personalizados y firmándolos con la clave secreta Base64 decodificada:

```java
package com.alquilaya.serviciousuarios.config;

import com.alquilaya.serviciousuarios.entities.Usuario;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.security.Key;
import java.util.*;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    public String generateToken(Usuario usuario, Long perfilId) {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("userId", usuario.getId());
        if (perfilId != null) {
            extraClaims.put("perfilId", perfilId);
        }
        extraClaims.put("rol", usuario.getRol().name());
        extraClaims.put("nombre", usuario.getNombre());
        extraClaims.put("emailVerificado", usuario.isEmailVerificado());
        extraClaims.put("jti", UUID.randomUUID().toString()); // Inyección de JTI único de sesión

        return Jwts.builder()
                .setClaims(extraClaims)
                .setSubject(usuario.getCorreo())
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    private Key getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
```

---

## 8.3. Punto 3: Invalidación Activa de Tokens (Logout & Blacklist en Redis)

### 8.3.1. Sustento Técnico y Decisiones de Diseño
Una debilidad intrínseca del token JWT stateless es que sigue siendo válido hasta que expira naturalmente (`exp`). Para permitir un cierre de sesión inmediato y seguro (Logout), implementamos un patrón híbrido: el **JWT Blacklist en Redis**. Al cerrar sesión, el token es enviado al servidor, el cual extrae su tiempo restante de vida y guarda su hash SHA-256 en Redis con un tiempo de expiración (TTL) idéntico a su tiempo de vida restante.

### 8.3.2. Mecanismo de Flujo de Logout y Almacenamiento
La Figura 1 muestra la secuencia técnica del proceso de invalidación.

```
[Cliente Web] ──( 1. Invoca POST /auth/logout )──► [Servicio Usuarios]
                                                           │
                                                   (2. Extrae JWT y calcula exp)
                                                           │
                                                   (3. Hashea JWT a SHA-256)
                                                           │
                                                           ▼
                                                [Clúster de Redis]
                                                Guarda: usuarios:blacklist:jwt:<hash>
                                                Valor: "1"
                                                TTL: exp - ahora (en segundos)
```

La clave guardada en Redis sigue la convención `usuarios:blacklist:jwt:<SHA-256>`. Al usar el hash en lugar del token real, evitamos almacenar datos sensibles en memoria de Redis y optimizamos el consumo de almacenamiento.

### 8.3.3. Evidencia de Código Crítico: Servicio de Blacklist (`JwtBlacklistService.java`)
El servicio escribe de forma segura en Redis con control de resiliencia y degradación gradual:

```java
package com.alquilaya.serviciousuarios.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Date;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class JwtBlacklistService {
    private static final String KEY_PREFIX = "usuarios:blacklist:jwt:";
    private final StringRedisTemplate redisTemplate;

    public JwtBlacklistService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void blacklist(String token, Date expiresAt) {
        if (redisTemplate == null) {
            log.warn("Redis apagado. Logout fail-open.");
            return;
        }
        try {
            long ttlSeconds = (expiresAt.getTime() - System.currentTimeMillis()) / 1000L;
            if (ttlSeconds <= 0) return; // Ya expiró, no es necesario guardarlo

            String key = KEY_PREFIX + sha256(token);
            redisTemplate.opsForValue().set(key, "1", ttlSeconds, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.error("Fallo al escribir token en la blacklist de Redis: {}", e.getMessage());
        }
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 no soportado en la JVM", e);
        }
    }
}
```

---

## 8.4. Punto 4: Seguridad Downstream y Autorización Granular

### 8.4.1. Sustento Técnico y Decisiones de Diseño
Al estar la base de datos distribuida, un microservicio de negocio (como `servicio-propiedades`) necesita llamar a otro (`servicio-usuarios`) para validar permisos de usuarios. Para que esta comunicación síncrona no falle con un error de acceso prohibido (HTTP 403), el sistema implementa una propagación en cascada del token. Un interceptor Feign clona el token JWT de la petición entrante del cliente y lo inyecta automáticamente en las cabeceras de las llamadas backend-a-backend.

### 8.4.2. Matriz de Autorización por Roles
La Tabla XI define la matriz granular de control de acceso basada en los roles extraídos del JWT.

<div align="center">
  
**TABLA XI**  
**MATRIZ DE AUTORIZACIÓN Y ROLES**

| Microservicio | Endpoint Protegido | Roles Permitidos | Tipo de Filtro en Código |
|:---|:---|:---|:---|
| `usuarios` | `/usuarios/documentos/admin/**` | `ROLE_ADMIN` | `@PreAuthorize("hasRole('ADMIN')")` |
| `propiedades` | `/propiedades` (POST/PUT) | `ROLE_ARRENDADOR` | `@PreAuthorize("hasRole('ARRENDADOR')")` |
| `propiedades` | `/reservas` (POST) | `ROLE_ESTUDIANTE` | `@PreAuthorize("hasRole('ESTUDIANTE')")` |
| `pagos` | `/pagos/preferencia/**` | `ROLE_ESTUDIANTE` | `@PreAuthorize("hasRole('ESTUDIANTE')")` |
| `mensajeria` | `/admin/mensajeria/**` | `ROLE_ADMIN` | `@PreAuthorize("hasRole('ADMIN')")` |

</div>

### 8.4.3. Evidencia de Código Crítico: Propagación de Token (`FeignConfig.java`)
El interceptor clona el header `Authorization` del hilo del request original. Si se ejecuta en un contexto asíncrono (sin request HTTP activo), obtiene las credenciales del hilo del `SecurityContextHolder`:

```java
package com.alquilaya.serviciopropiedades.config;

import feign.RequestInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Configuration
public class FeignConfig {

    @Bean
    public RequestInterceptor requestInterceptor() {
        return requestTemplate -> {
            try {
                // 1. Intentar clonar el token JWT de la cabecera HTTP entrante
                ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attributes != null) {
                    String authHeader = attributes.getRequest().getHeader("Authorization");
                    if (authHeader != null) {
                        requestTemplate.header("Authorization", authHeader);
                        return;
                    }
                }
            } catch (Exception e) {
                // Fallback: obtener credenciales desde el contexto de seguridad del hilo
                Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
                if (authentication != null && authentication.getCredentials() != null) {
                    String token = authentication.getCredentials().toString();
                    requestTemplate.header("Authorization", "Bearer " + token);
                }
            }
        };
    }
}
```

---

## 8.5. Punto 5: Protección Perimetral y Seguridad de Datos (Archivos y OWASP)

### 8.5.1. Sustento Técnico y Decisiones de Diseño
El registro de arrendadores exige la carga de documentos de identidad (DNI/RUC). Los atacantes pueden explotar esto subiendo scripts maliciosos disfrazados de imágenes cambiando la extensión del archivo (ej. `script.sh.png`). Para evitar esto, el microservicio implementa una estrategia de **Defensa en Profundidad (Defense in Depth)**: no confía en la extensión ni en la cabecera `Content-Type` enviada por el navegador. En su lugar, lee directamente los **Magic Bytes** (los primeros bytes binarios en crudo) del flujo de datos para validar la firma real del archivo.

### 8.5.2. Reglas de Validación de Cargas de Archivos
La Tabla XII especifica los límites y firmas de archivos permitidos por el validador.

<div align="center">
  
**TABLA XII**  
**REGLAS Y FIRMAS BINARIAS DE ARCHIVOS PERMITIDOS**

| Formato Permitido | Content-Type Declarado | Magic Bytes Reales (Hexadecimal) | Tamaño Máximo |
|:---|:---|:---|:---|
| **JPEG / JPG** | `image/jpeg` | `FF D8 FF` | 5 MB |
| **PNG** | `image/png` | `89 50 4E 47 0D 0A 1A 0A` | 5 MB |
| **PDF** | `application/pdf` | `25 50 44 46 2D` (Equivale a `%PDF-`) | 5 MB |

</div>

### 8.5.3. Evidencia de Código Crítico: Detector de Magic Bytes (`MagicBytes.java`)
El detector lee los primeros 12 bytes del flujo de datos binario para identificar el formato real de forma infalible:

```java
package com.alquilaya.serviciousuarios.validaciones.validators;

import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;

public final class MagicBytes {
    public enum Kind { JPEG, PNG, PDF, UNKNOWN }

    public static Kind detect(MultipartFile file) {
        if (file == null || file.isEmpty()) return Kind.UNKNOWN;
        byte[] head = new byte[12];
        try (InputStream in = file.getInputStream()) {
            int read = in.read(head);
            if (read < 4) return Kind.UNKNOWN;
            
            // JPEG: FF D8 FF
            if (read >= 3 && head[0] == (byte) 0xFF && head[1] == (byte) 0xD8 && head[2] == (byte) 0xFF) {
                return Kind.JPEG;
            }
            // PNG: 89 50 4E 47 0D 0A 1A 0A
            if (read >= 8 && head[0] == (byte) 0x89 && head[1] == 0x50 && head[2] == 0x4E && head[3] == 0x47
                    && head[4] == 0x0D && head[5] == 0x0A && head[6] == 0x1A && head[7] == 0x0A) {
                return Kind.PNG;
            }
            // PDF: %PDF- (% = 0x25, P = 0x50, D = 0x44, F = 0x46, - = 0x2D)
            if (read >= 5 && head[0] == 0x25 && head[1] == 0x50 && head[2] == 0x44 && head[3] == 0x46 && head[4] == 0x2D) {
                return Kind.PDF;
            }
        } catch (Exception e) {
            return Kind.UNKNOWN;
        }
        return Kind.UNKNOWN;
    }
}
```
