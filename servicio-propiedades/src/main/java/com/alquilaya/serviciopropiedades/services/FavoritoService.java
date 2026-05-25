package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.config.CurrentUser;
import com.alquilaya.serviciopropiedades.dto.FavoritoResponseDTO;
import com.alquilaya.serviciopropiedades.dto.PropiedadPublicoDTO;
import com.alquilaya.serviciopropiedades.entities.Favorito;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.repositories.FavoritoRepository;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FavoritoService {

    private final FavoritoRepository favoritoRepository;
    private final PropiedadRepository propiedadRepository;
    private final PropiedadService propiedadService;

    @Transactional
    public boolean toggle(Long propiedadId, CurrentUser current) {
        Long estudianteId = validarEstudiante(current);

        if (!propiedadRepository.existsById(propiedadId)) {
            throw new IllegalArgumentException("No existe la propiedad " + propiedadId);
        }

        int eliminados = favoritoRepository.deleteByEstudianteIdAndPropiedadId(estudianteId, propiedadId);
        if (eliminados > 0) {
            log.info("❤️ Favorito eliminado: estudiante={} propiedad={}", estudianteId, propiedadId);
            return false;
        }
        favoritoRepository.save(Favorito.builder()
                .estudianteId(estudianteId)
                .propiedadId(propiedadId)
                .build());
        log.info("❤️ Favorito agregado: estudiante={} propiedad={}", estudianteId, propiedadId);
        return true;
    }

    public List<FavoritoResponseDTO> listarMis(CurrentUser current) {
        Long estudianteId = validarEstudiante(current);
        List<Favorito> favoritos = favoritoRepository.findByEstudianteIdOrderByFechaCreacionDesc(estudianteId);
        if (favoritos.isEmpty()) return List.of();

        List<Long> ids = favoritos.stream().map(Favorito::getPropiedadId).toList();
        List<Propiedad> propiedades = propiedadRepository.findAllById(ids);

        // Batch enrich: una sola llamada Feign al servicio-usuarios para todos los
        // arrendadores de los favoritos (anti N+1).
        List<PropiedadPublicoDTO> dtos = propiedadService.toPublicoBatch(propiedades);
        Map<Long, PropiedadPublicoDTO> dtoPorId = dtos.stream()
                .collect(Collectors.toMap(PropiedadPublicoDTO::getId, Function.identity()));

        return favoritos.stream()
                .map(f -> FavoritoResponseDTO.builder()
                        .id(f.getId())
                        .estudianteId(f.getEstudianteId())
                        .fechaCreacion(f.getFechaCreacion())
                        .propiedad(dtoPorId.get(f.getPropiedadId()))
                        .build())
                .toList();
    }

    public boolean esFavorito(Long propiedadId, CurrentUser current) {
        Long estudianteId = validarEstudiante(current);
        return favoritoRepository.existsByEstudianteIdAndPropiedadId(estudianteId, propiedadId);
    }

    public Favorito obtenerPorId(Long id) {
        return favoritoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("No existe el favorito " + id));
    }

    @Transactional
    public void eliminarFavorito(Long id) {
        if (!favoritoRepository.existsById(id)) {
            throw new IllegalArgumentException("No existe el favorito " + id);
        }
        favoritoRepository.deleteById(id);
    }

    private Long validarEstudiante(CurrentUser current) {
        if (current == null || current.getPerfilId() == null) {
            throw new IllegalStateException("No hay perfilId en el contexto de seguridad");
        }
        if (!"ESTUDIANTE".equalsIgnoreCase(current.getRol())) {
            throw new IllegalStateException("Solo un estudiante puede gestionar favoritos");
        }
        return current.getPerfilId();
    }
}
