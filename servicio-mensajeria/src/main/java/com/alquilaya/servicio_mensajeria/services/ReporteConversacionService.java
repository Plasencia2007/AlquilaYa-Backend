package com.alquilaya.servicio_mensajeria.services;

import com.alquilaya.servicio_mensajeria.config.CurrentUser;
import com.alquilaya.servicio_mensajeria.dto.CrearReporteRequest;
import com.alquilaya.servicio_mensajeria.dto.ReporteConversacionDTO;
import com.alquilaya.servicio_mensajeria.entities.ReporteConversacion;
import com.alquilaya.servicio_mensajeria.enums.EstadoReporte;
import com.alquilaya.servicio_mensajeria.repositories.ReporteConversacionRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ítem 261: reportes de conversación hechos por un participante (acoso, fraude, spam...),
 * que quedan pendientes de revisión en el panel de moderación admin existente.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReporteConversacionService {

    private final ReporteConversacionRepository reporteRepo;
    private final ConversacionService conversacionService;

    /**
     * Registra un reporte. {@link ConversacionService#verificarAcceso} valida que el
     * caller participe en la conversación (o sea ADMIN); como el reporte solo tiene
     * sentido para un participante real (reportanteRol solo admite ESTUDIANTE/ARRENDADOR,
     * ver constraint de BD), se rechaza explícitamente a un ADMIN que llame este endpoint.
     */
    @Transactional
    public ReporteConversacionDTO crear(Long conversacionId, CurrentUser user, CrearReporteRequest req) {
        conversacionService.verificarAcceso(conversacionId, user);
        String rol = user.getRol() != null ? user.getRol().toUpperCase() : null;
        if (!"ESTUDIANTE".equals(rol) && !"ARRENDADOR".equals(rol)) {
            throw new AccessDeniedException("Solo estudiantes o arrendadores pueden reportar conversaciones");
        }

        ReporteConversacion r = ReporteConversacion.builder()
                .conversacionId(conversacionId)
                .reportanteId(user.getPerfilId())
                .reportanteRol(rol)
                .motivo(req.motivo())
                .descripcion(req.descripcion())
                .estado(EstadoReporte.PENDIENTE)
                .build();
        ReporteConversacion guardado = reporteRepo.save(r);
        log.info("[REPORTE] conversacion={} motivo={} por perfil={} rol={}",
                conversacionId, req.motivo(), user.getPerfilId(), rol);
        return ReporteConversacionDTO.de(guardado);
    }

    /** Lista paginada para el admin (todas o filtradas por estado). */
    @Transactional(readOnly = true)
    public Page<ReporteConversacionDTO> listarParaAdmin(EstadoReporte estado, Pageable pageable) {
        Page<ReporteConversacion> page = (estado == null)
                ? reporteRepo.findAllByOrderByFechaCreacionDesc(pageable)
                : reporteRepo.findByEstadoOrderByFechaCreacionDesc(estado, pageable);
        return page.map(ReporteConversacionDTO::de);
    }

    /** Marca un reporte como revisado/desestimado (admin). */
    @Transactional
    public ReporteConversacionDTO cambiarEstado(Long reporteId, EstadoReporte nuevoEstado) {
        ReporteConversacion r = reporteRepo.findById(reporteId)
                .orElseThrow(() -> new EntityNotFoundException("Reporte no encontrado: " + reporteId));
        r.setEstado(nuevoEstado);
        return ReporteConversacionDTO.de(reporteRepo.save(r));
    }
}
