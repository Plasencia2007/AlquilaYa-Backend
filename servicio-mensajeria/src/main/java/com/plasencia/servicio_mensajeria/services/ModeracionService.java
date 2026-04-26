package com.plasencia.servicio_mensajeria.services;

import com.plasencia.servicio_mensajeria.config.CurrentUser;
import com.plasencia.servicio_mensajeria.dto.ConversacionDTO;
import com.plasencia.servicio_mensajeria.dto.MensajeDTO;
import com.plasencia.servicio_mensajeria.entities.Conversacion;
import com.plasencia.servicio_mensajeria.entities.Mensaje;
import com.plasencia.servicio_mensajeria.entities.ModeracionLog;
import com.plasencia.servicio_mensajeria.enums.AccionModeracion;
import com.plasencia.servicio_mensajeria.enums.EstadoConversacion;
import com.plasencia.servicio_mensajeria.enums.EstadoMensaje;
import com.plasencia.servicio_mensajeria.enums.TargetModeracion;
import com.plasencia.servicio_mensajeria.repositories.ModeracionLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ModeracionService {

    private final MensajeService mensajeService;
    private final ConversacionService conversacionService;
    private final ModeracionLogRepository logRepo;
    private final WebSocketNotificationService wsNotify;

    @Transactional
    public MensajeDTO bloquearMensaje(Long mensajeId, String motivo, CurrentUser admin) {
        exigirAdmin(admin);
        Mensaje m = mensajeService.cambiarEstadoMensaje(mensajeId, EstadoMensaje.BLOQUEADO);
        registrar(admin, AccionModeracion.BLOQUEAR_MENSAJE, TargetModeracion.MENSAJE, mensajeId, motivo);

        Conversacion c = m.getConversacion();
        wsNotify.enviarEventoAParticipantes(c, c.getEstudianteId(), c.getArrendadorId(),
                new EventoModeracion("MENSAJE_BLOQUEADO", c.getId(), mensajeId, motivo));
        return MensajeDTO.from(m);
    }

    @Transactional
    public MensajeDTO desbloquearMensaje(Long mensajeId, String motivo, CurrentUser admin) {
        exigirAdmin(admin);
        Mensaje m = mensajeService.cambiarEstadoMensaje(mensajeId, EstadoMensaje.ENVIADO);
        registrar(admin, AccionModeracion.DESBLOQUEAR_MENSAJE, TargetModeracion.MENSAJE, mensajeId, motivo);

        Conversacion c = m.getConversacion();
        wsNotify.enviarEventoAParticipantes(c, c.getEstudianteId(), c.getArrendadorId(),
                new EventoModeracion("MENSAJE_DESBLOQUEADO", c.getId(), mensajeId, motivo));
        return MensajeDTO.from(m);
    }

    @Transactional
    public ConversacionDTO suspender(Long conversacionId, String motivo, CurrentUser admin) {
        exigirAdmin(admin);
        Conversacion c = conversacionService.cambiarEstado(conversacionId, EstadoConversacion.SUSPENDIDA);
        registrar(admin, AccionModeracion.SUSPENDER_CONVERSACION, TargetModeracion.CONVERSACION, conversacionId, motivo);

        wsNotify.enviarEventoAParticipantes(c, c.getEstudianteId(), c.getArrendadorId(),
                new EventoModeracion("CONVERSACION_SUSPENDIDA", c.getId(), null, motivo));
        return ConversacionDTO.from(c);
    }

    @Transactional
    public ConversacionDTO reactivar(Long conversacionId, String motivo, CurrentUser admin) {
        exigirAdmin(admin);
        Conversacion c = conversacionService.cambiarEstado(conversacionId, EstadoConversacion.ACTIVA);
        registrar(admin, AccionModeracion.REACTIVAR_CONVERSACION, TargetModeracion.CONVERSACION, conversacionId, motivo);

        wsNotify.enviarEventoAParticipantes(c, c.getEstudianteId(), c.getArrendadorId(),
                new EventoModeracion("CONVERSACION_REACTIVADA", c.getId(), null, motivo));
        return ConversacionDTO.from(c);
    }

    private void registrar(CurrentUser admin, AccionModeracion accion, TargetModeracion targetType,
                           Long targetId, String motivo) {
        ModeracionLog log = ModeracionLog.builder()
                .adminId(admin.getUserId() != null ? admin.getUserId() : 0L)
                .adminEmail(admin.getEmail() != null ? admin.getEmail() : "desconocido")
                .accion(accion)
                .targetType(targetType)
                .targetId(targetId)
                .motivo(motivo)
                .build();
        logRepo.save(log);
    }

    private void exigirAdmin(CurrentUser user) {
        if (user == null || !"ADMIN".equalsIgnoreCase(user.getRol())) {
            throw new AccessDeniedException("Se requiere rol ADMIN");
        }
    }

    /** Evento público serializado a los participantes por WebSocket. */
    public record EventoModeracion(String tipo, Long conversacionId, Long mensajeId, String motivo) {}
}
