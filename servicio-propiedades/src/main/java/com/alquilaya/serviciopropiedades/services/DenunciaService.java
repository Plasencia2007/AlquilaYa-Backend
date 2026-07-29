package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.dto.DenunciaConteosDTO;
import com.alquilaya.serviciopropiedades.dto.DenunciaDTO;
import com.alquilaya.serviciopropiedades.entities.Denuncia;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.enums.EstadoDenuncia;
import com.alquilaya.serviciopropiedades.enums.MotivoDenuncia;
import com.alquilaya.serviciopropiedades.repositories.DenunciaRepository;
import com.alquilaya.serviciopropiedades.repositories.DenunciaRepository.ConteoPorPropiedad;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DenunciaService {

    private final DenunciaRepository denunciaRepository;
    private final PropiedadRepository propiedadRepository;
    private final KafkaProducerService kafkaProducerService;

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
        // Notif admin (gap #2/3): alerta a todos los admins activos que hay una denuncia nueva.
        kafkaProducerService.enviarDenunciaCreada(guardada.getId(), propiedadId, propiedad.getTitulo(),
                motivo != null ? motivo.name() : null);
        return guardada;
    }

    /** Lista paginada para el admin (todas o filtradas por estado). */
    @Transactional(readOnly = true)
    public Page<DenunciaDTO> listar(EstadoDenuncia estado, Pageable pageable) {
        Page<Denuncia> page = (estado == null)
                ? denunciaRepository.findAllByOrderByFechaCreacionDesc(pageable)
                : denunciaRepository.findByEstadoOrderByFechaCreacionDesc(estado, pageable);

        // Conteo total (cualquier estado) por propiedad, en batch, para calcular la
        // "severidad real" en el frontend (ítem 376) sin N+1 queries.
        java.util.List<Long> propiedadIds = page.getContent().stream()
                .map(Denuncia::getPropiedadId)
                .distinct()
                .toList();
        Map<Long, Long> conteoPorPropiedad = propiedadIds.isEmpty()
                ? Map.of()
                : denunciaRepository.countByPropiedadIdIn(propiedadIds).stream()
                        .collect(Collectors.toMap(ConteoPorPropiedad::getPropiedadId, ConteoPorPropiedad::getTotal));

        return page.map(d -> DenunciaDTO.de(
                d, tituloDe(d.getPropiedadId()), conteoPorPropiedad.getOrDefault(d.getPropiedadId(), 1L)));
    }

    /** Cambia el estado de gestión de una denuncia (admin). */
    @Transactional
    public DenunciaDTO actualizarEstado(Long denunciaId, EstadoDenuncia nuevoEstado) {
        Denuncia d = denunciaRepository.findById(denunciaId)
                .orElseThrow(() -> new EntityNotFoundException("Denuncia no encontrada: " + denunciaId));
        d.setEstado(nuevoEstado);
        Denuncia guardada = denunciaRepository.save(d);
        long totalPropiedad = denunciaRepository.countByPropiedadIdAndEstado(d.getPropiedadId(), EstadoDenuncia.PENDIENTE)
                + denunciaRepository.countByPropiedadIdAndEstado(d.getPropiedadId(), EstadoDenuncia.REVISADA)
                + denunciaRepository.countByPropiedadIdAndEstado(d.getPropiedadId(), EstadoDenuncia.DESCARTADA);
        return DenunciaDTO.de(guardada, tituloDe(d.getPropiedadId()), totalPropiedad);
    }

    @Transactional(readOnly = true)
    public long contarPendientes(Long propiedadId) {
        return denunciaRepository.countByPropiedadIdAndEstado(propiedadId, EstadoDenuncia.PENDIENTE);
    }

    /** Conteo agregado por estado (ítem 376), para la card "Por Revisar" del panel admin. */
    @Transactional(readOnly = true)
    public DenunciaConteosDTO conteos() {
        long pendientes = denunciaRepository.countByEstado(EstadoDenuncia.PENDIENTE);
        long revisadas = denunciaRepository.countByEstado(EstadoDenuncia.REVISADA);
        long descartadas = denunciaRepository.countByEstado(EstadoDenuncia.DESCARTADA);
        return new DenunciaConteosDTO(pendientes, revisadas, descartadas, pendientes + revisadas + descartadas);
    }

    private String tituloDe(Long propiedadId) {
        return propiedadRepository.findById(propiedadId)
                .map(Propiedad::getTitulo)
                .orElse("(propiedad eliminada)");
    }
}
