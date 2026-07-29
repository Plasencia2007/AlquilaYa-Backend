package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.config.CurrentUserProvider;
import com.alquilaya.serviciopropiedades.dto.ActualizarWhatsappRequest;
import com.alquilaya.serviciopropiedades.dto.CrearGrupoRequest;
import com.alquilaya.serviciopropiedades.dto.CuotaPagoDTO;
import com.alquilaya.serviciopropiedades.dto.GrupoRoommateDTO;
import com.alquilaya.serviciopropiedades.dto.ReservarGrupoRequest;
import com.alquilaya.serviciopropiedades.services.GrupoRoommateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Grupos de roommates (#38 Fase 1b). */
@RestController
@RequestMapping("/api/v1/grupos")
@RequiredArgsConstructor
public class GrupoRoommateController {

    private final GrupoRoommateService grupoService;

    @PostMapping
    public ResponseEntity<GrupoRoommateDTO> crear(@Valid @RequestBody CrearGrupoRequest req) {
        return ResponseEntity.ok(grupoService.crear(req, CurrentUserProvider.requirePerfilId()));
    }

    /**
     * Anti-IDOR (evidencia de auditoría): el servicio solo devuelve {@code codigoInvitacion}
     * si el caller es el creador o ya es miembro activo del grupo; para cualquier otro
     * autenticado (p.ej. iterando ids) el campo llega en null. El caller es "mejor esfuerzo":
     * si no tiene perfilId en el JWT (p.ej. rol sin perfil) simplemente no verá el código.
     */
    @GetMapping("/{id}")
    public ResponseEntity<GrupoRoommateDTO> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(grupoService.obtener(id, callerIdOrNull()));
    }

    /** Grupos abiertos para una propiedad (se muestran en la ficha del depa). */
    @GetMapping("/propiedad/{propiedadId}/abiertos")
    public ResponseEntity<List<GrupoRoommateDTO>> abiertos(@PathVariable Long propiedadId) {
        return ResponseEntity.ok(grupoService.abiertosDePropiedad(propiedadId, callerIdOrNull()));
    }

    @GetMapping("/mios")
    public ResponseEntity<List<GrupoRoommateDTO>> mios() {
        return ResponseEntity.ok(grupoService.misGrupos(CurrentUserProvider.requirePerfilId()));
    }

    /** Pedir unirse a un grupo abierto (queda pendiente de aprobación). */
    @PostMapping("/{id}/solicitar")
    public ResponseEntity<GrupoRoommateDTO> solicitar(@PathVariable Long id) {
        return ResponseEntity.ok(grupoService.solicitar(id, CurrentUserProvider.requirePerfilId()));
    }

    /** Unirse directo con el código del link de invitación (sin aprobación). */
    @PostMapping("/unirse")
    public ResponseEntity<GrupoRoommateDTO> unirse(@RequestParam String codigo) {
        return ResponseEntity.ok(grupoService.unirPorCodigo(codigo, CurrentUserProvider.requirePerfilId()));
    }

    /** El creador aprueba a un solicitante. */
    @PostMapping("/{id}/miembros/{estudianteId}/aprobar")
    public ResponseEntity<GrupoRoommateDTO> aprobar(@PathVariable Long id, @PathVariable Long estudianteId) {
        return ResponseEntity.ok(grupoService.aprobar(id, estudianteId, CurrentUserProvider.requirePerfilId()));
    }

    /** Genera la reserva grupal (creador, grupo COMPLETO) con las cuotas por miembro. */
    @PostMapping("/{id}/reservar")
    public ResponseEntity<GrupoRoommateDTO> reservar(@PathVariable Long id, @Valid @RequestBody ReservarGrupoRequest req) {
        return ResponseEntity.ok(grupoService.reservarGrupo(
                id, CurrentUserProvider.requirePerfilId(), req.getFechaInicio(), req.getFechaFin()));
    }

    /** Cuota del miembro actual en una reserva grupal (la consume pagos para cobrar su parte). */
    @GetMapping("/reserva/{reservaId}/mi-cuota")
    public ResponseEntity<CuotaPagoDTO> miCuota(@PathVariable Long reservaId) {
        return ResponseEntity.ok(grupoService.miCuota(reservaId, CurrentUserProvider.requirePerfilId()));
    }

    /**
     * Progreso de pago de una reserva grupal (todas las cuotas). Anti-IDOR: solo un miembro de
     * esa reserva grupal puede verlo (mismo patrón de validación que {@code miCuota}).
     */
    @GetMapping("/reserva/{reservaId}/cuotas")
    public ResponseEntity<List<CuotaPagoDTO>> cuotas(@PathVariable Long reservaId) {
        return ResponseEntity.ok(grupoService.cuotasDeReserva(reservaId, CurrentUserProvider.requirePerfilId()));
    }

    /**
     * Empuja un recordatorio de WhatsApp a un miembro con cuota pendiente (#281). Anti-IDOR:
     * solo un miembro de esa misma reserva grupal puede recordar (mismo patrón que
     * {@code cuotas}). Cooldown de 24h por cuota (409 si aún no pasó).
     */
    @PostMapping("/reserva/{reservaId}/cuotas/{estudianteId}/recordar")
    public ResponseEntity<Void> recordarCuota(@PathVariable Long reservaId, @PathVariable Long estudianteId) {
        grupoService.recordarCuota(reservaId, estudianteId, CurrentUserProvider.requirePerfilId());
        return ResponseEntity.noContent().build();
    }

    /** Solo el creador puede setear/editar el link del grupo de WhatsApp (#221, bajo costo). */
    @PatchMapping("/{id}/whatsapp")
    public ResponseEntity<GrupoRoommateDTO> actualizarWhatsapp(
            @PathVariable Long id, @Valid @RequestBody ActualizarWhatsappRequest req) {
        return ResponseEntity.ok(grupoService.actualizarWhatsapp(
                id, CurrentUserProvider.requirePerfilId(), req.getLinkWhatsapp()));
    }

    @DeleteMapping("/{id}/salir")
    public ResponseEntity<GrupoRoommateDTO> salir(@PathVariable Long id) {
        return ResponseEntity.ok(grupoService.salir(id, CurrentUserProvider.requirePerfilId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        grupoService.eliminar(id, CurrentUserProvider.requirePerfilId());
        return ResponseEntity.noContent().build();
    }

    /** perfilId del caller si está presente en el JWT, o null (no lanza si falta). */
    private Long callerIdOrNull() {
        var current = CurrentUserProvider.get();
        return current != null ? current.getPerfilId() : null;
    }
}
