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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
    private final com.alquilaya.serviciopropiedades.services.ContratoService contratoService;
    // Ítem 238: horas configurables de expiración de una reserva APROBADA sin pagar.
    private final com.alquilaya.serviciopropiedades.services.ConfiguracionReservaService configuracionReservaService;

    @PostMapping
    @PreAuthorize("@permisoEnforcer.tienePermiso('RESERVAR')")
    public ResponseEntity<ReservaResponseDTO> crear(@Valid @RequestBody CrearReservaRequest req) {
        Reserva r = reservaService.crearSolicitud(req, CurrentUserProvider.get());
        return ResponseEntity.ok(toResponseDTO(r));
    }

    /**
     * Ítem 234: paginación real de "mis reservas". {@code estado} es opcional — si viene,
     * pagina DENTRO de ese filtro (mismo comportamiento que las tabs de estado de la UI).
     */
    @GetMapping("/mis")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<ReservaResponseDTO>> misReservas(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) EstadoReserva estado) {
        Long estudianteId = CurrentUserProvider.requirePerfilId();
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        return ResponseEntity.ok(reservaService.listarDelEstudiante(estudianteId, estado, pageable)
                .map(this::toResponseDTO));
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
        Reserva r = reservaService.obtenerPropia(id, CurrentUserProvider.get());
        return ResponseEntity.ok(toResponseDTO(r));
    }

    /** G4: PDF del contrato. Misma regla de acceso que ver la reserva (dueños o admin). */
    @GetMapping("/{id}/contrato")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> contrato(@PathVariable Long id) {
        // Reusa la MISMA validación de acceso que GET /{id} (participante o admin) antes de generar el PDF.
        reservaService.obtenerPropia(id, CurrentUserProvider.get());
        byte[] pdf = contratoService.generarPdf(id);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, "application/pdf")
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"contrato-reserva-" + id + ".pdf\"")
                .body(pdf);
    }

    /** G4: aceptación electrónica del contrato por la parte autenticada (estudiante o arrendador). */
    @PostMapping("/{id}/contrato/firmar")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReservaResponseDTO> firmarContrato(@PathVariable Long id) {
        Reserva r = contratoService.firmar(id, CurrentUserProvider.get());
        return ResponseEntity.ok(toResponseDTO(r));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_RESERVAS')")
    public ResponseEntity<ReservaResponseDTO> actualizar(@PathVariable Long id, @RequestBody Reserva updates) {
        Reserva r = reservaService.actualizarReserva(id, updates, CurrentUserProvider.get());
        return ResponseEntity.ok(toResponseDTO(r));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_RESERVAS')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        reservaService.eliminarReserva(id, CurrentUserProvider.get());
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
    public ResponseEntity<ReservaResponseDTO> cancelar(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        String motivo = body != null ? body.getOrDefault("motivo", "") : "";
        Reserva r = reservaService.cancelar(id, motivo, CurrentUserProvider.get());
        return ResponseEntity.ok(toResponseDTO(r));
    }

    @PatchMapping("/{id}/finalizar")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_RESERVAS')")
    public ResponseEntity<ReservaResponseDTO> finalizar(@PathVariable Long id) {
        Reserva r = reservaService.finalizar(id, CurrentUserProvider.get());
        return ResponseEntity.ok(toResponseDTO(r));
    }

    private ReservaResponseDTO toResponseDTO(Reserva r) {
        String titulo = reservaService.obtenerTituloPropiedad(r.getPropiedadId());
        String estNombre = "Estudiante " + r.getEstudianteId();
        String estCorreo = "";
        Integer estScore = null;
        String estNivel = null;
        String estTelefono = "";
        String estUniversidad = "";
        String estCarrera = "";
        Boolean estVerificado = false;

        try {
            var est = reservaService.obtenerInfoEstudiante(r.getEstudianteId());
            if (est != null) {
                estNombre = est.getNombre() + " " + (est.getApellido() != null ? est.getApellido() : "");
                estCorreo = est.getCorreo();
                estScore = est.getScore();
                estNivel = est.getNivelReputacion();
                estTelefono = est.getTelefono();
                estUniversidad = est.getUniversidad();
                estCarrera = est.getCarrera();
                estVerificado = est.getVerificado();
            }
        } catch (Exception e) {
            log.warn("Error obteniendo info del estudiante {} para el DTO: {}", r.getEstudianteId(), e.getMessage());
        }

        ReservaResponseDTO dto = ReservaResponseDTO.from(r, titulo, estNombre, estCorreo);
        dto.setEstudianteScore(estScore);
        dto.setEstudianteNivelReputacion(estNivel);
        dto.setEstudianteTelefono(estTelefono);
        dto.setEstudianteUniversidad(estUniversidad);
        dto.setEstudianteCarrera(estCarrera);
        dto.setEstudianteVerificado(estVerificado);
        // Si ya se pagó, usamos la comisión snapshotteada (histórica); si no, la calculamos en
        // vivo desde la zona para que el estudiante vea el cargo antes de pagar.
        dto.setComision(r.getComision() != null
                ? r.getComision()
                : reservaService.calcularComision(r.getPropiedadId(), r.getMontoTotal()));

        // Ítem 238: countdown de expiración — solo aplica mientras la reserva sigue APROBADA
        // esperando pago. Mismo reloj de referencia (fechaActualizacion) que usa el scheduler
        // que de verdad la expira (ReservaExpirationScheduler), para que el countdown del
        // frontend nunca se adelante ni se atrase respecto a cuándo el backend la expira.
        if (r.getEstado() == EstadoReserva.APROBADA && r.getFechaActualizacion() != null) {
            int horas = configuracionReservaService.getExpiracionHoras();
            dto.setFechaExpiracion(r.getFechaActualizacion().plusHours(horas));
        }
        return dto;
    }
}
