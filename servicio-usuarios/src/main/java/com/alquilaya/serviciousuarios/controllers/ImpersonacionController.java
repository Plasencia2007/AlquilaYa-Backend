package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.config.JwtService;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.exceptions.RecursoNoEncontradoException;
import com.alquilaya.serviciousuarios.repositories.ArrendadorRepository;
import com.alquilaya.serviciousuarios.repositories.EstudianteRepository;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import com.alquilaya.serviciousuarios.services.AuditLogService;
import com.alquilaya.serviciousuarios.services.JwtBlacklistService;
import com.alquilaya.serviciousuarios.util.ClientIpResolver;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Date;
import java.util.Map;

/**
 * Ítem 379: "Ver como usuario" — impersonación de solo lectura, auditada.
 *
 * <p><b>El token NUNCA toca JavaScript.</b> Este proyecto ya decidió (S5) que el access token
 * vive solo en un cookie {@code httpOnly} — ni siquiera el login normal lo expone en el JSON de
 * respuesta. La impersonación sigue exactamente el mismo patrón que {@code AuthController}
 * (mismo nombre de cookie {@code auth-token}, mismos flags): {@link #iniciar} sobreescribe ese
 * cookie con el token de impersonación, guardando el token REAL del admin en un segundo cookie
 * httpOnly ({@code admin-original-token}) para poder restaurarlo en {@link #salir}. El body de
 * la respuesta solo trae metadata (nombre/rol del usuario objetivo), nunca un JWT.
 *
 * <p><b>Por qué es de solo lectura:</b> el token que emite {@link #iniciar} lleva los claims
 * {@code impersonacion=true}/{@code impersonadoPor}. {@code ImpersonationReadOnlyInterceptor}
 * (api-gateway, un único punto de aplicación para TODOS los servicios detrás del gateway)
 * rechaza cualquier método distinto de GET/HEAD/OPTIONS mientras esos claims estén presentes —
 * aunque el token tenga el rol/perfilId reales del usuario objetivo (para que el front
 * renderice EXACTAMENTE lo que él ve), no puede usarse para mutar nada vía REST. El único
 * camino que NO pasa por el gateway es el WebSocket de servicio-mensajeria, así que
 * {@code WebSocketAuthInterceptor} ahí rechaza el CONNECT directamente si detecta el claim.
 *
 * <p>Nunca se registra en {@code SesionService} (no es una sesión real del usuario objetivo,
 * no debe aparecer en "mis dispositivos"). Se revoca con el mismo blacklist de logout al salir.
 */
@RestController
@RequestMapping("/api/v1/usuarios/admin/impersonar")
@RequiredArgsConstructor
@Slf4j
public class ImpersonacionController {

    private static final String COOKIE_ACCESS = "auth-token";
    private static final String COOKIE_ACCESS_PATH = "/";
    private static final String COOKIE_ORIGINAL = "admin-original-token";
    private static final long DURACION_MS = 15 * 60 * 1000L; // 15 min, mismo valor que el JWT

    private final UsuarioRepository usuarioRepository;
    private final ArrendadorRepository arrendadorRepository;
    private final EstudianteRepository estudianteRepository;
    private final JwtService jwtService;
    private final JwtBlacklistService jwtBlacklistService;
    private final AuditLogService auditLogService;
    private final ClientIpResolver clientIpResolver;

    @PostMapping("/{usuarioId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> iniciar(@PathVariable Long usuarioId,
            HttpServletRequest req, HttpServletResponse resp) {
        String tokenAdminActual = tokenDelHeader(req);
        if (tokenAdminActual == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Usuario objetivo = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));

        // Nunca impersonar a otro admin: evita que un admin comprometido escale a otra
        // cuenta admin, o que un admin "tape" acciones actuando invisible como otro admin.
        if (objetivo.getRol() == Rol.ADMIN) {
            throw new IllegalArgumentException("No se puede impersonar a una cuenta de administrador");
        }

        Long perfilId = obtenerPerfilId(objetivo);
        Long adminId = adminActualId();
        String tokenImpersonacion = jwtService.generateImpersonationToken(objetivo, perfilId, adminId);

        // Guarda el token REAL del admin en un cookie aparte para restaurarlo al salir, y
        // recién ENTONCES sobreescribe el cookie de sesión activa con el de impersonación.
        setCookie(resp, COOKIE_ORIGINAL, tokenAdminActual, req, DURACION_MS);
        setCookie(resp, COOKIE_ACCESS, tokenImpersonacion, req, DURACION_MS);

        auditLogService.registrarActorActual("IMPERSONAR_INICIO", "Usuario", usuarioId,
                "Viendo como " + objetivo.getCorreo() + " (rol " + objetivo.getRol() + ")", req);
        log.warn("[IMPERSONACION] admin={} inicia impersonación de usuario={} ({})",
                adminId, usuarioId, objetivo.getCorreo());

        // HashMap (no Map.of): perfilId puede ser null (p.ej. arrendador sin perfil aún) y
        // Map.of no admite valores null.
        java.util.Map<String, Object> usuarioDTO = new java.util.HashMap<>();
        usuarioDTO.put("id", objetivo.getId());
        usuarioDTO.put("nombre", objetivo.getNombre() == null ? "" : objetivo.getNombre());
        usuarioDTO.put("correo", objetivo.getCorreo());
        usuarioDTO.put("rol", objetivo.getRol().name());
        usuarioDTO.put("perfilId", perfilId);

