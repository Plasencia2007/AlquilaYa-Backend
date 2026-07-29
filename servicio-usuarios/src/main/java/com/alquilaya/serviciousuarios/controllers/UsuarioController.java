package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.dto.ActualizarPerfilAcademicoRequest;
import com.alquilaya.serviciousuarios.dto.ActualizarPerfilPersonalRequest;
import com.alquilaya.serviciousuarios.dto.ActualizarUsuarioRequest;
import com.alquilaya.serviciousuarios.dto.ApiPeruDTOs;
import com.alquilaya.serviciousuarios.dto.ArrendadorInfoResponse;
import com.alquilaya.serviciousuarios.dto.ArrendadorPublicoResponse;
import com.alquilaya.serviciousuarios.dto.CambiarPasswordPerfilRequest;
import com.alquilaya.serviciousuarios.dto.CambiarPasswordRequest;
import com.alquilaya.serviciousuarios.dto.EstudianteInfoResponse;
import com.alquilaya.serviciousuarios.dto.ActualizarPreferenciasNotificacionRequest;
import com.alquilaya.serviciousuarios.dto.PreferenciasNotificacionResponse;
import com.alquilaya.serviciousuarios.dto.ReputacionResumen;
import com.alquilaya.serviciousuarios.dto.UsuarioDetalleResponse;
import com.alquilaya.serviciousuarios.dto.UsuarioResumenResponse;
import com.alquilaya.serviciousuarios.entities.Arrendador;
import com.alquilaya.serviciousuarios.entities.Estudiante;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.EstadoUsuario;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.exceptions.RecursoNoEncontradoException;
import com.alquilaya.serviciousuarios.repositories.ArrendadorRepository;
import com.alquilaya.serviciousuarios.repositories.EstudianteRepository;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import com.alquilaya.serviciousuarios.services.ApiPeruService;
import com.alquilaya.serviciousuarios.services.UsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/usuarios")
@RequiredArgsConstructor
@Slf4j
@Validated
public class UsuarioController {

    private final UsuarioService usuarioService;
    private final ArrendadorRepository arrendadorRepository;
    private final EstudianteRepository estudianteRepository;
    private final UsuarioRepository usuarioRepository;
    private final com.alquilaya.serviciousuarios.services.DeteccionDuplicadosService deteccionDuplicadosService;
    private final com.alquilaya.serviciousuarios.services.ReputacionService reputacionService;
    private final com.alquilaya.serviciousuarios.services.PermisoEnforcerService permisoEnforcer;
    private final ApiPeruService apiPeruService;
    private final com.alquilaya.serviciousuarios.services.AuditLogService auditLogService;

    /** Usuario autenticado, resuelto por el correo que el JWT pone como principal. */
    private Usuario usuarioActual() {
        String correo = SecurityContextHolder.getContext().getAuthentication().getName();
        return usuarioService.buscarPorCorreo(correo)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario autenticado"));
    }

    // ===== Perfil propio (datos del usuario autenticado) =====

