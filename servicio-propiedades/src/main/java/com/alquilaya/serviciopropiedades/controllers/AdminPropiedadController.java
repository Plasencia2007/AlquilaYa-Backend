package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin/propiedades")
@RequiredArgsConstructor
public class AdminPropiedadController {

    private final PropiedadRepository propiedadRepository;

    @PatchMapping("/{id}/aprobar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Propiedad> aprobar(@PathVariable Long id) {
        return propiedadRepository.findById(id)
                .map(p -> {
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
}
