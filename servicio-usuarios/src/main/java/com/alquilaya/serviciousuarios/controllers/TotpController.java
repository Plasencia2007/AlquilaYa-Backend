package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.dto.Confirmar2faRequest;
import com.alquilaya.serviciousuarios.dto.Deshabilitar2faRequest;
import com.alquilaya.serviciousuarios.dto.Generar2faResponse;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.exceptions.CredencialesInvalidasException;
import com.alquilaya.serviciousuarios.exceptions.RecursoNoEncontradoException;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import com.alquilaya.serviciousuarios.services.TotpService;
import com.alquilaya.serviciousuarios.services.UsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Autoservicio de 2FA/TOTP para el usuario autenticado (ítem 229): activar (generar +
 * confirmar) y desactivar. Vive bajo {@code /api/v1/usuarios/auth/2fa/**}, que ya cae dentro
 * del matcher {@code /api/v1/usuarios/auth/**} (permitAll a nivel de filtro en
 * {@code SecurityConfig}) — por eso cada endpoint exige explícitamente
 * {@code @PreAuthorize("isAuthenticated()")}, exactamente como ya hacen
 * {@code AuthController#misSesiones}/{@code cerrarSesion}/{@code cerrarOtrasSesiones} bajo el
 * mismo prefijo. El paso público que SÍ completa el login ({@code /2fa/login-verificar})
 * vive en {@link AuthController}, junto a {@code emitirSesion}.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/usuarios/auth/2fa")
@RequiredArgsConstructor
public class TotpController {

    private final UsuarioService usuarioService;
    private final UsuarioRepository usuarioRepository;
    private final TotpService totpService;

    private Usuario usuarioActual() {
        String correo = SecurityContextHolder.getContext().getAuthentication().getName();
        return usuarioService.buscarPorCorreo(correo)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario autenticado"));
    }

    /** Estado actual de 2FA del usuario autenticado, para pintar el toggle en el perfil. */
    @org.springframework.web.bind.annotation.GetMapping("/estado")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Boolean>> estado() {
        return ResponseEntity.ok(Map.of("habilitado", usuarioActual().isTotpHabilitado()));
    }

    /** Genera un secret nuevo + URI otpauth:// para el QR. NO activa 2FA todavía. */
    @PostMapping("/generar")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Generar2faResponse> generar() {
        Usuario u = usuarioActual();
        if (u.isTotpHabilitado()) {
            throw new IllegalArgumentException("La autenticación de dos factores ya está activada en tu cuenta.");
        }
        String secret = totpService.generarSecretTemporal(u.getId());
        String uri = totpService.construirUri(secret, u.getCorreo());
        return ResponseEntity.ok(Generar2faResponse.builder().secret(secret).otpauthUri(uri).build());
    }

    /** Confirma el setup con un código de 6 dígitos: recién aquí se persiste el secret y se activa 2FA. */
    @PostMapping("/confirmar")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> confirmar(@Valid @RequestBody Confirmar2faRequest req) {
        Usuario u = usuarioActual();
        String secretPendiente = totpService.obtenerSecretTemporal(u.getId());
        if (secretPendiente == null) {
            throw new IllegalArgumentException(
                    "No hay una configuración de 2FA pendiente o expiró. Genera un nuevo código QR.");
        }
        if (!totpService.verificar(secretPendiente, req.getCodigo())) {
            throw new IllegalArgumentException("El código ingresado no es válido.");
        }
        u.setTotpSecret(secretPendiente);
        u.setTotpHabilitado(true);
        usuarioRepository.save(u);
        totpService.borrarSecretTemporal(u.getId());
        log.info("2FA activado para usuario ID {}", u.getId());
        return ResponseEntity.ok(Map.of("mensaje", "Autenticación de dos factores activada correctamente."));
    }

    /** Requiere password actual O un código TOTP vigente (al menos uno) — no es trivial desactivar. */
    @PostMapping("/deshabilitar")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> deshabilitar(@Valid @RequestBody Deshabilitar2faRequest req) {
        Usuario u = usuarioActual();
        if (!u.isTotpHabilitado()) {
            throw new IllegalArgumentException("La autenticación de dos factores no está activada.");
        }
        boolean okPassword = req.getPassword() != null && !req.getPassword().isBlank()
                && usuarioService.verificarPassword(req.getPassword(), u.getPassword());
        boolean okCodigo = !okPassword && req.getCodigo() != null && !req.getCodigo().isBlank()
                && totpService.verificar(u.getTotpSecret(), req.getCodigo());
        if (!okPassword && !okCodigo) {
            throw new CredencialesInvalidasException(
                    "Ingresa tu contraseña actual o un código de tu app de autenticación válido para desactivar 2FA.");
        }
        u.setTotpHabilitado(false);
        u.setTotpSecret(null);
        usuarioRepository.save(u);
        log.info("2FA desactivado para usuario ID {}", u.getId());
        return ResponseEntity.ok(Map.of("mensaje", "Autenticación de dos factores desactivada."));
    }
}
