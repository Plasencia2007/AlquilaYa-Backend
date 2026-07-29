package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.dto.EnvioAlertaFallidaDTO;
import com.alquilaya.serviciousuarios.services.AdminAlertaService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Panel admin de la cola de alertas por correo de nuevas propiedades (#99/#492).
 *
 * <p>Da visibilidad y control sobre el <b>DLQ lógico</b>: las filas que agotaron los reintentos
 * y quedaron en {@code FALLIDO} (ver {@code EnvioAlertaScheduler}). Sólo devuelve DTOs, nunca la
 * entidad cruda.</p>
 *
 * <p>Ruta bajo {@code /api/v1/usuarios/admin/**}: {@code SecurityConfig} ya exige rol ADMIN para
 * ese prefijo (cae en el matcher {@code /api/v1/usuarios/**-> hasRole('ADMIN')}); el
 * {@code @PreAuthorize} de método lo refuerza. No requiere tocar {@code SecurityConfig}.</p>
 */
@RestController
@RequestMapping("/api/v1/usuarios/admin/alertas")
@RequiredArgsConstructor
public class AdminAlertaController {

    private final AdminAlertaService adminAlertaService;

    /** Página de alertas en estado FALLIDO (DLQ) para diagnóstico. */
    @GetMapping("/fallidas")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<EnvioAlertaFallidaDTO>> listarFallidas(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(adminAlertaService.listarFallidas(pageable));
    }

    /**
     * Repone una alerta FALLIDA a la cola ({@code PENDIENTE}, {@code intentos=0},
     * {@code proximoIntento=now}) para que el scheduler la reintente.
     *
     * <p>Semántica REST según el estado del recurso:</p>
     * <ul>
     *   <li><b>200 OK</b> — la fila estaba en FALLIDO y se repuso: {@code {reencolada:true, mensaje}}.</li>
     *   <li><b>409 Conflict</b> — la fila existe pero NO está en FALLIDO (ya ENVIADO o PENDIENTE):
     *       la operación no aplica al estado actual (lo lanza el servicio y lo mapea el
     *       {@code GlobalExceptionHandler}).</li>
     *   <li><b>404 Not Found</b> — no existe una alerta con ese id.</li>
     * </ul>
     */
    @PostMapping("/fallidas/{id}/reintentar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> reintentar(@PathVariable Long id) {
        adminAlertaService.reintentar(id);
        return ResponseEntity.ok(Map.of(
                "reencolada", true,
                "mensaje", "Alerta repuesta a la cola; se reintentará en el próximo ciclo."
        ));
    }
}
