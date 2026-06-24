package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.dto.ConfiguracionReservaDTO;
import com.alquilaya.serviciopropiedades.services.ConfiguracionReservaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Configuración de reglas de reserva editable por el admin. Vive bajo
 * {@code /api/v1/admin/propiedades/**}, ruta ya restringida a ROLE_ADMIN en
 * SecurityConfig y enrutada por el gateway.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/propiedades/configuracion")
@RequiredArgsConstructor
public class AdminConfiguracionController {

    private final ConfiguracionReservaService configuracionReservaService;

    @GetMapping("/reserva")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_SISTEMA')")
    public ResponseEntity<ConfiguracionReservaDTO> obtener() {
        int horas = configuracionReservaService.getExpiracionHoras();
        return ResponseEntity.ok(new ConfiguracionReservaDTO(horas));
    }

    @PutMapping("/reserva")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_SISTEMA')")
    public ResponseEntity<ConfiguracionReservaDTO> actualizar(@Valid @RequestBody ConfiguracionReservaDTO req) {
        int horas = configuracionReservaService.actualizarExpiracionHoras(req.getExpiracionHoras());
        return ResponseEntity.ok(new ConfiguracionReservaDTO(horas));
    }
}
