package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.dto.ActualizarConvivenciaRequest;
import com.alquilaya.serviciousuarios.dto.PerfilConvivenciaDTO;
import com.alquilaya.serviciousuarios.services.ConvivenciaService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

/**
 * Perfil de convivencia / tarjeta de roommate (#38 Fase 0).
 */
@RestController
@RequestMapping("/api/v1/usuarios")
@RequiredArgsConstructor
public class RoommateController {

    private final ConvivenciaService convivenciaService;

    /**
     * Board de matchmaking: lista de estudiantes que buscan compañeros (#38 Fase 1),
     * paginado y ordenado por compatibilidad descendente (ítem 216).
     */
    @GetMapping("/roommates")
    public ResponseEntity<Page<PerfilConvivenciaDTO>> board(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        String correo = SecurityContextHolder.getContext().getAuthentication().getName();
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(convivenciaService.listarBuscando(correo, pageable));
    }

    /** Tarjeta de convivencia de un estudiante (la ven otros estudiantes para evaluar compatibilidad). */
    @GetMapping("/estudiante/{estudianteId}/convivencia")
    public ResponseEntity<PerfilConvivenciaDTO> ver(@PathVariable Long estudianteId) {
        return ResponseEntity.ok(convivenciaService.obtener(estudianteId));
    }

    /** Perfil de convivencia propio (para precargar el editor). */
    @GetMapping("/perfil/convivencia")
    public ResponseEntity<PerfilConvivenciaDTO> miPerfil() {
        String correo = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(convivenciaService.obtenerPropio(correo));
    }

    /** Edición del propio perfil de convivencia. */
    @PutMapping("/perfil/convivencia")
    public ResponseEntity<PerfilConvivenciaDTO> actualizar(@RequestBody ActualizarConvivenciaRequest req) {
        String correo = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(convivenciaService.actualizarPropio(correo, req));
    }
}
