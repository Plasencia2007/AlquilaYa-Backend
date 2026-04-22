package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.dto.ActualizarUsuarioRequest;
import com.alquilaya.serviciousuarios.dto.ArrendadorInfoResponse;
import com.alquilaya.serviciousuarios.dto.EstudianteInfoResponse;
import com.alquilaya.serviciousuarios.entities.Arrendador;
import com.alquilaya.serviciousuarios.entities.Estudiante;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.exceptions.RecursoNoEncontradoException;
import com.alquilaya.serviciousuarios.repositories.ArrendadorRepository;
import com.alquilaya.serviciousuarios.repositories.EstudianteRepository;
import com.alquilaya.serviciousuarios.services.UsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    @PreAuthorize("@permisoEnforcer.tienePermiso('VER_USUARIOS') or (authentication.principal.toString() == #id.toString())")
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

    @PutMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('EDITAR_USUARIO') or (authentication.principal.toString() == #id.toString())")
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

    @GetMapping("/arrendador/{perfilId}/info")
    public ResponseEntity<ArrendadorInfoResponse> obtenerInfoArrendador(@PathVariable Long perfilId) {
        Arrendador a = arrendadorRepository.findById(perfilId)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el arrendador con ID " + perfilId));
        Usuario u = a.getUsuario();
        return ResponseEntity.ok(ArrendadorInfoResponse.builder()
                .id(a.getId())
                .usuarioId(u.getId())
                .nombre(u.getNombre())
                .apellido(u.getApellido())
                .correo(u.getCorreo())
                .telefono(a.getTelefono() != null ? a.getTelefono() : u.getTelefono())
                .nombreComercial(a.getNombreComercial())
                .calificacion(a.getCalificacion())
                .build());
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
