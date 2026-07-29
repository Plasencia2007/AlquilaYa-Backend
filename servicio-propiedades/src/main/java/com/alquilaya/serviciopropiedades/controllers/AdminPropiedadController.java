package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.config.CurrentUser;
import com.alquilaya.serviciopropiedades.config.CurrentUserProvider;
import com.alquilaya.serviciopropiedades.dto.DecisionModeracionPropiedadDTO;
import com.alquilaya.serviciopropiedades.dto.PropiedadAdminDTO;
import com.alquilaya.serviciopropiedades.dto.SenalFraudeDTO;
import com.alquilaya.serviciopropiedades.entities.DecisionModeracionPropiedad;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
import com.alquilaya.serviciopropiedades.enums.PoliticaCancelacion;
import com.alquilaya.serviciopropiedades.repositories.DecisionModeracionPropiedadRepository;
import com.alquilaya.serviciopropiedades.repositories.HabitacionRepository;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.services.DenunciaService;
import com.alquilaya.serviciopropiedades.services.KafkaProducerService;
import com.alquilaya.serviciopropiedades.services.PropiedadService;
import com.alquilaya.serviciopropiedades.services.SenalesFraudeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
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
    private final SenalesFraudeService senalesFraudeService;
    private final DenunciaService denunciaService;
    private final KafkaProducerService kafkaProducerService;
    private final DecisionModeracionPropiedadRepository decisionModeracionRepository;

    /** Resumen de confianza de una propiedad: señales de fraude (#48/#50) + denuncias pendientes (#46). */
    public record ConfianzaDTO(List<SenalFraudeDTO> senales, long denunciasPendientes) {}

    @GetMapping("/{id}/confianza")
    @PreAuthorize("@permisoEnforcer.tienePermiso('MODERAR_PROPIEDADES')")
    public ResponseEntity<ConfianzaDTO> confianza(@PathVariable Long id) {
        return propiedadRepository.findById(id)
                .map(p -> ResponseEntity.ok(new ConfianzaDTO(
                        senalesFraudeService.calcular(p),
                        denunciaService.contarPendientes(id))))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/pendientes")
    @PreAuthorize("@permisoEnforcer.tienePermiso('MODERAR_PROPIEDADES')")
    public ResponseEntity<List<PropiedadAdminDTO>> listarPendientes() {
        List<PropiedadAdminDTO> dtos = propiedadRepository
                .findByEstadoOrderByFechaCreacionAsc(EstadoPropiedad.PENDIENTE)
                .stream()
                .map(propiedadService::toAdmin)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    /**
     * Ítem 389: TODAS las propiedades (cualquier estado de moderación), para el mapa admin
     * (pestaña "Mapa" de {@code metrics/heatmap/page.tsx}) coloreado por estado. {@code estado}
     * opcional filtra a uno solo; sin filtro devuelve todas excepto BORRADOR (ver
     * {@link PropiedadRepository#findByEstadoNotOrderByFechaCreacionAsc}). Sin paginar: incluso
     * sin filtro, el volumen actual de la plataforma no lo justifica todavía (mismo criterio que
     * {@link #listarPendientes}).
     */
    @GetMapping
    @PreAuthorize("@permisoEnforcer.tienePermiso('MODERAR_PROPIEDADES')")
    public ResponseEntity<List<PropiedadAdminDTO>> listarTodas(
            @RequestParam(required = false) EstadoPropiedad estado) {
        List<Propiedad> propiedades = estado != null
                ? propiedadRepository.findByEstadoOrderByFechaCreacionAsc(estado)
                : propiedadRepository.findByEstadoNotOrderByFechaCreacionAsc(EstadoPropiedad.BORRADOR);
        List<PropiedadAdminDTO> dtos = propiedades.stream().map(propiedadService::toAdmin).toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('MODERAR_PROPIEDADES')")
    public ResponseEntity<PropiedadAdminDTO> verDetalle(@PathVariable Long id) {
        return propiedadRepository.findById(id)
                .map(p -> ResponseEntity.ok(propiedadService.toAdmin(p)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/aprobar")
    @PreAuthorize("@permisoEnforcer.tienePermiso('MODERAR_PROPIEDADES')")
    @CacheEvict(value = "propiedades:listado", allEntries = true)
    @Transactional
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
                    // Reinicia el reloj de caducidad (#49): aviso recién validado = vigente.
                    p.setFechaUltimaConfirmacion(java.time.LocalDateTime.now());
                    p.setRequiereReconfirmacion(false);
                    Propiedad guardada = propiedadRepository.save(p);
                    log.info("[ADMIN] Propiedad {} aprobada", id);
                    // #366: registra la decisión en el historial de auditoría. Va DESPUÉS del save
                    // y nunca puede tumbar la aprobación ya confirmada (ver método, envuelto en try/catch).
                    registrarDecisionSilenciosa(guardada.getId(), guardada.getTitulo(), EstadoPropiedad.APROBADO, null);
                    // #99/#492: al aprobarse, se emite PROPIEDAD_APROBADA con payload rico para que
                    // servicio-usuarios matchee suscripciones de alerta y envíe el correo. Vía outbox
                    // (atómico con la aprobación por el @Transactional del método). No existía ningún
                    // evento en este punto, así que se añade uno nuevo (no se duplica ninguno).
                    Map<String, Object> payload = new HashMap<>();
                    payload.put("titulo", guardada.getTitulo());
                    payload.put("precio", guardada.getPrecio());
                    payload.put("zonaId", guardada.getZonaId());
                    payload.put("universidadId", guardada.getUniversidadId());
                    payload.put("tipoPropiedad", guardada.getTipoPropiedad());
                    payload.put("ubicacion", guardada.getDireccion());
                    // #492: campos extra para que servicio-usuarios matchee alertas ampliadas.
                    // `servicios` = códigos del catálogo (WIFI, AGUA, ...) EXACTAMENTE como los
                    // guarda/compara la búsqueda del frontend: son los serviciosIncluidos (los
                    // servicios en estado INCLUIDO), la misma representación que usa `/buscar`
                    // (cláusula `s IN :servicios`). Copia plana (ArrayList) para no serializar el
                    // PersistentBag de Hibernate en el payload del outbox.
                    payload.put("servicios", guardada.getServiciosIncluidos() != null
                            ? new java.util.ArrayList<>(guardada.getServiciosIncluidos())
                            : new java.util.ArrayList<>());
                    payload.put("dormitorios", guardada.getNumDormitorios());
                    payload.put("capacidad", guardada.getCapacidadPersonas());
                    kafkaProducerService.enviarEventoPropiedad("PROPIEDAD_APROBADA", guardada.getId(), payload);
                    return ResponseEntity.ok(guardada);
                }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Body opcional {"motivo": "..."} (ítem 348): el admin puede explicar por qué rechaza,
     * y el arrendador lo ve en "Mis propiedades" para corregir antes de reenviar. Sigue
     * aceptando llamadas sin body (compat con el caller admin existente, que hoy no lo manda).
     */
    @PatchMapping("/{id}/rechazar")
    @PreAuthorize("@permisoEnforcer.tienePermiso('MODERAR_PROPIEDADES')")
    @CacheEvict(value = "propiedades:listado", allEntries = true)
    public ResponseEntity<Propiedad> rechazar(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body
    ) {
        return propiedadRepository.findById(id)
                .map(p -> {
                    p.setAprobadoPorAdmin(false);
                    p.setEstado(EstadoPropiedad.RECHAZADO);
                    p.setMotivoRechazo(body != null ? body.get("motivo") : null);
                    log.info("[ADMIN] Propiedad {} rechazada (motivo: {})", id, p.getMotivoRechazo());
                    Propiedad guardada = propiedadRepository.save(p);
                    // #366: registra la decisión en el historial de auditoría (después del save; ver
                    // registrarDecisionSilenciosa — un fallo aquí nunca debe tumbar el rechazo ya guardado).
                    registrarDecisionSilenciosa(guardada.getId(), guardada.getTitulo(), EstadoPropiedad.RECHAZADO, guardada.getMotivoRechazo());
                    return ResponseEntity.ok(guardada);
                }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Guarda una fila en el historial de decisiones de moderación (#366). Deliberadamente
     * defensivo: cualquier fallo (BD, mapeo, contexto de seguridad sin userId) se registra en
     * log y se traga, NUNCA se relanza — la aprobación/rechazo real ya se confirmó antes de
     * llamar a este método y no puede quedar bloqueada por un problema de auditoría.
     */
    private void registrarDecisionSilenciosa(Long propiedadId, String propiedadTitulo,
                                              EstadoPropiedad decision, String motivo) {
        try {
            CurrentUser actor = CurrentUserProvider.get();
            decisionModeracionRepository.save(DecisionModeracionPropiedad.builder()
                    .propiedadId(propiedadId)
                    .propiedadTitulo(propiedadTitulo)
                    .adminId(actor != null ? actor.getUserId() : null)
                    .decision(decision)
                    .motivo(motivo)
                    .build());
        } catch (Exception e) {
            log.warn("[ADMIN] No se pudo registrar el historial de decisión de moderación (propiedad {}): {}",
                    propiedadId, e.getMessage());
        }
    }

    /** Historial paginado de decisiones de moderación (#366): tabla de auditoría en el panel admin. */
    @GetMapping("/historial-decisiones")
    @PreAuthorize("@permisoEnforcer.tienePermiso('MODERAR_PROPIEDADES')")
    public ResponseEntity<Page<DecisionModeracionPropiedadDTO>> historialDecisiones(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        Page<DecisionModeracionPropiedadDTO> resultado = decisionModeracionRepository
                .findAllByOrderByFechaDesc(pageable)
                .map(DecisionModeracionPropiedadDTO::de);
        return ResponseEntity.ok(resultado);
    }

    /** Conteos reales (#356) sobre el historial de {@link #historialDecisiones}: reemplaza los mocks del dashboard. */
    public record HistorialStatsDTO(long aprobadasHoy, long rechazadasSemana) {}

    @GetMapping("/historial-decisiones/stats")
    @PreAuthorize("@permisoEnforcer.tienePermiso('MODERAR_PROPIEDADES')")
    public ResponseEntity<HistorialStatsDTO> historialStats() {
        LocalDateTime inicioHoy = LocalDate.now().atStartOfDay();
        LocalDateTime inicioSemana = LocalDateTime.now().minusDays(7);
        long aprobadasHoy = decisionModeracionRepository
                .countByDecisionAndFechaGreaterThanEqual(EstadoPropiedad.APROBADO, inicioHoy);
        long rechazadasSemana = decisionModeracionRepository
                .countByDecisionAndFechaGreaterThanEqual(EstadoPropiedad.RECHAZADO, inicioSemana);
        return ResponseEntity.ok(new HistorialStatsDTO(aprobadasHoy, rechazadasSemana));
    }

    /**
     * Override de moderación: el admin cambia la política de cancelación de cualquier
     * propiedad. Body: {"politica": "FLEXIBLE|MODERADA|ESTRICTA"}. Solo afecta cancelaciones
     * futuras (la política se evalúa al cancelar). Invalida la caché del listado porque la
     * política se expone en el DTO público.
     */
    @PatchMapping("/{id}/politica-cancelacion")
    @PreAuthorize("@permisoEnforcer.tienePermiso('MODERAR_PROPIEDADES')")
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
