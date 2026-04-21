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
    public ResponseEntity<?> verifyOtp(@RequestBody java.util.Map<String, String> request) {
        String telefono = request.get("telefono");
        String codigo = request.get("codigo");

        if (usuarioService.confirmarTelefono(telefono, codigo)) {
            return ResponseEntity.ok("Teléfono verificado exitosamente");
        } else {
            return ResponseEntity.status(400).body("Código inválido o expirado");
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            return usuarioService.buscarPorCorreo(request.getCorreo())
                    .map(usuario -> {
                        if (!usuarioService.verificarPassword(request.getPassword(), usuario.getPassword())) {
                            return ResponseEntity.status(401).body("Credenciales incorrectas");
                        }

                        if (!usuario.isTelefonoVerificado()) {
                            return ResponseEntity.status(403).body("Debes verificar tu número de WhatsApp antes de ingresar");
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
                    .orElse(ResponseEntity.status(401).body("Credenciales incorrectas"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error interno en el servidor");
        }
    }

    @PostMapping("/login-admin")
    public ResponseEntity<?> loginAdmin(@Valid @RequestBody LoginRequest request) {
        try {
            return usuarioService.buscarPorCorreo(request.getCorreo())
                    .map(admin -> {
                        if (!usuarioService.verificarPassword(request.getPassword(), admin.getPassword())) {
                            return ResponseEntity.status(401).body("Credenciales incorrectas");
                        }

                        if (admin.getRol() != Rol.ADMIN) {
                            return ResponseEntity.status(403).body("Acceso denegado: No es un administrador");
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
                    })
                    .orElse(ResponseEntity.status(401).body("Credenciales incorrectas"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error interno en el servidor");
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
