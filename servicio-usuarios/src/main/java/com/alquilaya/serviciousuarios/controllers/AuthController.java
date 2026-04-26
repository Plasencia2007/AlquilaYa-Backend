package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.config.JwtService;
import com.alquilaya.serviciousuarios.dto.*;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.repositories.ArrendadorRepository;
import com.alquilaya.serviciousuarios.repositories.EstudianteRepository;
import com.alquilaya.serviciousuarios.services.GoogleAuthService;
import com.alquilaya.serviciousuarios.services.LoginAttemptService;
import com.alquilaya.serviciousuarios.services.OtpService;
import com.alquilaya.serviciousuarios.services.PasswordResetService;
import com.alquilaya.serviciousuarios.services.UsuarioService;
import com.alquilaya.serviciousuarios.exceptions.CredencialesInvalidasException;
import com.alquilaya.serviciousuarios.exceptions.OtpInvalidoException;
import com.alquilaya.serviciousuarios.exceptions.TelefonoNoVerificadoException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/usuarios/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UsuarioService usuarioService;
    private final JwtService jwtService;
    private final ArrendadorRepository arrendadorRepository;
    private final EstudianteRepository estudianteRepository;
    private final PasswordResetService passwordResetService;
    private final LoginAttemptService loginAttemptService;
    private final OtpService otpService;
    private final GoogleAuthService googleAuthService;

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
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        String ip = clientIp(http);

        // Bloqueo previo (lanza 423 si está bloqueada)
        loginAttemptService.verificarBloqueo(request.getCorreo());

        Usuario usuario = usuarioService.buscarPorCorreo(request.getCorreo()).orElse(null);

        if (usuario == null || !usuarioService.verificarPassword(request.getPassword(), usuario.getPassword())) {
            loginAttemptService.registrarFallo(request.getCorreo(), ip);
            throw new CredencialesInvalidasException("Correo o contraseña incorrectos");
        }

        if (!usuario.isTelefonoVerificado()) {
            // No contar como fallo de login: las credenciales eran correctas.
            throw new TelefonoNoVerificadoException("Debes verificar tu número de WhatsApp antes de iniciar sesión. Revisa tu WhatsApp para el código OTP.");
        }

        loginAttemptService.registrarExito(usuario.getCorreo(), ip);

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

    /**
     * Obtiene IP real del cliente respetando X-Forwarded-For (gateway / proxy).
     * Devuelve la primera IP de la lista (la del cliente original).
     */
    private static String clientIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        if (fwd != null && !fwd.isBlank()) {
            int comma = fwd.indexOf(',');
            return (comma > 0 ? fwd.substring(0, comma) : fwd).trim();
        }
        return req.getRemoteAddr();
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

    /**
     * Login con Google: el frontend pasa el id_token recibido del popup OAuth.
     * - Si la cuenta NO existe, se crea con rol preferido (default ESTUDIANTE),
     *   estado ACTIVE (Google ya verificó el email), sin teléfono verificado.
     * - Si la cuenta YA existe (registrada por email/password antes), simplemente
     *   se hace login con el rol existente.
     * Devuelve el JWT propio de AlquilaYa.
     */
    @PostMapping("/google-login")
    public ResponseEntity<AuthResponse> googleLogin(@Valid @RequestBody GoogleLoginRequest request,
                                                    HttpServletRequest http) {
        Usuario usuario = googleAuthService.autenticarConGoogle(request.getIdToken(), request.getRolPreferido());

        loginAttemptService.registrarExito(usuario.getCorreo(), clientIp(http));

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

    /**
     * Reenvía un nuevo OTP al teléfono. Rate-limited (60s cooldown,
     * máx 3 reenvíos en 15min). El servicio levanta error si se viola.
     */
    @PostMapping("/resend-otp")
    public ResponseEntity<Map<String, String>> resendOtp(@Valid @RequestBody ResendOtpRequest request) {
        otpService.reenviarOtp(request.getTelefono());
        return ResponseEntity.ok(Map.of(
                "mensaje", "Te enviamos un nuevo código por WhatsApp."
        ));
    }

    /**
     * Solicita un email con link de reset de contraseña.
     * Devuelve 200 SIEMPRE (idempotente) — no revela si el correo existe,
     * defensa contra enumeración de cuentas.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.solicitarReset(request.getCorreo());
        return ResponseEntity.ok(Map.of(
                "mensaje", "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña."
        ));
    }

    /**
     * Resetea la contraseña usando el token enviado por email.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetear(request.getToken(), request.getNuevaPassword());
        return ResponseEntity.ok(Map.of(
                "mensaje", "Contraseña actualizada correctamente. Ya puedes iniciar sesión."
        ));
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
