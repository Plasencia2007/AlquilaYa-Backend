package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.dto.ActualizarUsuarioRequest;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.services.UsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
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

    @GetMapping
    public ResponseEntity<List<Usuario>> listarTodos() {
        return ResponseEntity.ok(usuarioService.listarTodos());
    }

    @GetMapping("/rol/{rol}")
    public ResponseEntity<List<Usuario>> listarPorRol(@PathVariable String rol) {
        log.debug("Solicitud recibida para listar usuarios con Rol: {}", rol);
        List<Usuario> usuarios = usuarioService.listarPorRol(Rol.valueOf(rol.toUpperCase()));
        log.info("Usuarios encontrados para rol {}: {}", rol, usuarios.size());
        return ResponseEntity.ok(usuarios);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Usuario> actualizarUsuario(
            @PathVariable Long id,
            @Valid @RequestBody ActualizarUsuarioRequest updates) {
        log.info("Actualizando datos del usuario ID: {}", id);
        return ResponseEntity.ok(usuarioService.actualizarUsuario(id, updates));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarUsuario(@PathVariable Long id) {
        log.warn("Eliminando usuario ID: {}", id);
        usuarioService.eliminarUsuario(id);
        return ResponseEntity.noContent().build();
    }
}