        return ResponseEntity.ok(Map.of(
                "expiraEnSegundos", DURACION_MS / 1000,
                "usuario", usuarioDTO));
    }

    /**
     * Sale de la impersonación. Se llama con el cookie de impersonación activo — por eso está
     * explícitamente exceptuada del bloqueo de solo-lectura del gateway (ver
     * {@code ImpersonationReadOnlyInterceptor}, que permite POST solo a esta ruta exacta).
     */
    @PostMapping("/salir")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> salir(HttpServletRequest req, HttpServletResponse resp) {
        String tokenImpersonacion = tokenDelHeader(req);
        if (tokenImpersonacion == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        Boolean esImpersonacion = jwtService.extractClaim(tokenImpersonacion,
                c -> c.get("impersonacion", Boolean.class));
        if (!Boolean.TRUE.equals(esImpersonacion)) {
            throw new IllegalArgumentException("Este token no es una sesión de impersonación");
        }

        Long adminId = jwtService.extractClaim(tokenImpersonacion, c -> c.get("impersonadoPor", Long.class));
        Long usuarioObjetivoId = jwtService.extractClaim(tokenImpersonacion, c -> c.get("userId", Long.class));
        Date expiracion = jwtService.getExpiration(tokenImpersonacion);

        // Mismo mecanismo que el logout normal: una vez en blacklist, el gateway
        // (JwtRevocationInterceptor) y cada servicio downstream lo rechazan de inmediato.
        jwtBlacklistService.blacklist(tokenImpersonacion, expiracion);

        String tokenOriginalAdmin = leerCookie(req, COOKIE_ORIGINAL);
        if (tokenOriginalAdmin != null) {
            setCookie(resp, COOKIE_ACCESS, tokenOriginalAdmin, req, null);
        } else {
            // No debería pasar (siempre se setea en /iniciar), pero si falta, no dejar al
            // admin atrapado con un cookie de impersonación ya revocado: lo borramos y que
            // el próximo request lo mande a re-loguearse.
            borrarCookie(resp, COOKIE_ACCESS);
        }
        borrarCookie(resp, COOKIE_ORIGINAL);

        auditLogService.registrar(adminId, null, "IMPERSONAR_FIN", "Usuario", usuarioObjetivoId,
                null, clientIpResolver.resolve(req));
        log.warn("[IMPERSONACION] admin={} termina impersonación de usuario={}", adminId, usuarioObjetivoId);

        return ResponseEntity.noContent().build();
    }

    private String tokenDelHeader(HttpServletRequest req) {
        String header = req.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) return null;
        return header.substring(7);
    }

    private Long adminActualId() {
        String correo = SecurityContextHolder.getContext().getAuthentication().getName();
        return usuarioRepository.findByCorreo(correo)
                .map(Usuario::getId)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el admin autenticado"));
    }

    /** Misma resolución que {@code AuthController#obtenerPerfilId} — perfilId por rol. */
    private Long obtenerPerfilId(Usuario usuario) {
        if (usuario.getRol() == Rol.ARRENDADOR) {
            return arrendadorRepository.findByUsuario(usuario)
                    .map(com.alquilaya.serviciousuarios.entities.Arrendador::getId)
                    .orElse(null);
        } else if (usuario.getRol() == Rol.ESTUDIANTE) {
            return estudianteRepository.findByUsuario(usuario)
                    .map(com.alquilaya.serviciousuarios.entities.Estudiante::getId)
                    .orElse(null);
        }
        return null;
    }

    /**
     * Mismo patrón que {@code AuthController#setAccessCookie}: httpOnly, Secure si la conexión
     * lo es, SameSite=Lax, path raíz (el gateway necesita el cookie en cualquier ruta de la API).
     * {@code maxAgeMsOverride} null = usa el tiempo real hasta la expiración del JWT (para
     * restaurar el token original del admin con su vida restante real, no 15 min fijos).
     */
    private void setCookie(HttpServletResponse resp, String nombre, String token,
            HttpServletRequest req, Long maxAgeMsOverride) {
        long maxAgeMs = maxAgeMsOverride != null
                ? maxAgeMsOverride
                : Math.max(0, jwtService.getExpiration(token).getTime() - System.currentTimeMillis());
        ResponseCookie cookie = ResponseCookie.from(nombre, token)
                .httpOnly(true)
                .secure(esSeguro(req))
                .sameSite("Lax")
                .path(COOKIE_ACCESS_PATH)
                .maxAge(Duration.ofMillis(maxAgeMs))
                .build();
        resp.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void borrarCookie(HttpServletResponse resp, String nombre) {
        ResponseCookie cookie = ResponseCookie.from(nombre, "")
                .httpOnly(true)
                .path(COOKIE_ACCESS_PATH)
                .maxAge(0)
                .build();
        resp.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private static String leerCookie(HttpServletRequest req, String nombre) {
        Cookie[] cookies = req.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies) {
            if (nombre.equals(c.getName())) return c.getValue();
        }
        return null;
    }

    private static boolean esSeguro(HttpServletRequest req) {
        return req.isSecure() || "https".equalsIgnoreCase(req.getHeader("X-Forwarded-Proto"));
    }
}
