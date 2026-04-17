package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.config.JwtService;
import com.alquilaya.serviciousuarios.dto.AuthDtos.*;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.repositories.ArrendadorRepository;
import com.alquilaya.serviciousuarios.repositories.EstudianteRepository;
import com.alquilaya.serviciousuarios.services.UsuarioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/usuarios/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UsuarioService usuarioService;
    private final JwtService jwtService;
    private final ArrendadorRepository arrendadorRepository;
    private final EstudianteRepository estudianteRepository;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        Usuario usuario = Usuario.builder()
                .nombre(request.getNombre())
                .correo(request.getCorreo())
                .password(request.getPassword())
                .rol(Rol.valueOf(request.getRol().toUpperCase()))
                .build();

        Usuario usuarioCreado = usuarioService.registrarUsuario(usuario);
        Long perfilId = obtenerPerfilId(usuarioCreado);
        String token = jwtService.generateToken(usuarioCreado, perfilId);

        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .id(usuarioCreado.getId())
                .nombre(usuarioCreado.getNombre())
                .correo(usuarioCreado.getCorreo())
                .rol(usuarioCreado.getRol().name())
                .perfilId(perfilId)
                .build());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            return usuarioService.buscarPorCorreo(request.getCorreo())
                    .map(usuario -> {
                        if (!usuarioService.verificarPassword(request.getPassword(), usuario.getPassword())) {
                            return ResponseEntity.status(401).body("Contraseña incorrecta");
                        }
                        
                        Long perfilId = obtenerPerfilId(usuario);
                        String token = jwtService.generateToken(usuario, perfilId);
                        return ResponseEntity.ok(AuthResponse.builder()
                                .token(token)
                                .id(usuario.getId())
                                .nombre(usuario.getNombre())
                                .correo(usuario.getCorreo())
                                .rol(usuario.getRol().name())
                                .perfilId(perfilId)
                                .build());
                    })
                    .orElse(ResponseEntity.status(401).body("Usuario no encontrado"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error interno en el servidor: " + e.getMessage());
        }
    }

    private Long obtenerPerfilId(Usuario usuario) {
        if (usuario.getRol() == Rol.ARRENDADOR) {
            return arrendadorRepository.findByUsuario(usuario)
                    .map(com.alquilaya.serviciousuarios.entities.Arrendador::getId)
                    .orElse(null);
        } else if (usuario.getRol() == Rol.ESTUDIANTE) {
            return estudianteRepository.findByUsuario(usuario)
                    .map(com.alquilaya.serviciousuarios.entities.Estudiante::getId)
                    .orElse(null);
        }
        return null;
    }
}
