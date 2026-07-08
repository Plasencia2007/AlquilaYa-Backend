package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.config.JwtService;
import com.alquilaya.serviciousuarios.dto.*;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.repositories.ArrendadorRepository;
import com.alquilaya.serviciousuarios.repositories.EstudianteRepository;
import com.alquilaya.serviciousuarios.enums.MetodoVerificacion;
import com.alquilaya.serviciousuarios.exceptions.EmailNoVerificadoException;
import com.alquilaya.serviciousuarios.services.ConfiguracionAuthService;
import com.alquilaya.serviciousuarios.services.EmailVerificationService;
import com.alquilaya.serviciousuarios.dto.SesionDTO;
import com.alquilaya.serviciousuarios.services.GoogleAuthService;
import com.alquilaya.serviciousuarios.services.JwtBlacklistService;
import com.alquilaya.serviciousuarios.services.SesionService;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
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
    private final EmailVerificationService emailVerificationService;
    private final ConfiguracionAuthService configuracionAuthService;
    private final LoginAttemptService loginAttemptService;
    private final OtpService otpService;
    private final GoogleAuthService googleAuthService;
    private final JwtBlacklistService jwtBlacklistService;
    private final SesionService sesionService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest http) {
        Usuario usuarioCreado = usuarioService.registrarUsuario(request);
        // Dispara el email de verificación solo si el método elegido lo exige (#3).
        if (configuracionAuthService.getMetodo().requiereEmail()) {
            emailVerificationService.enviar(usuarioCreado);
        }
        Long perfilId = obtenerPerfilId(usuarioCreado);
        String token = jwtService.generateToken(usuarioCreado, perfilId);
        sesionService.registrar(usuarioCreado.getId(), jwtService.extractJti(token), http, jwtService.getExpiration(token));

        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .id(usuarioCreado.getId())
                .nombre(usuarioCreado.getNombre())
                .correo(usuarioCreado.getCorreo())
                .rol(usuarioCreado.getRol().name())
                .perfilId(perfilId)
                .build());
    }

    // Solo un ADMIN autenticado puede crear otros administradores. El primer ADMIN se crea
    // por semilla inicial (data.sql / DataInitializer), nunca por este endpoint público.
    @PostMapping("/register-admin")
    @PreAuthorize("hasRole('ADMIN')")
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

        // Gate de verificación según el método elegido por el admin (#3).
        // No cuenta como fallo de login: las credenciales eran correctas.
        MetodoVerificacion metodo = configuracionAuthService.getMetodo();
        if (metodo.requiereTelefono() && !usuario.isTelefonoVerificado()) {
            throw new TelefonoNoVerificadoException("Debes verificar tu número de WhatsApp antes de iniciar sesión. Revisa tu WhatsApp para el código OTP.");
        }
        if (metodo.requiereEmail() && !usuario.isEmailVerificado()) {
            throw new EmailNoVerificadoException("Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada (y spam).");
        }

        loginAttemptService.registrarExito(usuario.getCorreo(), ip);

        Long perfilId = obtenerPerfilId(usuario);
        String token = jwtService.generateToken(usuario, perfilId);
        sesionService.registrar(usuario.getId(), jwtService.extractJti(token), http, jwtService.getExpiration(token));

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
    public ResponseEntity<AuthResponse> loginAdmin(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        String ip = clientIp(http);

        // Mismo lockout que el login normal (5 fallos/15min): evita fuerza bruta de credenciales admin.
        loginAttemptService.verificarBloqueo(request.getCorreo());

        Usuario admin = usuarioService.buscarPorCorreo(request.getCorreo()).orElse(null);
        if (admin == null || !usuarioService.verificarPassword(request.getPassword(), admin.getPassword())) {
            loginAttemptService.registrarFallo(request.getCorreo(), ip);
            throw new CredencialesInvalidasException("Correo o contraseña incorrectos");
        }

        if (admin.getRol() != Rol.ADMIN) {
            throw new com.alquilaya.serviciousuarios.exceptions.AccesoDenegadoException("No tienes permisos de administrador para acceder a este recurso");
        }

        loginAttemptService.registrarExito(admin.getCorreo(), ip);
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
        sesionService.registrar(usuario.getId(), jwtService.extractJti(token), http, jwtService.getExpiration(token));

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

    /** Verifica el correo con el código de 6 dígitos enviado por email (#3). */
    @PostMapping("/verify-email")
    public ResponseEntity<Map<String, String>> verifyEmail(@Valid @RequestBody VerificarEmailRequest request) {
        emailVerificationService.verificarCodigo(request.getCorreo(), request.getCodigo());
        return ResponseEntity.ok(Map.of("mensaje", "Correo verificado correctamente."));
    }

    /**
     * Reenvía el email de verificación. 200 idempotente (no revela si el correo existe
     * ni si ya estaba verificado), igual que forgot-password.
     */
    @PostMapping("/resend-email-verification")
    public ResponseEntity<Map<String, String>> resendEmailVerification(
            @Valid @RequestBody ForgotPasswordRequest request) {
        emailVerificationService.solicitar(request.getCorreo());
        return ResponseEntity.ok(Map.of(
                "mensaje", "Si el correo está registrado y sin verificar, te enviamos un enlace."
        ));
    }

    /**
     * Cierra la sesión revocando el JWT enviado en el header Authorization.
     *
     * <p>El token se agrega al blacklist Redis ({@code usuarios:blacklist:jwt:*})
     * con TTL igual al tiempo restante hasta su expiración natural. A partir
     * de este punto, cualquier request que llegue con ese token devolverá 401.</p>
     *
     * <p>Idempotente: si el token es inválido, ya expiró o ya estaba revocado,
     * igual se devuelve 200 OK (no revela info al cliente).</p>
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest req) {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                java.util.Date exp = jwtService.getExpiration(token);
                jwtBlacklistService.blacklist(token, exp);
                // También quita esta sesión del registro de dispositivos (#10).
                String jti = jwtService.extractJti(token);
                Long userId = userIdDe(req);
                if (jti != null && userId != null) sesionService.revocar(userId, jti);
            } catch (Exception e) {
                // Token malformado / firma inválida / expirado: no revelamos detalles.
                // El cliente igual recibe 200.
            }
        }
        return ResponseEntity.ok(Map.of("mensaje", "Sesión cerrada correctamente."));
    }

    // ===== Sesiones / dispositivos + cierre remoto (#10) =====

    @GetMapping("/sesiones")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SesionDTO>> misSesiones(HttpServletRequest req) {
        return ResponseEntity.ok(sesionService.listar(userIdDe(req), jtiDe(req)));
    }

    @DeleteMapping("/sesiones/{jti}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> cerrarSesion(@PathVariable String jti, HttpServletRequest req) {
        Long userId = userIdDe(req);
        if (userId != null) sesionService.revocar(userId, jti);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/sesiones/cerrar-otras")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> cerrarOtrasSesiones(HttpServletRequest req) {
        Long userId = userIdDe(req);
        int n = userId != null ? sesionService.revocarOtras(userId, jtiDe(req)) : 0;
        return ResponseEntity.ok(Map.of("cerradas", n));
    }

    private String bearer(HttpServletRequest req) {
        String h = req.getHeader("Authorization");
        return (h != null && h.startsWith("Bearer ")) ? h.substring(7) : null;
    }

    private Long userIdDe(HttpServletRequest req) {
        String token = bearer(req);
        if (token == null) return null;
        try {
            return usuarioService.buscarPorCorreo(jwtService.extractUsername(token))
                    .map(Usuario::getId).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    private String jtiDe(HttpServletRequest req) {
        String token = bearer(req);
        return token == null ? null : jwtService.extractJti(token);
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
