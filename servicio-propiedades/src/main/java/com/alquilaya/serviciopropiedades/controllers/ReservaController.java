package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.config.CurrentUserProvider;
import com.alquilaya.serviciopropiedades.dto.CrearReservaRequest;
import com.alquilaya.serviciopropiedades.dto.ReservaResponseDTO;
import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import com.alquilaya.serviciopropiedades.services.ReservaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/reservas")
@RequiredArgsConstructor
public class ReservaController {

    private final ReservaService reservaService;

    @PostMapping
    @PreAuthorize("@permisoEnforcer.tienePermiso('RESERVAR')")
    public ResponseEntity<ReservaResponseDTO> crear(@Valid @RequestBody CrearReservaRequest req) {
        Reserva r = reservaService.crearSolicitud(req, CurrentUserProvider.get());
        return ResponseEntity.ok(toResponseDTO(r));
    }

    @GetMapping("/mis")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ReservaResponseDTO>> misReservas() {
        Long estudianteId = CurrentUserProvider.requirePerfilId();
        return ResponseEntity.ok(reservaService.listarDelEstudiante(estudianteId)
                .stream().map(this::toResponseDTO).toList());
    }

    @GetMapping("/arrendador")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_RESERVAS')")
    public ResponseEntity<List<ReservaResponseDTO>> misReservasComoArrendador() {
        Long arrendadorId = CurrentUserProvider.requirePerfilId();
        return ResponseEntity.ok(reservaService.listarDelArrendador(arrendadorId)
                .stream().map(this::toResponseDTO).toList());
    }

    @GetMapping("/arrendador/estado/{estado}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_RESERVAS')")
    public ResponseEntity<List<ReservaResponseDTO>> porEstado(@PathVariable EstadoReserva estado) {
        Long arrendadorId = CurrentUserProvider.requirePerfilId();
        return ResponseEntity.ok(reservaService.listarDelArrendadorPorEstado(arrendadorId, estado)
                .stream().map(this::toResponseDTO).toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReservaResponseDTO> obtenerPorId(@PathVariable Long id) {
        Reserva r = reservaService.obtenerPorId(id);
        return ResponseEntity.ok(toResponseDTO(r));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_RESERVAS')")
    public ResponseEntity<ReservaResponseDTO> actualizar(@PathVariable Long id, @RequestBody Reserva updates) {
        Reserva r = reservaService.actualizarReserva(id, updates);
        return ResponseEntity.ok(toResponseDTO(r));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_RESERVAS')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        reservaService.eliminarReserva(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/aprobar")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_RESERVAS')")
    public ResponseEntity<ReservaResponseDTO> aprobar(@PathVariable Long id) {
        Reserva r = reservaService.aprobar(id, CurrentUserProvider.get());
        return ResponseEntity.ok(toResponseDTO(r));
    }

    @PatchMapping("/{id}/rechazar")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_RESERVAS')")
    public ResponseEntity<ReservaResponseDTO> rechazar(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String motivo = body != null ? body.getOrDefault("motivo", "") : "";
        Reserva r = reservaService.rechazar(id, motivo, CurrentUserProvider.get());
        return ResponseEntity.ok(toResponseDTO(r));
    }

    @PatchMapping("/{id}/cancelar")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReservaResponseDTO> cancelar(@PathVariable Long id) {
        Reserva r = reservaService.cancelar(id, CurrentUserProvider.get());
        return ResponseEntity.ok(toResponseDTO(r));
    }

    @PatchMapping("/{id}/finalizar")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_RESERVAS')")
    public ResponseEntity<ReservaResponseDTO> finalizar(@PathVariable Long id) {
        Reserva r = reservaService.finalizar(id, CurrentUserProvider.get());
        return ResponseEntity.ok(toResponseDTO(r));
    }

    @PatchMapping("/{id}/pagar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ReservaResponseDTO> marcarPagada(@PathVariable Long id) {
        Reserva r = reservaService.marcarPagada(id);
        return ResponseEntity.ok(toResponseDTO(r));
    }

    private ReservaResponseDTO toResponseDTO(Reserva r) {
        String titulo = reservaService.obtenerTituloPropiedad(r.getPropiedadId());
        String estNombre = "Estudiante " + r.getEstudianteId();
        String estCorreo = "";
        
        try {
            var est = reservaService.obtenerInfoEstudiante(r.getEstudianteId());
            if (est != null) {
                estNombre = est.getNombre() + " " + (est.getApellido() != null ? est.getApellido() : "");
                estCorreo = est.getCorreo();
            }
        } catch (Exception e) {
            log.warn("Error obteniendo info del estudiante {} para el DTO: {}", r.getEstudianteId(), e.getMessage());
        }
        
        return ReservaResponseDTO.from(r, titulo, estNombre, estCorreo);
    }
}
