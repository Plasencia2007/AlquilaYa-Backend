package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.dto.ActualizarUsuarioRequest;
import com.alquilaya.serviciousuarios.dto.ArrendadorInfoResponse;
import com.alquilaya.serviciousuarios.dto.CambiarPasswordRequest;
import com.alquilaya.serviciousuarios.dto.EstudianteInfoResponse;
import com.alquilaya.serviciousuarios.entities.Arrendador;
import com.alquilaya.serviciousuarios.entities.Estudiante;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.EstadoUsuario;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.exceptions.RecursoNoEncontradoException;
import com.alquilaya.serviciousuarios.repositories.ArrendadorRepository;
import com.alquilaya.serviciousuarios.repositories.EstudianteRepository;
import com.alquilaya.serviciousuarios.services.UsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

    @GetMapping
    @PreAuthorize("@permisoEnforcer.tienePermiso('VER_USUARIOS')")
    public ResponseEntity<List<Usuario>> listarTodos() {
        return ResponseEntity.ok(usuarioService.listarTodos());
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('VER_USUARIOS') or @permisoEnforcer.esPropioUsuario(#id)")
    public ResponseEntity<Usuario> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(usuarioService.obtenerPorId(id));
    }

    @GetMapping("/rol/{rol}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('VER_USUARIOS')")
    public ResponseEntity<List<Usuario>> listarPorRol(@PathVariable String rol) {
        log.debug("Solicitud recibida para listar usuarios con Rol: {}", rol);
        List<Usuario> usuarios = usuarioService.listarPorRol(Rol.valueOf(rol.toUpperCase()));
        log.info("Usuarios encontrados para rol {}: {}", rol, usuarios.size());
        return ResponseEntity.ok(usuarios);
    }

    @GetMapping("/admin/arrendadores")
    @PreAuthorize("@permisoEnforcer.tienePermiso('VER_USUARIOS')")
    public ResponseEntity<List<com.alquilaya.serviciousuarios.dto.AdminArrendadorDTO>> listarArrendadoresAdmin() {
        return ResponseEntity.ok(usuarioService.listarArrendadoresAdmin());
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('EDITAR_USUARIO') or @permisoEnforcer.esPropioUsuario(#id)")
    public ResponseEntity<Usuario> actualizarUsuario(
            @PathVariable Long id,
            @Valid @RequestBody ActualizarUsuarioRequest updates) {
        log.info("Actualizando datos del usuario ID: {}", id);
        return ResponseEntity.ok(usuarioService.actualizarUsuario(id, updates));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('ELIMINAR_USUARIO')")
    public ResponseEntity<Void> eliminarUsuario(@PathVariable Long id) {
        log.warn("Eliminando usuario ID: {}", id);
        usuarioService.eliminarUsuario(id);
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
        boolean verificado = u != null && u.getEstado() == EstadoUsuario.ACTIVE;
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
                // TODO: métrica real de tiempo de respuesta promedio del arrendador
                // (requiere job/agregación sobre servicio-mensajeria). Por ahora null
                // y la UI muestra "—".
                .tiempoRespuestaPromedio(null)
                .build();
    }

    @GetMapping("/estudiante/{perfilId}/info")
    public ResponseEntity<EstudianteInfoResponse> obtenerInfoEstudiante(@PathVariable Long perfilId) {
        Estudiante e = estudianteRepository.findById(perfilId)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el estudiante con ID " + perfilId));
        Usuario u = e.getUsuario();
        return ResponseEntity.ok(EstudianteInfoResponse.builder()
                .id(e.getId())
                .usuarioId(u.getId())
                .nombre(u.getNombre())
                .apellido(u.getApellido())
                .correo(u.getCorreo())
                .telefono(u.getTelefono())
                .universidad(e.getUniversidad())
                .carrera(e.getCarrera())
                .build());
    }
}
