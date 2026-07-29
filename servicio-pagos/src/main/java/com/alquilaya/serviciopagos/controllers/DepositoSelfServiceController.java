package com.alquilaya.serviciopagos.controllers;

import com.alquilaya.serviciopagos.clients.ReservasClient;
import com.alquilaya.serviciopagos.config.CurrentUser;
import com.alquilaya.serviciopagos.dto.ReservaDetalleDTO;
import com.alquilaya.serviciopagos.entities.Deposito;
import com.alquilaya.serviciopagos.services.DepositoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * G3 self-service (ítem 243): lectura del depósito de garantía de UNA reserva para el
 * estudiante o el arrendador involucrados, separado a propósito del admin-only
 * {@link DepositoController} (que sí gestiona el ciclo de vida completo: capturar,
 * devolver, retener, perder — eso sigue siendo admin-mediado, ver {@link DepositoService}).
 *
 * <p>Decisión de diseño (ítem 243, ver CLAUDE.md de la tarea): {@code Deposito} solo guarda
 * {@code arrendadorId} (y puede venir null — falla silenciosa ya documentada en
 * {@link DepositoService#crear}), no guarda {@code estudianteId}. Para saber "quién es el
 * estudiante/arrendador de esta reserva" reutilizamos el Feign {@link ReservasClient} que YA
 * existe hacia servicio-propiedades (el mismo que usa {@code DepositoService.crear}) en vez de
 * fiarnos solo del campo local — así el check de dueño cubre a ambas partes de forma confiable
 * sin agregar infraestructura nueva entre microservicios.
 */
@RestController
@RequestMapping("/api/v1/pagos/depositos")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class DepositoSelfServiceController {

    private final DepositoService depositoService;
    private final ReservasClient reservasClient;

    /**
     * Depósito más reciente de la reserva (si existe). 404 si la reserva no tiene depósito
     * asociado — no toda reserva PAGADA tiene uno, depende de si el arrendador pidió garantía.
     */
    @GetMapping("/reserva/{reservaId}")
    public ResponseEntity<Deposito> deMiReserva(@PathVariable Long reservaId,
            @AuthenticationPrincipal CurrentUser current) {
        if (current == null || current.getPerfilId() == null) {
            throw new AccessDeniedException("No autenticado");
        }

        ReservaDetalleDTO reserva = reservasClient.obtenerReserva(reservaId);
        boolean esDueno = current.getPerfilId().equals(reserva.getEstudianteId())
                || current.getPerfilId().equals(reserva.getArrendadorId());
        if (!esDueno) {
            throw new AccessDeniedException("Esta reserva no es tuya");
        }

        List<Deposito> historial = depositoService.historialDeReserva(reservaId);
        return historial.isEmpty()
                ? ResponseEntity.notFound().build()
                : ResponseEntity.ok(historial.get(0));
    }

    /**
     * Ítem 327: el arrendador ve el historial COMPLETO de sus depósitos de garantía (transparencia
     * de fondos retenidos/devueltos). Deliberadamente NUEVO y separado del admin-only
     * {@code GET /api/v1/pagos/admin/depositos/arrendador/{id}} de {@link DepositoController}
     * (bloqueado a ADMIN en dos capas: {@code @PreAuthorize} de esa clase + filtro
     * {@code /admin/**} en {@code SecurityConfig}) — este vive fuera de {@code /admin/} y jamás
     * confía en un {@code arrendadorId} de path/body: siempre {@code current.getPerfilId()}.
     *
     * <p>Fuera de alcance (v1): acciones de retención parcial con evidencia — eso sigue siendo
     * flujo de ADMIN/moderación vía {@link DepositoController}, esta ruta es solo lectura.
     */
    @GetMapping("/arrendador")
    @PreAuthorize("hasRole('ARRENDADOR')")
    public List<Deposito> misDepositos(@AuthenticationPrincipal CurrentUser current) {
        if (current == null || current.getPerfilId() == null) {
            throw new AccessDeniedException("No autenticado");
        }
        return depositoService.historialDelArrendador(current.getPerfilId());
    }
}
