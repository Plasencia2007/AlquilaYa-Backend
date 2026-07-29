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
import com.alquilaya.serviciousuarios.services.OtpRateLimitService;
import com.alquilaya.serviciousuarios.services.OtpService;
import com.alquilaya.serviciousuarios.services.PasswordResetService;
import com.alquilaya.serviciousuarios.services.UsuarioService;
import com.alquilaya.serviciousuarios.exceptions.CredencialesInvalidasException;
import com.alquilaya.serviciousuarios.exceptions.OtpInvalidoException;
import com.alquilaya.serviciousuarios.exceptions.TelefonoNoVerificadoException;
import com.alquilaya.serviciousuarios.util.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.Duration;
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
    private final com.alquilaya.serviciousuarios.services.RefreshTokenService refreshTokenService;
    // Item 229 (2FA/TOTP): completa el segundo paso del login cuando el usuario tiene 2FA activo.
    private final com.alquilaya.serviciousuarios.services.TotpService totpService;
    // Rate-limit del código TOTP en /2fa/login-verificar (mismo mecanismo Redis+TTL que ya
    // protege el OTP por WhatsApp, keyed con un prefijo propio para no mezclar contadores).
    private final OtpRateLimitService otpRateLimitService;
    // #184: anti-bots en register/resend-otp/forgot-password (el rate-limit por IP no frena
    // bots que rotan IP). Degrada a "permitir" si no hay TURNSTILE_SECRET_KEY configurada.
    private final com.alquilaya.serviciousuarios.services.TurnstileService turnstileService;
    // S8: misma resolución de IP (respeta rate-limit.trusted-hops) que usa RateLimitFilter —
    // antes este controller tomaba a ciegas la primera entrada de X-Forwarded-For, falsificable
    // por el cliente, contaminando la IP guardada en LoginAttempt y en las alertas de intentos fallidos.
    private final ClientIpResolver clientIpResolver;

    @org.springframework.beans.factory.annotation.Value("${jwt.refresh-expiration-ms:2592000000}")
    private long refreshExpirationMs;

    private static final String COOKIE_REFRESH = "refresh-token";
    // Alcance del cookie: sólo se manda en /api/v1/usuarios/auth/** (login/refresh/logout),
    // no en cada petición a la API — reduce la superficie de exposición del refresh token.
    private static final String COOKIE_PATH_REFRESH = "/api/v1/usuarios/auth";

    // S5: el access token también es httpOnly. Va con Path=/ (todo el dominio) — lo necesita
    // el gateway en cada llamada de la API (/api/v1/**, para traducirlo al header Authorization
    // vía CookieToAuthorizationFilter) Y el handshake del WebSocket directo a servicio-mensajeria
    // (/ws-mensajeria, que NO cae bajo /api/v1 — con ese path más angosto el navegador no
    // habría mandado el cookie ahí). Sigue siendo httpOnly: ampliar el path no expone el valor
    // a JS en ninguna ruta, sólo amplía a qué peticiones el navegador lo adjunta solo.
    private static final String COOKIE_ACCESS = "auth-token";
    private static final String COOKIE_PATH_ACCESS = "/";

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request,
            HttpServletRequest http, HttpServletResponse resp) {
        if (!turnstileService.verificar(request.getTurnstileToken())) {
            throw new IllegalArgumentException("No pudimos verificar que eres una persona. Inténtalo de nuevo.");
        }
        Usuario usuarioCreado = usuarioService.registrarUsuario(request);
        com.alquilaya.serviciousuarios.enums.MetodoVerificacion metodo = configuracionAuthService.getMetodo();
        // Dispara el email de verificación solo si el método elegido lo exige (#3).
        if (metodo.requiereEmail()) {
            emailVerificationService.enviar(usuarioCreado);
        }
        // U1: /register NO entrega un JWT usable si aún falta verificar (WHATSAPP_OTP/EMAIL/AMBOS).
        // Antes devolvía un token válido de una → la verificación era opcional. El token real se
        // emite al completar la verificación (verify-otp/verify-email) o de una si el método es NINGUNO.
        if (estaCompletamenteVerificado(usuarioCreado, metodo)) {
            return ResponseEntity.ok(emitirSesion(usuarioCreado, http, resp));
        }
        return ResponseEntity.ok(respuestaSinToken(usuarioCreado));
    }

    // Solo un ADMIN autenticado puede crear otros administradores. El primer ADMIN se crea
    // por semilla inicial (data.sql / DataInitializer), nunca por este endpoint público.
    @PostMapping("/register-admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthResponse> registerAdmin(@Valid @RequestBody AdminRegisterRequest request,
            HttpServletRequest http, HttpServletResponse resp) {
        Usuario admin = usuarioService.registrarAdmin(request);
        String token = jwtService.generateToken(admin, null);
        setAccessCookie(resp, token, http);

        return ResponseEntity.ok(AuthResponse.builder()
                .autenticado(true)
                .id(admin.getId())
                .nombre(admin.getNombre())
                .correo(admin.getCorreo())
                .rol(admin.getRol().name())
                .perfilId(null)
                .foto(admin.getFotoUrl())
                .emailVerificado(admin.isEmailVerificado())
                .tipoLogin(admin.getTipoLogin() != null ? admin.getTipoLogin().name() : "LOCAL")
                .build());
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody VerificarOtpRequest request,
            HttpServletRequest http, HttpServletResponse resp) {
        if (!usuarioService.confirmarTelefono(request.getTelefono(), request.getCodigo())) {
            throw new OtpInvalidoException("El código OTP es incorrecto o ha expirado. Solicita uno nuevo desde la pantalla de verificación.");
        }
        // U1: al verificar, emitimos el token real (si ya no falta ninguna verificación; AMBOS aún
        // podría requerir el email). Así el token útil nace recién cuando la cuenta está verificada.
        Usuario u = usuarioService.buscarPorTelefono(request.getTelefono())
                .orElseThrow(() -> new com.alquilaya.serviciousuarios.exceptions.RecursoNoEncontradoException("No se encontró el usuario tras verificar el OTP"));
        com.alquilaya.serviciousuarios.enums.MetodoVerificacion metodo = configuracionAuthService.getMetodo();
        if (estaCompletamenteVerificado(u, metodo)) {
            return ResponseEntity.ok(emitirSesion(u, http, resp));
        }
        return ResponseEntity.ok(respuestaSinToken(u));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
            HttpServletRequest http, HttpServletResponse resp) {
        String ip = clientIp(http);

        // Bloqueo previo (lanza 423 si está bloqueada)
        loginAttemptService.verificarBloqueo(request.getCorreo());

        Usuario usuario = usuarioService.buscarPorCorreo(request.getCorreo()).orElse(null);

        if (usuario == null || !usuarioService.verificarPassword(request.getPassword(), usuario.getPassword())) {
            loginAttemptService.registrarFallo(request.getCorreo(), ip);
            throw new CredencialesInvalidasException("Correo o contraseña incorrectos");
        }

        // La cuenta debe estar habilitada (no baneada/suspendida/rechazada). U4.
        // Las credenciales eran correctas → no cuenta como fallo de login.
        verificarCuentaHabilitada(usuario);

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

        // Item 229: si el usuario activó 2FA, el password correcto NO basta — se detiene acá,
        // sin emitir sesión, y el frontend debe completar con POST /auth/2fa/login-verificar.
        // Mismo patrón que el gate de verificación de email/teléfono (autenticado=false, sin
        // cookies), pero con su propio flag `requiere2fa` para que el frontend sepa a qué
        // pantalla ir.
        if (usuario.isTotpHabilitado()) {
            return ResponseEntity.ok(respuesta2faPendiente(usuario));
        }

        return ResponseEntity.ok(emitirSesion(usuario, http, resp));
    }

    /**
     * Segundo paso del login cuando /login respondió {@code requiere2fa=true} (ítem 229):
     * valida el código TOTP de 6 dígitos y, si es correcto, recién ahí emite la sesión
     * (mismas cookies httpOnly que un login normal). Rate-limited por correo (Redis+TTL,
     * {@link OtpRateLimitService}) para que no sea trivial fuerza-bruta los 6 dígitos.
     */
    @PostMapping("/2fa/login-verificar")
    public ResponseEntity<AuthResponse> loginVerificarTotp(@Valid @RequestBody LoginVerificarTotpRequest request,
            HttpServletRequest http, HttpServletResponse resp) {
        String ip = clientIp(http);
        String rateLimitKey = "2fa-login:" + request.getCorreo();
        otpRateLimitService.verificarLockout(rateLimitKey);

        Usuario usuario = usuarioService.buscarPorCorreo(request.getCorreo()).orElse(null);
        if (usuario == null || !usuario.isTotpHabilitado()) {
            throw new CredencialesInvalidasException("No se pudo completar la verificación en dos pasos.");
        }
        verificarCuentaHabilitada(usuario);

        if (!totpService.verificar(usuario.getTotpSecret(), request.getCodigo())) {
            otpRateLimitService.registrarFallo(rateLimitKey);
            throw new OtpInvalidoException("El código de autenticación es incorrecto o expiró.");
        }
        otpRateLimitService.limpiar(rateLimitKey);
        loginAttemptService.registrarExito(usuario.getCorreo(), ip);

        return ResponseEntity.ok(emitirSesion(usuario, http, resp));
    }

    /**
     * Bloquea el login de cuentas no habilitadas (baneada/suspendida/rechazada). U4.
     * Se llama tras validar la contraseña, por lo que no cuenta como fallo de credenciales.
     */
    private void verificarCuentaHabilitada(Usuario usuario) {
        // G8-B: una cuenta dada de baja/anonimizada (GDPR) no puede iniciar sesión.
        // Se comprueba ANTES del estado para dar un mensaje específico (no "baneada").
        if (usuario.isEliminado()) {
            throw new com.alquilaya.serviciousuarios.exceptions.AccesoDenegadoException(
                    "Esta cuenta fue eliminada. Si deseas volver, crea una cuenta nueva.");
        }
        com.alquilaya.serviciousuarios.enums.EstadoUsuario estado = usuario.getEstado();
        if (estado != null && estado.bloqueaAcceso()) {
            String motivo = switch (estado) {
                case BANNED -> "Tu cuenta ha sido baneada. Si crees que es un error, contacta a soporte.";
                case SUSPENDED -> "Tu cuenta está suspendida temporalmente. Contacta a soporte para reactivarla.";
                case REJECTED -> "Tu registro fue rechazado. Contacta a soporte para más información.";
                default -> "Tu cuenta no está habilitada para iniciar sesión.";
            };
            throw new com.alquilaya.serviciousuarios.exceptions.AccesoDenegadoException(motivo);
        }
    }

    /**
     * Obtiene la IP real del cliente. Delega en {@link ClientIpResolver} (S8) — la misma
     * lógica que usa {@code RateLimitFilter}, en vez de reimplementar aquí una versión que
     * confiaba a ciegas en X-Forwarded-For sin validar proxies de confianza.
     */
    private String clientIp(HttpServletRequest req) {
        return clientIpResolver.resolve(req);
    }

    @PostMapping("/login-admin")
    public ResponseEntity<AuthResponse> loginAdmin(@Valid @RequestBody LoginRequest request,
            HttpServletRequest http, HttpServletResponse resp) {
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

        // Un admin baneado/suspendido tampoco entra. U4.
        verificarCuentaHabilitada(admin);

        loginAttemptService.registrarExito(admin.getCorreo(), ip);

        // G7: unificado con emitirSesion() (antes no registraba la sesión ni emitía refresh token).
        return ResponseEntity.ok(emitirSesion(admin, http, resp));
    }

    /**
     * G7 + S5: canjea el refresh token vigente (leído del cookie httpOnly, JS no puede tocarlo)
     * por un access token nuevo, SIN pedir credenciales. Se ROTA en cada uso (el usado queda
     * inválido; reintentarlo = 401), lo que detecta reuso de un token robado. No requiere el
     * access token anterior (puede estar ya expirado — ese es el caso de uso: renovar sesión
     * sin "expulsar a media sesión").
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = COOKIE_REFRESH, required = false) String refreshTokenCookie,
            HttpServletRequest http, HttpServletResponse resp) {
        var resultado = refreshTokenService.validarYRotar(refreshTokenCookie)
                .orElseThrow(() -> new com.alquilaya.serviciousuarios.exceptions.AccesoDenegadoException(
                        "Refresh token inválido o expirado. Inicia sesión de nuevo."));
        Usuario usuario = usuarioService.obtenerPorId(resultado.userId());
        // Igual que en login: una cuenta baneada/suspendida/eliminada no puede renovar su sesión.
        verificarCuentaHabilitada(usuario);

        Long perfilId = obtenerPerfilId(usuario);
        String token = jwtService.generateToken(usuario, perfilId);
        sesionService.registrar(usuario.getId(), jwtService.extractJti(token), http, jwtService.getExpiration(token));
        setAccessCookie(resp, token, http);
        setRefreshCookie(resp, resultado.nuevoRefreshToken(), http);

        return ResponseEntity.ok(AuthResponse.builder()
                .autenticado(true)
                .id(usuario.getId())
                .nombre(usuario.getNombre())
                .correo(usuario.getCorreo())
                .rol(usuario.getRol().name())
                .perfilId(perfilId)
                .foto(usuario.getFotoUrl())
                .emailVerificado(usuario.isEmailVerificado())
                .tipoLogin(usuario.getTipoLogin() != null ? usuario.getTipoLogin().name() : "LOCAL")
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
                                                    HttpServletRequest http, HttpServletResponse resp) {
        Usuario usuario = googleAuthService.autenticarConGoogle(request.getIdToken(), request.getRolPreferido());

        // Aunque Google verifique el email, una cuenta baneada/suspendida no entra. U4.
        verificarCuentaHabilitada(usuario);

        loginAttemptService.registrarExito(usuario.getCorreo(), clientIp(http));

        return ResponseEntity.ok(emitirSesion(usuario, http, resp));
    }

    /**
     * Reenvía un nuevo OTP al teléfono. Rate-limited (60s cooldown,
     * máx 3 reenvíos en 15min). El servicio levanta error si se viola.
     */
    @PostMapping("/resend-otp")
    public ResponseEntity<com.alquilaya.serviciousuarios.dto.ReenviarOtpResponse> resendOtp(
            @Valid @RequestBody ResendOtpRequest request) {
        if (!turnstileService.verificar(request.getTurnstileToken())) {
            throw new IllegalArgumentException("No pudimos verificar que eres una persona. Inténtalo de nuevo.");
        }
        return ResponseEntity.ok(otpService.reenviarOtp(request.getTelefono()));
    }

    /**
     * Solicita un email con link de reset de contraseña.
     * Devuelve 200 SIEMPRE (idempotente) — no revela si el correo existe,
     * defensa contra enumeración de cuentas.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        if (!turnstileService.verificar(request.getTurnstileToken())) {
            throw new IllegalArgumentException("No pudimos verificar que eres una persona. Inténtalo de nuevo.");
        }
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

    /** Verifica el correo con el código de 6 dígitos enviado por email (#3). Emite el token si ya está todo verificado (U1). */
    @PostMapping("/verify-email")
    public ResponseEntity<AuthResponse> verifyEmail(@Valid @RequestBody VerificarEmailRequest request,
            HttpServletRequest http, HttpServletResponse resp) {
        emailVerificationService.verificarCodigo(request.getCorreo(), request.getCodigo());
        Usuario u = usuarioService.buscarPorCorreo(request.getCorreo())
                .orElseThrow(() -> new com.alquilaya.serviciousuarios.exceptions.RecursoNoEncontradoException("No se encontró el usuario tras verificar el correo"));
        com.alquilaya.serviciousuarios.enums.MetodoVerificacion metodo = configuracionAuthService.getMetodo();
        if (estaCompletamenteVerificado(u, metodo)) {
            return ResponseEntity.ok(emitirSesion(u, http, resp));
        }
        return ResponseEntity.ok(respuestaSinToken(u));
    }

    /**
     * Verifica el correo con el enlace de un solo click enviado por email (ítem 179),
     * alternativa a ingresar el código de 6 dígitos a mano en {@code /verify-email}. Mismo
     * efecto: activa {@code emailVerificado} y, si con eso ya no falta ninguna otra
     * verificación (U1), emite la sesión.
     */
    @GetMapping("/verify-email-token")
    public ResponseEntity<AuthResponse> verifyEmailToken(@RequestParam String token,
            HttpServletRequest http, HttpServletResponse resp) {
        Usuario u = emailVerificationService.verificarToken(token);
        com.alquilaya.serviciousuarios.enums.MetodoVerificacion metodo = configuracionAuthService.getMetodo();
        if (estaCompletamenteVerificado(u, metodo)) {
            return ResponseEntity.ok(emitirSesion(u, http, resp));
        }
        return ResponseEntity.ok(respuestaSinToken(u));
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
     *
     * <p>G7 + S5: si viene el cookie {@code refresh-token} (httpOnly), también se revoca y se
     * borra el cookie — si no, quedaría vivo hasta su expiración natural y serviría para
     * reobtener access tokens tras el logout.</p>
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest req, HttpServletResponse resp,
            @CookieValue(name = COOKIE_REFRESH, required = false) String refreshTokenCookie) {
        if (refreshTokenCookie != null && !refreshTokenCookie.isBlank()) {
            refreshTokenService.revocar(refreshTokenCookie);
        }
        borrarRefreshCookie(resp);
        borrarAccessCookie(resp);
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

    /**
     * U1: True si el usuario cumple TODAS las verificaciones exigidas por el método actual.
     * Sólo entonces se le entrega un token usable (register/verify-otp/verify-email).
     */
    private boolean estaCompletamenteVerificado(Usuario u, com.alquilaya.serviciousuarios.enums.MetodoVerificacion metodo) {
        boolean okTelefono = !metodo.requiereTelefono() || u.isTelefonoVerificado();
        boolean okEmail = !metodo.requiereEmail() || u.isEmailVerificado();
        return okTelefono && okEmail;
    }

    /**
     * Genera el token + refresh token, registra la sesión y arma el AuthResponse. U1, G7.
     * S5: el refresh token NO va en el JSON (un XSS que lea la respuesta lo robaría igual);
     * se manda SOLO como cookie httpOnly — JavaScript no puede leerlo ni con XSS activo.
     */
    private AuthResponse emitirSesion(Usuario u, HttpServletRequest http, HttpServletResponse resp) {
        Long perfilId = obtenerPerfilId(u);
        String token = jwtService.generateToken(u, perfilId);
        sesionService.registrar(u.getId(), jwtService.extractJti(token), http, jwtService.getExpiration(token));
        String refreshToken = refreshTokenService.generar(u.getId());
        setAccessCookie(resp, token, http);
        setRefreshCookie(resp, refreshToken, http);
        return AuthResponse.builder()
                .autenticado(true)
                .id(u.getId())
                .nombre(u.getNombre())
                .correo(u.getCorreo())
                .rol(u.getRol().name())
                .perfilId(perfilId)
                .foto(u.getFotoUrl())
                .emailVerificado(u.isEmailVerificado())
                .tipoLogin(u.getTipoLogin() != null ? u.getTipoLogin().name() : "LOCAL")
                .build();
    }

    /**
     * S5: setea el refresh token como cookie httpOnly (inaccesible a JS/XSS), con {@code Secure}
     * cuando la conexión es HTTPS (directo o detrás del gateway/nginx vía X-Forwarded-Proto —
     * en dev por http plano NO se marca Secure, o el navegador la descartaría) y
     * {@code SameSite=Lax} (basta: mismo "site" cubre localhost:3000↔:8080 en dev y el dominio
     * real en prod; bloquea el envío en navegación cross-site de terceros).
     */
    private void setRefreshCookie(HttpServletResponse resp, String refreshToken, HttpServletRequest req) {
        if (refreshToken == null) return;
        ResponseCookie cookie = ResponseCookie.from(COOKIE_REFRESH, refreshToken)
                .httpOnly(true)
                .secure(esSeguro(req))
                .sameSite("Lax")
                .path(COOKIE_PATH_REFRESH)
                .maxAge(Duration.ofMillis(refreshExpirationMs))
                .build();
        resp.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    /** S5: borra el cookie de refresh token (logout). */
    private void borrarRefreshCookie(HttpServletResponse resp) {
        ResponseCookie cookie = ResponseCookie.from(COOKIE_REFRESH, "")
                .httpOnly(true)
                .path(COOKIE_PATH_REFRESH)
                .maxAge(0)
                .build();
        resp.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    /**
     * S5: setea el access token como cookie httpOnly. Path=/api/v1 (toda la API, no sólo
     * auth) porque {@code CookieToAuthorizationFilter} del gateway lo necesita en cada
     * llamada para traducirlo al header Authorization que ya esperan todos los servicios
     * downstream (ninguno cambió su forma de leer el JWT — sigue siendo el mismo header).
     * maxAge = tiempo real hasta la expiración del JWT (no un valor fijo aparte).
     */
    private void setAccessCookie(HttpServletResponse resp, String token, HttpServletRequest req) {
        if (token == null) return;
        long maxAgeMs = Math.max(0, jwtService.getExpiration(token).getTime() - System.currentTimeMillis());
        ResponseCookie cookie = ResponseCookie.from(COOKIE_ACCESS, token)
                .httpOnly(true)
                .secure(esSeguro(req))
                .sameSite("Lax")
                .path(COOKIE_PATH_ACCESS)
                .maxAge(Duration.ofMillis(maxAgeMs))
                .build();
        resp.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    /** S5: borra el cookie de access token (logout). */
    private void borrarAccessCookie(HttpServletResponse resp) {
        ResponseCookie cookie = ResponseCookie.from(COOKIE_ACCESS, "")
                .httpOnly(true)
                .path(COOKIE_PATH_ACCESS)
                .maxAge(0)
                .build();
        resp.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private static boolean esSeguro(HttpServletRequest req) {
        return req.isSecure() || "https".equalsIgnoreCase(req.getHeader("X-Forwarded-Proto"));
    }

    /**
     * AuthResponse SIN token: la cuenta se creó/verificó parcialmente pero aún falta verificación,
     * así que el frontend permanece en el paso de OTP/email. El token llega al completar la verificación. U1.
     */
    private AuthResponse respuestaSinToken(Usuario u) {
        return AuthResponse.builder()
                .autenticado(false)
                .id(u.getId())
                .nombre(u.getNombre())
                .correo(u.getCorreo())
                .rol(u.getRol().name())
                .perfilId(obtenerPerfilId(u))
                .foto(u.getFotoUrl())
                .emailVerificado(u.isEmailVerificado())
                .tipoLogin(u.getTipoLogin() != null ? u.getTipoLogin().name() : "LOCAL")
                .build();
    }

    /**
     * Item 229: password correcto pero falta el segundo factor TOTP. Igual que
     * {@link #respuestaSinToken(Usuario)} (sin cookies, autenticado=false), pero con
     * {@code requiere2fa=true} para que el frontend muestre el paso de código TOTP en vez
     * de la pantalla de verificación de email/teléfono.
     */
    private AuthResponse respuesta2faPendiente(Usuario u) {
        return AuthResponse.builder()
                .autenticado(false)
                .requiere2fa(true)
                .id(u.getId())
                .nombre(u.getNombre())
                .correo(u.getCorreo())
                .rol(u.getRol().name())
                .perfilId(obtenerPerfilId(u))
                .foto(u.getFotoUrl())
                .emailVerificado(u.isEmailVerificado())
                .tipoLogin(u.getTipoLogin() != null ? u.getTipoLogin().name() : "LOCAL")
                .build();
    }
}
