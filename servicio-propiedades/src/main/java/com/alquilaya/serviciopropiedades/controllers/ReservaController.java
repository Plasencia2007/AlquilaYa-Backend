package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.config.CurrentUserProvider;
import com.alquilaya.serviciopropiedades.dto.CrearReservaRequest;
import com.alquilaya.serviciopropiedades.dto.ReservaResponseDTO;
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
        return ResponseEntity.ok(ReservaResponseDTO.from(
                reservaService.crearSolicitud(req, CurrentUserProvider.get())));
    }

    @GetMapping("/mis")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ReservaResponseDTO>> misReservas() {
        Long estudianteId = CurrentUserProvider.requirePerfilId();
        return ResponseEntity.ok(reservaService.listarDelEstudiante(estudianteId)
                .stream().map(ReservaResponseDTO::from).toList());
    }

    @GetMapping("/arrendador")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_RESERVAS')")
    public ResponseEntity<List<ReservaResponseDTO>> misReservasComoArrendador() {
        Long arrendadorId = CurrentUserProvider.requirePerfilId();
        return ResponseEntity.ok(reservaService.listarDelArrendador(arrendadorId)
                .stream().map(ReservaResponseDTO::from).toList());
    }

    @GetMapping("/arrendador/estado/{estado}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_RESERVAS')")
    public ResponseEntity<List<ReservaResponseDTO>> porEstado(@PathVariable EstadoReserva estado) {
        Long arrendadorId = CurrentUserProvider.requirePerfilId();
        return ResponseEntity.ok(reservaService.listarDelArrendadorPorEstado(arrendadorId, estado)
                .stream().map(ReservaResponseDTO::from).toList());
    }

    @PatchMapping("/{id}/aprobar")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_RESERVAS')")
    public ResponseEntity<ReservaResponseDTO> aprobar(@PathVariable Long id) {
        return ResponseEntity.ok(ReservaResponseDTO.from(
                reservaService.aprobar(id, CurrentUserProvider.get())));
    }

    @PatchMapping("/{id}/rechazar")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_RESERVAS')")
    public ResponseEntity<ReservaResponseDTO> rechazar(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String motivo = body != null ? body.getOrDefault("motivo", "") : "";
        return ResponseEntity.ok(ReservaResponseDTO.from(
                reservaService.rechazar(id, motivo, CurrentUserProvider.get())));
    }

    @PatchMapping("/{id}/cancelar")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReservaResponseDTO> cancelar(@PathVariable Long id) {
        return ResponseEntity.ok(ReservaResponseDTO.from(
                reservaService.cancelar(id, CurrentUserProvider.get())));
    }

    @PatchMapping("/{id}/finalizar")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_RESERVAS')")
    public ResponseEntity<ReservaResponseDTO> finalizar(@PathVariable Long id) {
        return ResponseEntity.ok(ReservaResponseDTO.from(
                reservaService.finalizar(id, CurrentUserProvider.get())));
    }

    /**
     * Endpoint interno — invocado por servicio-pagos al confirmar el webhook de MercadoPago.
     * Se deja abierto a ADMIN hasta que servicio-pagos tenga su propio JWT de sistema.
     */
    @PatchMapping("/{id}/pagar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ReservaResponseDTO> marcarPagada(@PathVariable Long id) {
        return ResponseEntity.ok(ReservaResponseDTO.from(reservaService.marcarPagada(id)));
    }
}