    @PatchMapping("/perfil/personal")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> actualizarPerfilPersonal(@Valid @RequestBody ActualizarPerfilPersonalRequest req) {
        Usuario u = usuarioActual();
        u.setNombre(req.getNombre().trim());
        u.setApellido(req.getApellido().trim());
        if (req.getTelefono() != null && !req.getTelefono().isBlank()) {
            String nuevoTel = req.getTelefono().trim();
            // Si el número CAMBIÓ, debe re-verificarse por OTP → se limpia el flag de verificado (U6).
            if (!nuevoTel.equals(u.getTelefono())) {
                u.setTelefono(nuevoTel);
                u.setTelefonoVerificado(false);
            }
        }
        u.setFechaNacimiento(req.getFechaNacimiento());
        usuarioRepository.save(u);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/perfil/academico")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> actualizarPerfilAcademico(@Valid @RequestBody ActualizarPerfilAcademicoRequest req) {
        Usuario u = usuarioActual();
        Estudiante e = estudianteRepository.findByUsuario(u)
                .orElseThrow(() -> new RecursoNoEncontradoException("El usuario autenticado no tiene perfil de estudiante"));
        e.setUniversidad(req.getUniversidad().trim());
        e.setUniversidadId(req.getUniversidadId());
        e.setCodigoEstudiante(req.getCodigoEstudiante().trim());
        e.setCarrera(req.getCarrera().trim());
        e.setCiclo(parseCiclo(req.getCiclo()));
        estudianteRepository.save(e);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/perfil/password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> cambiarPasswordPerfil(@Valid @RequestBody CambiarPasswordPerfilRequest req) {
        Usuario u = usuarioActual();
        usuarioService.cambiarPassword(u.getId(), req.getActual(), req.getNueva());
        return ResponseEntity.noContent().build();
    }

    // ===== Preferencias de notificación (ítem 210) =====

    @GetMapping("/perfil/preferencias-notificacion")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PreferenciasNotificacionResponse> obtenerPreferenciasNotificacion() {
        return ResponseEntity.ok(mapPreferencias(usuarioActual()));
    }

    @PutMapping("/perfil/preferencias-notificacion")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PreferenciasNotificacionResponse> actualizarPreferenciasNotificacion(
            @Valid @RequestBody ActualizarPreferenciasNotificacionRequest req) {
        Usuario u = usuarioActual();
        u.setNotificarMensajes(req.isNotificarMensajes());
        u.setNotificarReservas(req.isNotificarReservas());
        u.setNotificarMarketing(req.isNotificarMarketing());
        usuarioRepository.save(u);
        return ResponseEntity.ok(mapPreferencias(u));
    }

    /**
     * Variante S2S sin PII (solo 3 booleans): consumida por servicio-mensajeria para filtrar
     * el envío de notificaciones según la preferencia del destinatario (ítem 210, enforcement
     * real en NotificacionService.crear). Pública a propósito: se invoca también desde
     * consumers de Kafka, sin request HTTP entrante del que propagar un JWT (a diferencia de
     * /arrendador/{id}/info y /estudiante/{id}/info, que sí llevan cabecera Authorization
     * cuando el caller es una petición síncrona del chat).
     */
    @GetMapping("/{id}/preferencias-notificacion")
    public ResponseEntity<PreferenciasNotificacionResponse> obtenerPreferenciasNotificacionPorId(@PathVariable Long id) {
        return ResponseEntity.ok(mapPreferencias(usuarioService.obtenerPorId(id)));
    }

    private PreferenciasNotificacionResponse mapPreferencias(Usuario u) {
        return PreferenciasNotificacionResponse.builder()
                .notificarMensajes(u.isNotificarMensajes())
                .notificarReservas(u.isNotificarReservas())
                .notificarMarketing(u.isNotificarMarketing())
                .build();
    }

    /**
     * Baja de cuenta propia (GDPR, G8-B). El id se resuelve del token (no de la URL) para que
     * un usuario solo pueda anonimizar SU PROPIA cuenta. Autorizado en {@code SecurityConfig}
     * para cualquier autenticado; aquí se delega en el mismo flujo de anonimización que usa
     * el borrado admin ({@link UsuarioService#anonimizarCuenta(Long)}).
     */
    @DeleteMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> eliminarCuentaPropia() {
        Usuario u = usuarioActual();
        log.warn("Baja de cuenta propia (GDPR) para usuario ID: {}", u.getId());
        usuarioService.anonimizarCuenta(u.getId());
        return ResponseEntity.noContent().build();
    }

    private Integer parseCiclo(String ciclo) {
        if (ciclo == null || ciclo.isBlank()) {
            return null;
        }
        try {
            int v = Integer.parseInt(ciclo.trim());
            if (v < 1 || v > 12) {
                throw new IllegalArgumentException("El ciclo debe estar entre 1 y 12");
            }
            return v;
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("El ciclo debe ser un número entre 1 y 12");
        }
    }

    @GetMapping
    @PreAuthorize("@permisoEnforcer.tienePermiso('VER_USUARIOS')")
    public ResponseEntity<org.springframework.data.domain.Page<Usuario>> listarTodos(
            @org.springframework.data.web.PageableDefault(size = 20) org.springframework.data.domain.Pageable pageable) {
        return ResponseEntity.ok(usuarioService.listarTodos(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('VER_USUARIOS') or @permisoEnforcer.esPropioUsuario(#id)")
    public ResponseEntity<UsuarioDetalleResponse> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(UsuarioDetalleResponse.from(usuarioService.obtenerPorId(id)));
    }

    @GetMapping("/rol/{rol}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('VER_USUARIOS')")
    public ResponseEntity<List<UsuarioResumenResponse>> listarPorRol(@PathVariable String rol) {
        log.debug("Solicitud recibida para listar usuarios con Rol: {}", rol);
        List<Usuario> usuarios = usuarioService.listarPorRol(Rol.valueOf(rol.toUpperCase()));
        log.info("Usuarios encontrados para rol {}: {}", rol, usuarios.size());
        return ResponseEntity.ok(usuarios.stream().map(UsuarioResumenResponse::from).toList());
    }

    /** Listado por estado de cuenta (#367, p.ej. BANNED) para el panel admin de baneos activos. */
    @GetMapping("/estado/{estado}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('VER_USUARIOS')")
    public ResponseEntity<List<UsuarioResumenResponse>> listarPorEstado(@PathVariable String estado) {
        List<Usuario> usuarios = usuarioService.listarPorEstado(EstadoUsuario.valueOf(estado.toUpperCase()));
        return ResponseEntity.ok(usuarios.stream().map(UsuarioResumenResponse::from).toList());
    }

    @GetMapping("/admin/arrendadores")
    @PreAuthorize("@permisoEnforcer.tienePermiso('VER_USUARIOS')")
    public ResponseEntity<List<com.alquilaya.serviciousuarios.dto.AdminArrendadorDTO>> listarArrendadoresAdmin() {
        return ResponseEntity.ok(usuarioService.listarArrendadoresAdmin());
    }

    /**
     * Búsqueda por texto libre de usuarios (ítem 377) para el command palette admin (Ctrl+K):
     * antes el frontend traía TODOS los usuarios por rol (3 llamadas) y filtraba en cliente, sin
     * endpoint server-side. Coincide contra nombre/apellido/correo/DNI. {@code limit} acota el
     * resultado (autocompletar, no un listado paginado completo) entre 1 y 20, default 15.
     */
    @GetMapping("/admin/buscar")
    @PreAuthorize("@permisoEnforcer.tienePermiso('VER_USUARIOS')")
    public ResponseEntity<List<UsuarioResumenResponse>> buscarUsuarios(
            @RequestParam("q") String q,
            @RequestParam(value = "limit", defaultValue = "15") int limit) {
        if (q == null || q.isBlank()) {
            return ResponseEntity.ok(List.of());
        }
        int limiteAcotado = Math.min(Math.max(limit, 1), 20);
        List<Usuario> usuarios = usuarioRepository.buscarPorTexto(q.trim(),
                org.springframework.data.domain.PageRequest.of(0, limiteAcotado));
        return ResponseEntity.ok(usuarios.stream().map(UsuarioResumenResponse::from).toList());
    }

    /** Detección de cuentas duplicadas (#8): grupos que comparten DNI/teléfono/email canónico. */
    @GetMapping("/admin/duplicados")
    @PreAuthorize("@permisoEnforcer.tienePermiso('VER_USUARIOS')")
    public ResponseEntity<List<com.alquilaya.serviciousuarios.dto.ClusterDuplicadoDTO>> detectarDuplicados() {
        return ResponseEntity.ok(deteccionDuplicadosService.detectar());
    }

    /**
     * Ítem 385: marca un cluster de cuentas duplicadas como "revisado — no es duplicado" para
     * que deje de aparecer en {@link #detectarDuplicados()}. NO fusiona cuentas (fase 2, fuera
     * de alcance): solo silencia el falso positivo.
     */
    @PostMapping("/admin/duplicados/revisar")
    @PreAuthorize("@permisoEnforcer.tienePermiso('EDITAR_USUARIO')")
    public ResponseEntity<Void> marcarDuplicadoRevisado(
            @Valid @RequestBody com.alquilaya.serviciousuarios.dto.RevisarDuplicadoRequest request,
            jakarta.servlet.http.HttpServletRequest req) {
        Long actorId = usuarioActual().getId();
        deteccionDuplicadosService.marcarRevisado(request.criterio(), request.valor(), actorId);
        // G8: audita que un admin descartó un cluster de duplicados detectado automáticamente.
        auditLogService.registrarActorActual("MARCAR_DUPLICADO_REVISADO", "DuplicadoRevisado", null,
                "criterio=" + request.criterio() + ", valor=" + request.valor(), req);
        return ResponseEntity.noContent().build();
    }

    /**
     * Ítem 378: ids de administradores ACTIVOS, sin PII (solo el id numérico). Pública a
     * propósito — igual que {@code /{id}/preferencias-notificacion} — porque la consume
     * servicio-mensajeria desde un Kafka consumer (evento DOCUMENTO_SUBIDO en
     * {@code UserApprovalEventConsumer}) que no tiene un request HTTP entrante del que
     * propagar un JWT.
     */
    @GetMapping("/admin/ids-activos")
    public ResponseEntity<List<Long>> idsAdminsActivos() {
        return ResponseEntity.ok(usuarioService.listarPorRol(Rol.ADMIN).stream()
                .filter(u -> u.getEstado() == EstadoUsuario.ACTIVE)
                .map(Usuario::getId)
                .toList());
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('EDITAR_USUARIO') or @permisoEnforcer.esPropioUsuario(#id)")
    public ResponseEntity<UsuarioDetalleResponse> actualizarUsuario(
            @PathVariable Long id,
            @Valid @RequestBody ActualizarUsuarioRequest updates,
            jakarta.servlet.http.HttpServletRequest req) {
        // Cambiar el `estado` de la cuenta (ACTIVE/BANNED/SUSPENDED/REJECTED) es privilegio de admin.
        // Un usuario que edita su PROPIO perfil (rama esPropioUsuario del @PreAuthorize) no puede
        // auto-activarse ni quitarse un baneo/suspensión → se ignora el campo. U4: cierra escalada de privilegios.
        boolean cambioEstadoAdmin = updates.getEstado() != null && permisoEnforcer.tienePermiso("EDITAR_USUARIO");
        if (updates.getEstado() != null && !permisoEnforcer.tienePermiso("EDITAR_USUARIO")) {
            log.warn("Intento de cambiar 'estado' sin permiso EDITAR_USUARIO en usuario ID {} — campo ignorado", id);
            updates.setEstado(null);
        }
        log.info("Actualizando datos del usuario ID: {}", id);
        Usuario actualizado = usuarioService.actualizarUsuario(id, updates);
        // G8: audita el cambio de estado hecho por un admin (suspender/banear/rechazar/activar).
        if (cambioEstadoAdmin) {
            String detalleCambioEstado = "nuevo estado=" + updates.getEstado();
            // Ítem del panel de baneos activos: si el cambio es hacia BANNED y llegó motivo, se
            // deja también en el audit log (además de persistirse en usuario.motivoBaneo).
            if (updates.getEstado() == EstadoUsuario.BANNED
                    && updates.getMotivo() != null && !updates.getMotivo().isBlank()) {
                detalleCambioEstado += ", motivo=" + updates.getMotivo();
            }
            auditLogService.registrarActorActual("CAMBIO_ESTADO_USUARIO", "Usuario", id,
                    detalleCambioEstado, req);
        }
        return ResponseEntity.ok(UsuarioDetalleResponse.from(actualizado));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('ELIMINAR_USUARIO')")
    public ResponseEntity<Void> eliminarUsuario(@PathVariable Long id,
            jakarta.servlet.http.HttpServletRequest req) {
        log.warn("Eliminando usuario ID: {}", id);
        usuarioService.eliminarUsuario(id);
        // G8: audita la baja de cuenta hecha por un admin.
        auditLogService.registrarActorActual("ELIMINAR_USUARIO", "Usuario", id, null, req);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/cambiar-password")
    @PreAuthorize("@permisoEnforcer.esPropioUsuario(#id)")
    public ResponseEntity<Void> cambiarPassword(
            @PathVariable Long id,
            @Valid @RequestBody CambiarPasswordRequest request) {
        usuarioService.cambiarPassword(id, request.getPasswordActual(), request.getNuevaPassword());
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/{id}/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("@permisoEnforcer.esPropioUsuario(#id)")
    public ResponseEntity<Map<String, String>> subirFoto(
            @PathVariable Long id,
            @RequestParam("archivo") MultipartFile archivo) throws IOException {
        String url = usuarioService.subirFotoPerfil(id, archivo);
        return ResponseEntity.ok(Map.of("fotoUrl", url));
    }

    @GetMapping("/arrendador/{perfilId}/info")
    public ResponseEntity<ArrendadorInfoResponse> obtenerInfoArrendador(@PathVariable Long perfilId) {
        Arrendador a = arrendadorRepository.findById(perfilId)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el arrendador con ID " + perfilId));
        return ResponseEntity.ok(mapArrendadorInfo(a));
    }

    /**
     * Endpoint bulk para enriquecer listados de propiedades (card premium).
     * Evita N+1 contra el endpoint single — una sola llamada por página.
     * Devuelve solo los IDs encontrados; los faltantes se omiten silenciosamente
     * (el caller debe degradar gracefully).
     */
    @PostMapping("/arrendadores/bulk")
    public ResponseEntity<List<ArrendadorInfoResponse>> obtenerArrendadoresBulk(@RequestBody List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }
        // Dedup para evitar trabajo redundante.
        List<Long> idsUnicos = ids.stream().filter(java.util.Objects::nonNull).distinct().toList();
        log.debug("[BULK] Solicitud de info de {} arrendadores", idsUnicos.size());
        List<Arrendador> arrendadores = arrendadorRepository.findAllById(idsUnicos);
        List<ArrendadorInfoResponse> resp = new ArrayList<>(arrendadores.size());
        for (Arrendador a : arrendadores) {
            try {
                resp.add(mapArrendadorInfo(a));
            } catch (Exception ex) {
                log.warn("[BULK] No se pudo mapear arrendador {}: {}", a.getId(), ex.getMessage());
            }
        }
        return ResponseEntity.ok(resp);
    }

    private ArrendadorInfoResponse mapArrendadorInfo(Arrendador a) {
        Usuario u = a.getUsuario();
        boolean verificado = a.isVerificado(); // KYC real del arrendador (U3); antes se fingía como estado=ACTIVE
        ReputacionResumen rep = reputacionService.calcularArrendador(a);
        return ArrendadorInfoResponse.builder()
                .id(a.getId())
                .usuarioId(u != null ? u.getId() : null)
                .nombre(u != null ? u.getNombre() : null)
                .apellido(u != null ? u.getApellido() : null)
                .correo(u != null ? u.getCorreo() : null)
                .telefono(a.getTelefono() != null ? a.getTelefono() : (u != null ? u.getTelefono() : null))
                .nombreComercial(a.getNombreComercial())
                .calificacion(a.getCalificacion())
                .avatar(u != null ? u.getFotoUrl() : null)
                .verificado(verificado)
                // Métrica calculada por servicio-mensajeria y propagada por Kafka
                // (TIEMPO_RESPUESTA_ARRENDADOR_ACTUALIZADO); puede ser null hasta la primera
                // señal, en cuyo caso la UI muestra "—".
                .tiempoRespuestaPromedio(a.getTiempoRespuestaPromedio())
                .numResenas(a.getNumResenas())
                .score(rep.score())
                .nivelReputacion(rep.nivel().name())
                .build();
    }

    /**
     * Variante PÚBLICA del bulk: no requiere autenticación.
     * Devuelve {@link ArrendadorPublicoResponse} (sin correo ni telefono — PII excluida).
     * Usado por servicio-propiedades para enriquecer listados a visitantes anónimos.
     */
    @PostMapping("/arrendadores/bulk-publico")
    public ResponseEntity<List<ArrendadorPublicoResponse>> obtenerArrendadoresBulkPublico(@RequestBody List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }
        List<Long> idsUnicos = ids.stream().filter(java.util.Objects::nonNull).distinct().toList();
        log.debug("[BULK-PUB] Solicitud pública de info de {} arrendadores", idsUnicos.size());
        List<Arrendador> arrendadores = arrendadorRepository.findAllById(idsUnicos);
        List<ArrendadorPublicoResponse> resp = new ArrayList<>(arrendadores.size());
        for (Arrendador a : arrendadores) {
            try {
                resp.add(mapArrendadorPublico(a));
            } catch (Exception ex) {
                log.warn("[BULK-PUB] No se pudo mapear arrendador {}: {}", a.getId(), ex.getMessage());
            }
        }
        return ResponseEntity.ok(resp);
    }

    private ArrendadorPublicoResponse mapArrendadorPublico(Arrendador a) {
        Usuario u = a.getUsuario();
        boolean verificado = a.isVerificado(); // KYC real del arrendador (U3); antes se fingía como estado=ACTIVE
        ReputacionResumen rep = reputacionService.calcularArrendador(a);
        return ArrendadorPublicoResponse.builder()
                .id(a.getId())
                .usuarioId(u != null ? u.getId() : null)
                .nombre(u != null ? u.getNombre() : null)
                .apellido(u != null ? u.getApellido() : null)
                .nombreComercial(a.getNombreComercial())
                .calificacion(a.getCalificacion())
                .avatar(u != null ? u.getFotoUrl() : null)
                .verificado(verificado)
                .tiempoRespuestaPromedio(a.getTiempoRespuestaPromedio())
                .numResenas(a.getNumResenas())
                .score(rep.score())
                .nivelReputacion(rep.nivel().name())
                .build();
    }

    @GetMapping("/estudiante/{perfilId}/info")
    public ResponseEntity<EstudianteInfoResponse> obtenerInfoEstudiante(@PathVariable Long perfilId) {
        Estudiante e = estudianteRepository.findById(perfilId)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el estudiante con ID " + perfilId));
        Usuario u = e.getUsuario();
        ReputacionResumen rep = reputacionService.calcularEstudiante(e);
        return ResponseEntity.ok(EstudianteInfoResponse.builder()
                .id(e.getId())
                .usuarioId(u.getId())
                .nombre(u.getNombre())
                .apellido(u.getApellido())
                .correo(u.getCorreo())
                .telefono(u.getTelefono())
                .fotoUrl(u.getFotoUrl())
                .fechaNacimiento(u.getFechaNacimiento())
                .universidad(e.getUniversidad())
                .universidadId(e.getUniversidadId())
                .codigoEstudiante(e.getCodigoEstudiante())
                .carrera(e.getCarrera())
                .ciclo(e.getCiclo())
                .verificado(e.isVerificado())
                .score(rep.score())
                .nivelReputacion(rep.nivel().name())
                .build());
    }

    @PostMapping("/arrendador/verificar-ruc")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> verificarRuc(
            @RequestParam("ruc") String ruc) {

        Usuario u = usuarioActual();
        if (u.getRol() != Rol.ARRENDADOR) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Solo los arrendadores pueden verificar RUC."));
        }

        ApiPeruDTOs.RucResponse rucRes = apiPeruService.consultarRuc(ruc);
        if (!rucRes.isSuccess() || rucRes.getData() == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", rucRes.getMessage() != null ? rucRes.getMessage() : "No se pudo validar el RUC."));
        }

        ApiPeruDTOs.RucData data = rucRes.getData();

        // Validar que esté ACTIVO
        if (!"ACTIVO".equalsIgnoreCase(data.getEstado())) {
            return ResponseEntity.badRequest().body(Map.of("success", false,
                    "message", "El RUC no está activo. Estado actual: " + data.getEstado()));
        }

        // Actualizar datos del arrendador
        Arrendador a = arrendadorRepository.findByUsuario(u)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el perfil de arrendador"));

        a.setRuc(ruc);
        if (data.getNombreORazonSocial() != null) {
            a.setNombreComercial(data.getNombreORazonSocial());
        }
        if (data.getDireccion() != null) {
            a.setDireccionPropiedades(data.getDireccion());
        }
        arrendadorRepository.save(a);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "ruc", ruc,
            "razonSocial", data.getNombreORazonSocial() != null ? data.getNombreORazonSocial() : "",
            "direccion", data.getDireccion() != null ? data.getDireccion() : ""
        ));
    }
}
