package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.dto.CrearSuscripcionAlertaRequest;
import com.alquilaya.serviciousuarios.services.SuscripcionAlertaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Endpoints públicos de suscripción a alertas de nuevas propiedades (#99/#492).
 *
 * <p>Va montado bajo {@code /api/v1/usuarios/**} para reutilizar la ruta existente del
 * API Gateway hacia servicio-usuarios (evitando tocar la config del gateway). Todas las
 * respuestas son <b>genéricas</b>: no revelan si un correo ya estaba suscrito ni si un token
 * existía (anti-enumeración).</p>
 */
@RestController
@RequestMapping("/api/v1/usuarios/alertas")
@RequiredArgsConstructor
public class SuscripcionAlertaController {

    private final SuscripcionAlertaService service;

    /**
     * Alta de suscripción (público, anónimo). Idempotente: no falla ni duplica si el correo ya
     * estaba suscrito. Con double opt-in, envía un correo de confirmación.
     */
    @PostMapping
    public ResponseEntity<Map<String, String>> suscribir(@Valid @RequestBody CrearSuscripcionAlertaRequest request) {
        service.crear(request);
        return ResponseEntity.ok(Map.of(
                "mensaje", "Si el correo es válido, te enviamos un enlace para confirmar tu alerta."
        ));
    }

    /**
     * Confirma el alta (double opt-in) mediante el token del correo. Idempotente; no revela si
     * el token existía.
     */
    @PostMapping("/confirmar/{token}")
    public ResponseEntity<Map<String, String>> confirmar(@PathVariable String token) {
        service.confirmar(token);
        return ResponseEntity.ok(Map.of(
                "mensaje", "Alerta confirmada. Te avisaremos cuando haya nuevos cuartos que encajen."
        ));
    }

    /**
     * Da de baja una suscripción mediante su token. Idempotente; no revela si el token existía.
     */
    @DeleteMapping("/baja/{token}")
    public ResponseEntity<Map<String, String>> darDeBaja(@PathVariable String token) {
        service.darDeBaja(token);
        return ResponseEntity.ok(Map.of(
                "mensaje", "Suscripción cancelada. Ya no recibirás alertas."
        ));
    }
}
