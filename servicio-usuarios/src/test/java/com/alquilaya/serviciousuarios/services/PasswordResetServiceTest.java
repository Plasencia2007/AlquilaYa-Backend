package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.config.JwtService;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Date;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Unit tests del flow "olvidé mi contraseña", con todas las dependencias mockeadas.
 *
 * Foco:
 *  - solicitarReset: silencioso (anti-enumeración) — no revela si el correo existe.
 *  - resetear: token de un solo uso (rechaza reuso), validez del token y revocación
 *    de todas las sesiones tras cambiar la contraseña.
 */
@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private JwtService jwtService;
    @Mock private EmailService emailService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private SesionService sesionService;
    @Mock private JwtBlacklistService jwtBlacklistService;

    @InjectMocks
    private PasswordResetService service;

    private static final String TOKEN = "reset.jwt.token";
    private static final String CORREO = "user@example.com";

    private Usuario usuario() {
        return Usuario.builder()
                .id(42L)
                .nombre("Ana")
                .correo(CORREO)
                .password("hash-viejo")
                .build();
    }

    // ===== solicitarReset =====

    @Test
    void solicitarReset_correoNull_noHaceNada() {
        service.solicitarReset(null);
        verifyNoInteractions(usuarioRepository, jwtService, emailService);
    }

    @Test
    void solicitarReset_correoEnBlanco_noHaceNada() {
        service.solicitarReset("   ");
        verifyNoInteractions(usuarioRepository, jwtService, emailService);
    }

    @Test
    void solicitarReset_correoNoRegistrado_esSilencioso() {
        when(usuarioRepository.findByCorreo(CORREO)).thenReturn(Optional.empty());

        service.solicitarReset(CORREO);

        verify(jwtService, never()).generatePasswordResetToken(anyString());
        verifyNoInteractions(emailService);
    }

    @Test
    void solicitarReset_correoRegistrado_generaTokenYEnviaEmail() {
        // Se pasa con espacios y mayúsculas para probar la normalización trim().toLowerCase().
        when(usuarioRepository.findByCorreo(CORREO)).thenReturn(Optional.of(usuario()));
        when(jwtService.generatePasswordResetToken(CORREO)).thenReturn(TOKEN);

        service.solicitarReset("  User@Example.com  ");

        verify(emailService).enviarResetPassword(CORREO, "Ana", TOKEN);
    }

    // ===== resetear =====

    @Test
    void resetear_tokenInvalido_lanzaYNoGuarda() {
        when(jwtService.validatePasswordResetToken(TOKEN)).thenThrow(new RuntimeException("bad token"));

        assertThatThrownBy(() -> service.resetear(TOKEN, "NuevaPass123!"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("inválido");

        verify(usuarioRepository, never()).save(any());
        verify(sesionService, never()).revocarTodas(any());
    }

    @Test
    void resetear_tokenYaUsado_lanzaYNoGuarda() {
        when(jwtService.validatePasswordResetToken(TOKEN)).thenReturn(CORREO);
        when(jwtBlacklistService.isBlacklisted(TOKEN)).thenReturn(true);

        assertThatThrownBy(() -> service.resetear(TOKEN, "NuevaPass123!"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ya fue utilizado");

        verify(usuarioRepository, never()).save(any());
        verify(sesionService, never()).revocarTodas(any());
    }

    @Test
    void resetear_usuarioNoExiste_lanza() {
        when(jwtService.validatePasswordResetToken(TOKEN)).thenReturn(CORREO);
        when(jwtBlacklistService.isBlacklisted(TOKEN)).thenReturn(false);
        when(usuarioRepository.findByCorreo(CORREO)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.resetear(TOKEN, "NuevaPass123!"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no encontrada");

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void resetear_ok_cambiaPasswordInvalidaTokenYRevocaSesiones() {
        Usuario u = usuario();
        Date exp = new Date(System.currentTimeMillis() + 900_000L);
        when(jwtService.validatePasswordResetToken(TOKEN)).thenReturn(CORREO);
        when(jwtBlacklistService.isBlacklisted(TOKEN)).thenReturn(false);
        when(usuarioRepository.findByCorreo(CORREO)).thenReturn(Optional.of(u));
        when(passwordEncoder.encode("NuevaPass123!")).thenReturn("hash-nuevo");
        when(jwtService.getExpiration(TOKEN)).thenReturn(exp);

        service.resetear(TOKEN, "NuevaPass123!");

        assertThat(u.getPassword()).isEqualTo("hash-nuevo");
        verify(usuarioRepository).save(u);
        verify(jwtBlacklistService).blacklist(eq(TOKEN), any(Date.class));
        verify(sesionService).revocarTodas(42L);
    }
}
