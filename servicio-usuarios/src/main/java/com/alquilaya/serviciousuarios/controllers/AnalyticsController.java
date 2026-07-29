package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.config.JwtService;
import com.alquilaya.serviciousuarios.dto.RegistrarEventosAnalyticsRequest;
import com.alquilaya.serviciousuarios.dto.RegistrarEventosAnalyticsResponse;
import com.alquilaya.serviciousuarios.services.EventoAnalyticsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Ingesta pública del sink backend de la telemetría de analítica CLIENTE (ítem 455; ver
 * {@code src/lib/analytics.ts} del frontend, que hasta ahora sólo guardaba los eventos en un
 * buffer de {@code localStorage}).
 *
 * <p>Público (permitAll en {@code SecurityConfig}): visitantes anónimos también disparan
 * eventos (p.ej. una búsqueda antes de loguearse). Anti-abuso en capas:</p>
 * <ul>
 *   <li>{@code RateLimitFilter} limita por IP (endpoint público que persiste en BD).</li>
 *   <li>{@link RegistrarEventosAnalyticsRequest} limita el tamaño del batch (máx. 50 eventos).</li>
 *   <li>{@code EventoAnalyticsService} limita el tamaño serializado de cada {@code props}
 *       (máx. 4KB).</li>
 * </ul>
 * <p>Ambos límites responden 400 (nunca fallan en silencio) vía {@code GlobalExceptionHandler}.</p>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/usuarios/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final EventoAnalyticsService service;
    private final JwtService jwtService;

    /**
     * Recibe un batch de eventos. Fire-and-forget desde la óptica del frontend: responde
     * <b>202 Accepted</b> con el conteo persistido, sin bloquear la UI del caller.
     *
     * <p>Si el caller trae un JWT válido (cookie de sesión traducida a header {@code Authorization}
     * por el gateway), se persiste su {@code usuarioId}; si es anónimo o el token es
     * inválido/expiró, {@code usuarioId = null} -- nunca rompe la ingesta.</p>
     */
    @PostMapping("/eventos")
    public ResponseEntity<RegistrarEventosAnalyticsResponse> registrarEventos(
            @Valid @RequestBody RegistrarEventosAnalyticsRequest request,
            HttpServletRequest httpRequest) {
        Long usuarioId = usuarioIdOpcional(httpRequest);
        int aceptados = service.registrarBatch(request.getEventos(), usuarioId);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(new RegistrarEventosAnalyticsResponse(aceptados));
    }

    /**
     * Resuelve el {@code usuarioId} del JWT si el caller trae uno válido en el header
     * {@code Authorization}. Endpoint público: un token ausente, expirado o inválido NUNCA
     * rompe la ingesta -- simplemente cae a anónimo ({@code null}).
     */
    private Long usuarioIdOpcional(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        try {
            String jwt = authHeader.substring(7);
            return jwtService.extractClaim(jwt, claims -> claims.get("userId", Long.class));
        } catch (Exception e) {
            log.debug("[Analytics] Token presente pero inválido/expirado; se ingiere como anónimo");
            return null;
        }
    }
}
