package com.alquilaya.api_gateway.filter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.util.Base64;

/**
 * Ítem 379: bloquea CUALQUIER mutación (todo método distinto de GET/HEAD/OPTIONS) cuando el
 * JWT lleva el claim {@code impersonacion=true} — un único punto de aplicación para TODOS los
 * servicios detrás del gateway, así ninguno de ellos necesita saber de impersonación para que
 * la restricción de solo-lectura sea real (defensa en profundidad: aunque un servicio nuevo se
 * agregue sin este check, el gateway ya cortó la petición antes de que llegue).
 *
 * <p>Único camino que NO pasa por este gateway: el WebSocket de servicio-mensajeria
 * ({@code :8086/ws-mensajeria}), por eso ahí {@code WebSocketAuthInterceptor} tiene su propio
 * rechazo del mismo claim en el CONNECT.
 *
 * <p>Excepción explícita: {@code POST /api/v1/usuarios/admin/impersonar/salir} — el único
 * endpoint mutante que un token de impersonación SÍ debe poder llamar (para poder salir del
 * modo impersonación).
 *
 * <p>No valida la firma del JWT (eso lo hace cada servicio downstream); solo lee el claim.
 * Igual que {@link JwtRevocationInterceptor}, si el payload no se puede decodificar, deja
 * pasar la petición (la validación real de firma/rol la hace el servicio downstream de todas
 * formas — este interceptor es una capa extra, no la única).
 */
@Component
public class ImpersonationReadOnlyInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(ImpersonationReadOnlyInterceptor.class);

    private static final String RUTA_SALIR = "/api/v1/usuarios/admin/impersonar/salir";

    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public boolean preHandle(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull Object handler
    ) throws Exception {
        String method = request.getMethod();
        if ("GET".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method) || "OPTIONS".equalsIgnoreCase(method)) {
            return true;
        }
        if (RUTA_SALIR.equals(request.getRequestURI())) {
            return true;
        }

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) return true;
        String token = header.substring(7);

        if (esImpersonacion(token)) {
            return rechazar(response);
        }
        return true;
    }

    private boolean rechazar(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType("application/json");
        response.getWriter().write(
                "{\"error\":\"Modo de solo lectura: estás viendo como otro usuario, no puedes hacer cambios.\",\"status\":403}");
        return false;
    }

    /** Lee el claim {@code impersonacion} del payload del JWT sin verificar la firma. */
    private boolean esImpersonacion(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) return false;
            String p = parts[1];
            int pad = (4 - p.length() % 4) % 4;
            p = p + "=".repeat(pad);
            byte[] payload = Base64.getUrlDecoder().decode(p);
            JsonNode n = mapper.readTree(payload);
            return n.hasNonNull("impersonacion") && n.get("impersonacion").asBoolean(false);
        } catch (Exception e) {
            log.debug("No se pudo leer claim de impersonación (se deja pasar): {}", e.getMessage());
            return false;
        }
    }
}
