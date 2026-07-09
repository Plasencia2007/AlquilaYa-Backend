package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.entities.Arrendador;
import com.alquilaya.serviciousuarios.entities.Estudiante;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.EstadoUsuario;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.enums.TipoLogin;
import com.alquilaya.serviciousuarios.exceptions.CredencialesInvalidasException;
import com.alquilaya.serviciousuarios.repositories.ArrendadorRepository;
import com.alquilaya.serviciousuarios.repositories.EstudianteRepository;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import com.alquilaya.serviciousuarios.util.LogMask;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Collections;
import java.util.Optional;

/**
 * Login con Google Identity Services.
 *
 * Flow:
 *  1. Frontend obtiene `id_token` desde Google (popup OAuth con @react-oauth/google).
 *  2. Llama POST /auth/google-login con el id_token.
 *  3. {@link #autenticarConGoogle(String, Rol)} valida el token contra Google,
 *     extrae email + nombre, busca usuario; si no existe lo crea con un
 *     password aleatorio (que el usuario nunca verá).
 *  4. AuthController genera el JWT propio de AlquilaYa y devuelve.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleAuthService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final ArrendadorRepository arrendadorRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${google.oauth.client-id:}")
    private String googleClientId;

    private GoogleIdTokenVerifier verifier;

    @PostConstruct
    void init() {
        if (googleClientId == null || googleClientId.isBlank()) {
            log.warn("[GoogleAuth] google.oauth.client-id NO configurado — el login con Google no funcionará.");
            return;
        }
        verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(googleClientId))
                .build();
    }

    @Transactional
    public Usuario autenticarConGoogle(String idTokenString, Rol rolPreferido) {
        if (verifier == null) {
            throw new IllegalStateException(
                    "Login con Google no está disponible: configurar GOOGLE_OAUTH_CLIENT_ID.");
        }

        GoogleIdToken idToken;
        try {
            idToken = verifier.verify(idTokenString);
        } catch (Exception e) {
            log.warn("[GoogleAuth] Verificación falló: {}", e.getMessage());
            throw new CredencialesInvalidasException("El token de Google no pudo ser verificado.");
        }
        if (idToken == null) {
            throw new CredencialesInvalidasException("Token de Google inválido o expirado.");
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        Boolean emailVerified = payload.getEmailVerified();
        String email = payload.getEmail();
        String nombreCompleto = (String) payload.get("name");
        String givenName = (String) payload.get("given_name");
        String familyName = (String) payload.get("family_name");
        String picture = (String) payload.get("picture");

        if (email == null || Boolean.FALSE.equals(emailVerified)) {
            throw new CredencialesInvalidasException("La cuenta de Google no tiene email verificado.");
        }

        String correoNorm = email.trim().toLowerCase();
        Optional<Usuario> existente = usuarioRepository.findByCorreo(correoNorm);
        if (existente.isPresent()) {
            Usuario u = existente.get();
            boolean cambiado = false;
            // Backfill de la foto de Google si el usuario aún no tiene una.
            if ((u.getFotoUrl() == null || u.getFotoUrl().isBlank()) && picture != null && !picture.isBlank()) {
                u.setFotoUrl(picture);
                cambiado = true;
            }
            // Si la cuenta fue creada por Google (DNI placeholder) y aún no está marcada, corrige el tipo.
            if (u.getTipoLogin() != TipoLogin.GOOGLE && "00000000".equals(u.getDni())) {
                u.setTipoLogin(TipoLogin.GOOGLE);
                cambiado = true;
            }
            if (cambiado) usuarioRepository.save(u);
            // Backfill: si por data drift un ARRENDADOR (p. ej. rol cambiado luego del alta,
            // o alta previa a este fix) no tiene perfil Arrendador, se crea aquí para que
            // obtenerPerfilId() y el resto del flujo (propiedades, KYC, pagos) no queden rotos.
            if (u.getRol() == Rol.ARRENDADOR && arrendadorRepository.findByUsuario(u).isEmpty()) {
                crearPerfilArrendadorMinimo(u);
            }
            log.info("[GoogleAuth] Login existente para {}", LogMask.email(correoNorm));
            return u;
        }

        // Usuario nuevo
        Rol rol = rolPreferido != null ? rolPreferido : Rol.ESTUDIANTE;
        if (rol == Rol.ADMIN) {
            // Nunca crear ADMIN por Google login.
            rol = Rol.ESTUDIANTE;
        }

        String passwordRandom = passwordEncoder.encode(generarPasswordRandom());

        Usuario nuevo = Usuario.builder()
                .nombre(givenName != null ? givenName : (nombreCompleto != null ? nombreCompleto : "Usuario"))
                .apellido(familyName != null ? familyName : "Google")
                .dni("00000000") // Placeholder — el usuario lo completa en perfil
                .correo(correoNorm)
                .password(passwordRandom)
                .rol(rol)
                .estado(EstadoUsuario.ACTIVE) // Google verificó email
                .emailVerificado(true) // Google ya verifica el correo (#3)
                .telefonoVerificado(false) // Sin teléfono aún
                .fotoUrl(picture) // Foto de perfil de Google
                .tipoLogin(TipoLogin.GOOGLE)
                .build();

        Usuario creado = usuarioRepository.save(nuevo);

        // Si es estudiante, crear su perfil mínimo (los detalles los completa luego)
        if (rol == Rol.ESTUDIANTE) {
            Estudiante e = Estudiante.builder()
                    .usuario(creado)
                    .universidad("Universidad Peruana Unión")
                    .codigoEstudiante("PENDIENTE")
                    .carrera("PENDIENTE")
                    .ciclo(1)
                    .verificado(false)
                    .build();
            estudianteRepository.save(e);
        } else if (rol == Rol.ARRENDADOR) {
            // Google solo entrega email/nombre: no hay telefono/RUC/dirección todavía.
            // Se crea un perfil Arrendador mínimo (nulls, sin verificar) para que
            // obtenerPerfilId() resuelva de inmediato; el usuario completa RUC,
            // dirección y mapa después desde su panel antes de poder publicar.
            crearPerfilArrendadorMinimo(creado);
        }

        log.info("[GoogleAuth] Usuario creado vía Google: {} rol={}", LogMask.email(correoNorm), rol);
        return creado;
    }

    /**
     * Crea el perfil Arrendador mínimo para una cuenta creada/logueada vía Google: sin
     * telefono/RUC/dirección (Google no los provee) y `verificado=false` hasta que complete
     * su KYC. Evita que `obtenerPerfilId` (AuthController) devuelva null y rompa creación de
     * propiedades, KYC y payouts (U3: "arrendadores de Google sin perfil").
     */
    private void crearPerfilArrendadorMinimo(Usuario usuario) {
        Arrendador arrendador = Arrendador.builder()
                .usuario(usuario)
                .verificado(false)
                .build();
        arrendadorRepository.save(arrendador);
        log.info("[GoogleAuth] Perfil Arrendador mínimo creado para usuario {}", usuario.getId());
    }

    private String generarPasswordRandom() {
        // 32 chars con may/min/dig/símbolo — pasa la validación de password segura.
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        String base = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        // Garantiza que cumpla todos los grupos por si Base64 no incluye símbolos
        return "Aa1!" + base;
    }
}
