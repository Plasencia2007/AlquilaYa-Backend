package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.clients.UsuariosClient;
import com.alquilaya.serviciopropiedades.config.CurrentUser;
import com.alquilaya.serviciopropiedades.config.CurrentUserProvider;
import com.alquilaya.serviciopropiedades.dto.ArrendadorInfoDTO;
import com.alquilaya.serviciopropiedades.dto.HabitacionRequest;
import com.alquilaya.serviciopropiedades.dto.HabitacionResponse;
import com.alquilaya.serviciopropiedades.entities.Habitacion;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.repositories.HabitacionRepository;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.services.CloudinaryCleanupQueueService;
import com.alquilaya.serviciopropiedades.services.CloudinaryService;
import com.alquilaya.serviciopropiedades.services.HabitacionService;
import com.alquilaya.serviciopropiedades.validaciones.validators.ArchivoImagenValidoValidator;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * CRUD de habitaciones de una propiedad gestionada por habitaciones. El listado es público
 * (la ficha del estudiante lo usa); las mutaciones son del dueño de la propiedad o ADMIN.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/propiedades/{propiedadId}/habitaciones")
@RequiredArgsConstructor
public class HabitacionController {

    /** Máximo de fotos por habitación (consistente con el límite de fotos de propiedad). */
    private static final int MAX_IMAGENES_HABITACION = 8;

    private final HabitacionService habitacionService;
    private final PropiedadRepository propiedadRepository;
    private final HabitacionRepository habitacionRepository;
    private final CloudinaryService cloudinaryService;
    private final CloudinaryCleanupQueueService cloudinaryCleanupQueue;
    private final UsuariosClient usuariosClient;

    @GetMapping
    public List<HabitacionResponse> listar(@PathVariable Long propiedadId) {
        return habitacionService.listar(propiedadId);
    }

    @PostMapping
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    @CacheEvict(value = "propiedades:listado", allEntries = true)
    public ResponseEntity<HabitacionResponse> crear(@PathVariable Long propiedadId,
                                                    @Valid @RequestBody HabitacionRequest req) {
        verificarPropietarioOAdmin(propiedadId);
        return ResponseEntity.status(HttpStatus.CREATED).body(habitacionService.crear(propiedadId, req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    @CacheEvict(value = "propiedades:listado", allEntries = true)
    public ResponseEntity<HabitacionResponse> actualizar(@PathVariable Long propiedadId,
                                                         @PathVariable Long id,
                                                         @Valid @RequestBody HabitacionRequest req) {
        verificarPropietarioOAdmin(propiedadId);
        return ResponseEntity.ok(habitacionService.actualizar(propiedadId, id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    @CacheEvict(value = "propiedades:listado", allEntries = true)
    public ResponseEntity<Void> eliminar(@PathVariable Long propiedadId, @PathVariable Long id) {
        verificarPropietarioOAdmin(propiedadId);
        habitacionService.eliminar(propiedadId, id);
        return ResponseEntity.noContent().build();
    }

    // ===== Imágenes por habitación =====

    @PostMapping(value = "/{habitacionId}/imagenes", consumes = {"multipart/form-data"})
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    @CacheEvict(value = "propiedades:listado", allEntries = true)
    public ResponseEntity<HabitacionResponse> subirImagenes(
            @PathVariable Long propiedadId,
            @PathVariable Long habitacionId,
            @RequestPart("files") List<MultipartFile> files
    ) throws IOException {
        Propiedad propiedad = verificarPropietarioOAdmin(propiedadId);
        Habitacion habitacion = habitacionRepository.findByIdAndPropiedadId(habitacionId, propiedadId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Habitación no encontrada"));

        List<String> imagenesActuales = habitacion.getImagenes();
        int base = imagenesActuales.size();
        long aSubir = files.stream().filter(f -> f != null && !f.isEmpty()).count();
        if (base + aSubir > MAX_IMAGENES_HABITACION) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Esta habitación admite un máximo de " + MAX_IMAGENES_HABITACION + " fotos.");
        }

        String nombreArrendador = resolverNombreArrendador(propiedad.getArrendadorId());
        for (int i = 0; i < files.size(); i++) {
            MultipartFile f = files.get(i);
            if (f.isEmpty()) continue;
            String errorValidacion = ArchivoImagenValidoValidator.validar(f);
            if (errorValidacion != null) {
                throw new IllegalArgumentException("Archivo " + f.getOriginalFilename() + ": " + errorValidacion);
            }
            int indice = base + i;
            CloudinaryService.ImagenSubida sub = cloudinaryService.uploadImagenCuarto(
                    f, propiedad.getArrendadorId(), nombreArrendador, propiedadId, indice);
            imagenesActuales.add(sub.url());
        }
        habitacion.setImagenes(imagenesActuales);
        Habitacion guardada = habitacionRepository.save(habitacion);
        return ResponseEntity.ok(HabitacionResponse.from(guardada));
    }

    @DeleteMapping("/{habitacionId}/imagenes")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    @CacheEvict(value = "propiedades:listado", allEntries = true)
    public ResponseEntity<HabitacionResponse> eliminarImagen(
            @PathVariable Long propiedadId,
            @PathVariable Long habitacionId,
            @RequestBody Map<String, String> body
    ) {
        verificarPropietarioOAdmin(propiedadId);
        Habitacion habitacion = habitacionRepository.findByIdAndPropiedadId(habitacionId, propiedadId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Habitación no encontrada"));

        String url = body != null ? body.get("url") : null;
        if (url == null || url.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Falta la URL de la imagen a eliminar.");
        }

        boolean eliminada = habitacion.getImagenes().remove(url);
        if (!eliminada) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Esa imagen no pertenece a la habitación.");
        }
        Habitacion guardada = habitacionRepository.save(habitacion);

        try {
            cloudinaryService.eliminarPorUrl(url);
        } catch (Exception e) {
            log.warn("[DELETE-HABITACION-IMG] Fallo borrando {} en Cloudinary, encolando: {}", url, e.getMessage());
            cloudinaryCleanupQueue.encolar(url);
        }

        return ResponseEntity.ok(HabitacionResponse.from(guardada));
    }

    private String resolverNombreArrendador(Long arrendadorId) {
        if (arrendadorId == null) return null;
        try {
            ArrendadorInfoDTO info = usuariosClient.obtenerArrendador(arrendadorId);
            if (info == null) return null;
            String n = info.getNombre() == null ? "" : info.getNombre();
            String a = info.getApellido() == null ? "" : info.getApellido();
            String completo = (n + " " + a).trim();
            return completo.isEmpty() ? null : completo;
        } catch (Exception e) {
            log.warn("No pude resolver nombre arrendador {} para Cloudinary: {}", arrendadorId, e.getMessage());
            return null;
        }
    }

    private Propiedad verificarPropietarioOAdmin(Long propiedadId) {
        Propiedad p = propiedadRepository.findById(propiedadId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Propiedad no encontrada"));
        CurrentUser cu = CurrentUserProvider.get();
        if (cu == null) {
            throw new AccessDeniedException("No autenticado.");
        }
        if ("ADMIN".equalsIgnoreCase(cu.getRol())) {
            return p;
        }
        if (cu.getPerfilId() == null || !cu.getPerfilId().equals(p.getArrendadorId())) {
            throw new AccessDeniedException("No puedes gestionar habitaciones de una propiedad que no es tuya.");
        }
        return p;
    }
}
