package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.config.JwtService;
import com.alquilaya.serviciousuarios.dto.AuthDtos.*;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.services.UsuarioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UsuarioService usuarioService;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        Usuario usuario = Usuario.builder()
                .nombre(request.getNombre())
                .correo(request.getCorreo())
                .password(request.getPassword())
                .rol(Rol.valueOf(request.getRol().toUpperCase()))
                .build();

        Usuario usuarioCreado = usuarioService.registrarUsuario(usuario);
        String token = jwtService.generateToken(usuarioCreado);

        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .nombre(usuarioCreado.getNombre())
                .correo(usuarioCreado.getCorreo())
                .rol(usuarioCreado.getRol().name())
                .build());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        Usuario usuario = usuarioService.buscarPorCorreo(request.getCorreo())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (!passwordEncoder.matches(request.getPassword(), usuario.getPassword())) {
            throw new RuntimeException("Contraseña incorrecta");
        }

        String token = jwtService.generateToken(usuario);

        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .nombre(usuario.getNombre())
                .correo(usuario.getCorreo())
                .rol(usuario.getRol().name())
                .build());
    }
}
