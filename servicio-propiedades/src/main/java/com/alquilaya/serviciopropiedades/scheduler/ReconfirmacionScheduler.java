package com.alquilaya.serviciopropiedades.scheduler;

import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Caducidad de avisos (#49): marca como "requiere reconfirmación" los avisos aprobados que
 * llevan demasiado tiempo sin que el arrendador confirme que siguen vigentes. NO los oculta
 * (no destructivo): solo levanta la bandera para pedirle al dueño que reconfirme.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReconfirmacionScheduler {

    private final PropiedadRepository propiedadRepository;

    /** Días sin reconfirmar tras los que se pide al arrendador re-confirmar. */
    @Value("${avisos.caducidad.dias:60}")
    private long diasCaducidad;

    /** Corre una vez al día (por defecto). */
    @Scheduled(fixedDelayString = "${avisos.caducidad.intervalo-ms:86400000}")
    public void marcarCaducados() {
        LocalDateTime limite = LocalDateTime.now().minusDays(diasCaducidad);
        List<Propiedad> caducados = propiedadRepository.findCaducados(EstadoPropiedad.APROBADO, limite);
        if (caducados.isEmpty()) {
            return;
        }
        for (Propiedad p : caducados) {
            p.setRequiereReconfirmacion(true);
        }
        propiedadRepository.saveAll(caducados);
        log.info("[CADUCIDAD] {} aviso(s) marcado(s) para reconfirmación (sin confirmar en {}+ días)",
                caducados.size(), diasCaducidad);
    }
}
