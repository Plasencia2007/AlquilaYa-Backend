package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.dto.DenunciaDTO;
import com.alquilaya.serviciopropiedades.entities.Denuncia;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.enums.EstadoDenuncia;
import com.alquilaya.serviciopropiedades.enums.MotivoDenuncia;
import com.alquilaya.serviciopropiedades.repositories.DenunciaRepository;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DenunciaService {

    private final DenunciaRepository denunciaRepository;
    private final PropiedadRepository propiedadRepository;

    /** Registra una denuncia. Evita que el mismo usuario denuncie la misma propiedad dos veces. */
    @Transactional
    public Denuncia crear(Long propiedadId, MotivoDenuncia motivo, String descripcion, Long denuncianteId) {
        Propiedad propiedad = propiedadRepository.findById(propiedadId)
                .orElseThrow(() -> new EntityNotFoundException("Propiedad no encontrada: " + propiedadId));

        if (denuncianteId != null
                && denunciaRepository.existsByPropiedadIdAndDenuncianteId(propiedadId, denuncianteId)) {
            throw new IllegalStateException("Ya reportaste esta publicación.");
        }

        Denuncia d = Denuncia.builder()
                .propiedadId(propiedad.getId())
                .denuncianteId(denuncianteId)
                .motivo(motivo)
                .descripcion(descripcion)
                .estado(EstadoDenuncia.PENDIENTE)
                .build();
        Denuncia guardada = denunciaRepository.save(d);
        log.info("[DENUNCIA] propiedad={} motivo={} por perfil={}", propiedadId, motivo, denuncianteId);
        return guardada;
    }

    /** Lista paginada para el admin (todas o filtradas por estado). */
    @Transactional(readOnly = true)
    public Page<DenunciaDTO> listar(EstadoDenuncia estado, Pageable pageable) {
        Page<Denuncia> page = (estado == null)
                ? denunciaRepository.findAllByOrderByFechaCreacionDesc(pageable)
                : denunciaRepository.findByEstadoOrderByFechaCreacionDesc(estado, pageable);
        return page.map(d -> DenunciaDTO.de(d, tituloDe(d.getPropiedadId())));
    }

    /** Cambia el estado de gestión de una denuncia (admin). */
    @Transactional
    public DenunciaDTO actualizarEstado(Long denunciaId, EstadoDenuncia nuevoEstado) {
        Denuncia d = denunciaRepository.findById(denunciaId)
                .orElseThrow(() -> new EntityNotFoundException("Denuncia no encontrada: " + denunciaId));
        d.setEstado(nuevoEstado);
        return DenunciaDTO.de(denunciaRepository.save(d), tituloDe(d.getPropiedadId()));
    }

    @Transactional(readOnly = true)
    public long contarPendientes(Long propiedadId) {
        return denunciaRepository.countByPropiedadIdAndEstado(propiedadId, EstadoDenuncia.PENDIENTE);
    }

    private String tituloDe(Long propiedadId) {
        return propiedadRepository.findById(propiedadId)
                .map(Propiedad::getTitulo)
                .orElse("(propiedad eliminada)");
    }
}
