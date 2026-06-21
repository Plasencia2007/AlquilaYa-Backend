package com.alquilaya.serviciopropiedades.scheduler;

import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.services.PublicacionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Publica automáticamente los borradores cuya fecha de publicación programada ya venció
 * (BORRADOR → PENDIENTE). Si un borrador no es publicable (incompleto), cancela su programación
 * para no reintentar en bucle; el arrendador deberá completarlo y reprogramarlo.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PublicacionProgramadaScheduler {

    private final PropiedadRepository propiedadRepository;
    private final PublicacionService publicacionService;

    @Scheduled(fixedDelayString = "${publicacion.programada.intervalo-ms:60000}")
    public void publicarProgramadas() {
        List<Propiedad> vencidos = propiedadRepository
                .findByEstadoAndFechaPublicacionProgramadaLessThanEqual(
                        EstadoPropiedad.BORRADOR, LocalDateTime.now());
        if (vencidos.isEmpty()) {
            return;
        }
        log.info("[PUBLICACION] {} borrador(es) programado(s) por publicar", vencidos.size());
        for (Propiedad p : vencidos) {
            try {
                publicacionService.publicarBorrador(p.getId());
                log.info("[PUBLICACION] Borrador {} publicado automáticamente", p.getId());
            } catch (Exception e) {
                log.warn("[PUBLICACION] No se pudo publicar el borrador programado {}: {}. "
                        + "Se cancela la programación.", p.getId(), e.getMessage());
                cancelarProgramacion(p.getId());
            }
        }
    }

    private void cancelarProgramacion(Long id) {
        try {
            propiedadRepository.findById(id).ifPresent(pp -> {
                if (pp.getEstado() == EstadoPropiedad.BORRADOR) {
                    pp.setFechaPublicacionProgramada(null);
                    propiedadRepository.save(pp);
                }
            });
        } catch (Exception ex) {
            log.warn("[PUBLICACION] No se pudo cancelar la programación del borrador {}: {}", id, ex.getMessage());
        }
    }
}
