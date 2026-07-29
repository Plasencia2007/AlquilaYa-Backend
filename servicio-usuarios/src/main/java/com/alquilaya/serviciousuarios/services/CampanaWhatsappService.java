package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.dto.CampanaWhatsappDTO;
import com.alquilaya.serviciousuarios.entities.CampanaWhatsapp;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.EstadoEnvioCampana;
import com.alquilaya.serviciousuarios.enums.EstadoUsuario;
import com.alquilaya.serviciousuarios.kafka.CampanaEventProducer;
import com.alquilaya.serviciousuarios.repositories.CampanaWhatsappRepository;
import com.alquilaya.serviciousuarios.repositories.EstudianteRepository;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Campañas de WhatsApp por segmento de estudiantes (ítem 381). Encola un evento Kafka
 * individual por destinatario (ver {@link CampanaEventProducer}) que
 * {@code servicio-notificaciones/KafkaConsumer.js} consume igual que el resto de eventos
 * WhatsApp existentes (OTP, aprobación, reservas).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CampanaWhatsappService {

    private final CampanaWhatsappRepository campanaRepository;
    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final CampanaEventProducer campanaEventProducer;

    /** Conteo estimado de destinatarios (preview del formulario, antes de confirmar el envío). */
    @Transactional(readOnly = true)
    public long contarDestinatarios(String carrera, EstadoUsuario estado) {
        return usuarioRepository.contarEstudiantesParaCampana(blankToNull(carrera), estado);
    }

    /** Carreras con al menos un estudiante, para el <select> de segmento del formulario. */
    @Transactional(readOnly = true)
    public List<String> carrerasDisponibles() {
        return estudianteRepository.carrerasDistintas();
    }

    /**
     * Crea la campaña. Si no hay `programadoPara` (o ya venció), se envía de inmediato dentro de
     * esta misma llamada; si es futuro, queda PENDIENTE y {@link CampanaWhatsappScheduler} la
     * recoge cuando corresponda.
     */
    @Transactional
    public CampanaWhatsappDTO crear(String carrera, EstadoUsuario estado, String mensaje,
                                    LocalDateTime programadoPara) {
        String carreraNormalizada = blankToNull(carrera);
        CampanaWhatsapp campana = campanaRepository.save(CampanaWhatsapp.builder()
                .carrera(carreraNormalizada)
                .estado(estado)
                .mensaje(mensaje)
                .programadoPara(programadoPara)
                .estadoEnvio(EstadoEnvioCampana.PENDIENTE)
                .build());

        if (programadoPara == null || !programadoPara.isAfter(LocalDateTime.now())) {
            enviarAhora(campana);
        }
        return CampanaWhatsappDTO.de(campana);
    }

    /**
     * Resuelve destinatarios y encola un evento por cada uno. Usada tanto para el envío
     * inmediato (desde {@link #crear}) como por el scheduler para campañas programadas vencidas.
     */
    @Transactional
    public void enviarAhora(CampanaWhatsapp campana) {
        try {
            List<Usuario> destinatarios = usuarioRepository.buscarEstudiantesParaCampana(
                    campana.getCarrera(), campana.getEstado());

            int enviados = 0;
            for (Usuario u : destinatarios) {
                if (u.getTelefono() == null || u.getTelefono().isBlank()) continue;
                String nombreCompleto = ((u.getNombre() != null ? u.getNombre() : "") + " "
                        + (u.getApellido() != null ? u.getApellido() : "")).trim();
                campanaEventProducer.emitirMensajeCampana(
                        campana.getId(), u.getId(), u.getTelefono(), nombreCompleto, campana.getMensaje());
                enviados++;
            }

            campana.setDestinatarios(enviados);
            campana.setEstadoEnvio(EstadoEnvioCampana.ENVIADA);
            campana.setEnviadoAt(LocalDateTime.now());
            campana.setUltimoError(null);
            campanaRepository.save(campana);
            log.info("[CampanaWhatsapp] Campaña {} encolada para {} destinatarios (carrera={}, estado={})",
                    campana.getId(), enviados, campana.getCarrera(), campana.getEstado());
        } catch (Exception e) {
            campana.setEstadoEnvio(EstadoEnvioCampana.ERROR);
            campana.setUltimoError(truncar(e.getMessage(), 4000));
            campanaRepository.save(campana);
            log.error("[CampanaWhatsapp] Fallo al encolar campaña {}: {}", campana.getId(), e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public Page<CampanaWhatsappDTO> listar(Pageable pageable) {
        return campanaRepository.findAllByOrderByCreatedAtDesc(pageable).map(CampanaWhatsappDTO::de);
    }

    @Transactional(readOnly = true)
    public CampanaWhatsapp obtener(Long id) {
        return campanaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Campaña no encontrada: " + id));
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private static String truncar(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
