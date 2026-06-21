package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.dto.PropiedadAdminDTO;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
import com.alquilaya.serviciopropiedades.enums.PoliticaCancelacion;
import com.alquilaya.serviciopropiedades.repositories.HabitacionRepository;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.services.PropiedadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin/propiedades")
@RequiredArgsConstructor
public class AdminPropiedadController {

    private final PropiedadRepository propiedadRepository;
    private final PropiedadService propiedadService;
    private final HabitacionRepository habitacionRepository;

    @GetMapping("/pendientes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PropiedadAdminDTO>> listarPendientes() {
        List<PropiedadAdminDTO> dtos = propiedadRepository
                .findByEstadoOrderByFechaCreacionAsc(EstadoPropiedad.PENDIENTE)
                .stream()
                .map(propiedadService::toAdmin)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PropiedadAdminDTO> verDetalle(@PathVariable Long id) {
        return propiedadRepository.findById(id)
                .map(p -> ResponseEntity.ok(propiedadService.toAdmin(p)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/aprobar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Propiedad> aprobar(@PathVariable Long id) {
        return propiedadRepository.findById(id)
                .map(p -> {
                    // Un inmueble gestionado por habitaciones no es reservable sin cuartos:
                    // no se aprueba si no tiene ninguno registrado.
                    if (Boolean.TRUE.equals(p.getGestionPorHabitacion())
                            && habitacionRepository.countByPropiedadId(id) == 0) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                "No se puede aprobar: el inmueble se alquila por habitaciones pero no tiene ninguna registrada.");
                    }
                    p.setAprobadoPorAdmin(true);
                    p.setEstado(EstadoPropiedad.APROBADO);
                    log.info("[ADMIN] Propiedad {} aprobada", id);
                    return ResponseEntity.ok(propiedadRepository.save(p));
                }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/rechazar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Propiedad> rechazar(@PathVariable Long id) {
        return propiedadRepository.findById(id)
                .map(p -> {
                    p.setAprobadoPorAdmin(false);
                    p.setEstado(EstadoPropiedad.RECHAZADO);
                    log.info("[ADMIN] Propiedad {} rechazada", id);
                    return ResponseEntity.ok(propiedadRepository.save(p));
                }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Override de moderación: el admin cambia la política de cancelación de cualquier
     * propiedad. Body: {"politica": "FLEXIBLE|MODERADA|ESTRICTA"}. Solo afecta cancelaciones
     * futuras (la política se evalúa al cancelar). Invalida la caché del listado porque la
     * política se expone en el DTO público.
     */
    @PatchMapping("/{id}/politica-cancelacion")
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = "propiedades:listado", allEntries = true)
    public ResponseEntity<Propiedad> cambiarPoliticaCancelacion(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        String raw = body != null ? body.get("politica") : null;
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indica la política de cancelación.");
        }
        final PoliticaCancelacion politica;
        try {
            politica = PoliticaCancelacion.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Política inválida: " + raw);
        }
        return propiedadRepository.findById(id)
                .map(p -> {
                    p.setPoliticaCancelacion(politica);
                    log.info("[ADMIN] Política de cancelación de propiedad {} cambiada a {}", id, politica);
                    return ResponseEntity.ok(propiedadRepository.save(p));
                }).orElse(ResponseEntity.notFound().build());
    }
}
