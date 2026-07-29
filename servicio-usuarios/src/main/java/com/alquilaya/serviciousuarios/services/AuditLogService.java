package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.entities.AuditLog;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.repositories.AuditLogRepository;
import com.alquilaya.serviciousuarios.util.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * Registro de auditoría append-only (G8-A). Cada acción sensible del admin crea una
 * fila nueva en {@code audit_log}. El registro es <b>best-effort</b>: si la escritura
 * de auditoría falla, se loguea el error pero NUNCA se propaga la excepción, para que
 * una caída de la auditoría no rompa la acción de negocio que la originó.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final com.alquilaya.serviciousuarios.repositories.UsuarioRepository usuarioRepository;
    private final ClientIpResolver clientIpResolver;

    /** Núcleo append-only. Nunca lanza: audita en su propia transacción implícita. */
    public void registrar(Long actorUsuarioId, String actorCorreo, String accion,
                          String entidad, Long entidadId, String detalle, String ip) {
        try {
            auditLogRepository.save(AuditLog.builder()
                    .actorUsuarioId(actorUsuarioId)
                    .actorCorreo(actorCorreo)
                    .accion(accion)
                    .entidad(entidad)
                    .entidadId(entidadId)
                    .detalle(detalle)
                    .ip(ip)
                    .build());
        } catch (Exception e) {
            log.error("[AUDIT] No se pudo registrar la acción '{}' sobre {}#{}: {}",
                    accion, entidad, entidadId, e.getMessage());
        }
    }

    /** Variante que calcula la IP a partir del request (respeta X-Forwarded-For). */
    public void registrar(Long actorUsuarioId, String actorCorreo, String accion,
                          String entidad, Long entidadId, String detalle, HttpServletRequest req) {
        registrar(actorUsuarioId, actorCorreo, accion, entidad, entidadId, detalle,
                clientIpResolver.resolve(req));
    }

    /**
     * Registra la acción resolviendo el actor desde el contexto de seguridad
     * (correo del JWT → id). Úsese cuando el actor es el usuario autenticado y su
     * cuenta sigue intacta (p. ej. un admin que actúa sobre otra cuenta).
     */
    public void registrarActorActual(String accion, String entidad, Long entidadId,
                                     String detalle, HttpServletRequest req) {
        String correo = null;
        Long actorId = null;
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                correo = auth.getName();
                actorId = usuarioRepository.findByCorreo(correo).map(Usuario::getId).orElse(null);
            }
        } catch (Exception e) {
            log.warn("[AUDIT] No se pudo resolver el actor autenticado: {}", e.getMessage());
        }
        registrar(actorId, correo, accion, entidad, entidadId, detalle, clientIpResolver.resolve(req));
    }

    /** Consulta paginada de la auditoría (solo lectura). Normaliza filtros vacíos a null. */
    public Page<AuditLog> buscar(String actor, String accion, LocalDateTime desde,
                                 LocalDateTime hasta, Pageable pageable) {
        return auditLogRepository.buscar(
                blankToNull(actor), blankToNull(accion), desde, hasta, pageable);
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
