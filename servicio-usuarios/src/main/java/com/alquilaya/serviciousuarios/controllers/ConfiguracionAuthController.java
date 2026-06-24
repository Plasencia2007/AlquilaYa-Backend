package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.dto.ConfiguracionVerificacionDTO;
import com.alquilaya.serviciousuarios.services.ConfiguracionAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Configuración del método de verificación (#3). El GET es público para que el flujo de
 * registro/login del frontend se adapte; el PUT es solo del admin.
 */
@RestController
@RequestMapping("/api/v1/usuarios")
@RequiredArgsConstructor
public class ConfiguracionAuthController {

    private final ConfiguracionAuthService configuracionAuthService;

    /** Método vigente — público (el registro lo lee para saber qué pedir). */
    @GetMapping("/auth/configuracion/verificacion")
    public ResponseEntity<ConfiguracionVerificacionDTO> obtener() {
        return ResponseEntity.ok(new ConfiguracionVerificacionDTO(configuracionAuthService.getMetodo()));
    }

    /** Cambia el método — requiere permiso de gestión de sistema (#32). */
    @PutMapping("/admin/configuracion/verificacion")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_SISTEMA')")
    public ResponseEntity<ConfiguracionVerificacionDTO> actualizar(
            @Valid @RequestBody ConfiguracionVerificacionDTO req) {
        return ResponseEntity.ok(new ConfiguracionVerificacionDTO(
                configuracionAuthService.actualizar(req.metodo())));
    }
}
