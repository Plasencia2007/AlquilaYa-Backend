package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.config.JwtService;
import com.alquilaya.serviciousuarios.dto.*;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.repositories.ArrendadorRepository;
import com.alquilaya.serviciousuarios.repositories.EstudianteRepository;
import com.alquilaya.serviciousuarios.services.UsuarioService;
import com.alquilaya.serviciousuarios.exceptions.CredencialesInvalidasException;
import com.alquilaya.serviciousuarios.exceptions.OtpInvalidoException;
import com.alquilaya.serviciousuarios.exceptions.TelefonoNoVerificadoException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/usuarios/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UsuarioService usuarioService;
    private final JwtService jwtService;
    private final ArrendadorRepository arrendadorRepository;
    private final EstudianteRepository estudianteRepository;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        Usuario usuarioCreado = usuarioService.registrarUsuario(request);
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

    @PostMapping("/register-admin")
    public ResponseEntity<AuthResponse> registerAdmin(@Valid @RequestBody AdminRegisterRequest request) {
        Usuario admin = usuarioService.registrarAdmin(request);
        String token = jwtService.generateToken(admin, null);

        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .id(admin.getId())
                .nombre(admin.getNombre())
                .correo(admin.getCorreo())
                .rol(admin.getRol().name())
                .perfilId(null)
                .build());
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<String> verifyOtp(@Valid @RequestBody VerificarOtpRequest request) {
        if (usuarioService.confirmarTelefono(request.getTelefono(), request.getCodigo())) {
            return ResponseEntity.ok("Teléfono verificado exitosamente");
        } else {
            throw new OtpInvalidoException("El código OTP es incorrecto o ha expirado. Solicita uno nuevo desde la pantalla de verificación.");
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        Usuario usuario = usuarioService.buscarPorCorreo(request.getCorreo())
                .orElseThrow(() -> new CredencialesInvalidasException("Correo o contraseña incorrectos"));

        if (!usuarioService.verificarPassword(request.getPassword(), usuario.getPassword())) {
            throw new CredencialesInvalidasException("Correo o contraseña incorrectos");
        }

        if (!usuario.isTelefonoVerificado()) {
            throw new TelefonoNoVerificadoException("Debes verificar tu número de WhatsApp antes de iniciar sesión. Revisa tu WhatsApp para el código OTP.");
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
    }

    @PostMapping("/login-admin")
    public ResponseEntity<AuthResponse> loginAdmin(@Valid @RequestBody LoginRequest request) {
        Usuario admin = usuarioService.buscarPorCorreo(request.getCorreo())
                .orElseThrow(() -> new CredencialesInvalidasException("Correo o contraseña incorrectos"));

        if (!usuarioService.verificarPassword(request.getPassword(), admin.getPassword())) {
            throw new CredencialesInvalidasException("Correo o contraseña incorrectos");
        }

        if (admin.getRol() != Rol.ADMIN) {
            throw new com.alquilaya.serviciousuarios.exceptions.AccesoDenegadoException("No tienes permisos de administrador para acceder a este recurso");
        }

        String token = jwtService.generateToken(admin, null);
        
        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .id(admin.getId())
                .nombre(admin.getNombre())
                .correo(admin.getCorreo())
                .rol(admin.getRol().name())
                .perfilId(null)
                .build());
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
