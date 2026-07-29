package com.alquilaya.servicio_mensajeria.clients;

import com.alquilaya.servicio_mensajeria.config.FeignConfig;
import com.alquilaya.servicio_mensajeria.dto.PreferenciasNotificacionDTO;
import com.alquilaya.servicio_mensajeria.dto.UsuarioPerfilDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(
        name = "servicio-usuarios",
        contextId = "usuariosClient",
        configuration = FeignConfig.class,
        fallback = UsuariosClientFallback.class)
public interface UsuariosClient {

    @GetMapping("/api/v1/usuarios/arrendador/{perfilId}/info")
    UsuarioPerfilDTO obtenerArrendador(@PathVariable("perfilId") Long perfilId);

    @GetMapping("/api/v1/usuarios/estudiante/{perfilId}/info")
    UsuarioPerfilDTO obtenerEstudiante(@PathVariable("perfilId") Long perfilId);

    /**
     * Ítem 210 (enforcement real de preferencias de notificación). Endpoint S2S público en
     * servicio-usuarios (sin PII, solo 3 booleans) — necesario porque este cliente también se
     * invoca desde consumers de Kafka, donde no hay request HTTP entrante del que
     * {@link FeignConfig} pueda propagar un JWT.
     */
    @GetMapping("/api/v1/usuarios/{id}/preferencias-notificacion")
    PreferenciasNotificacionDTO obtenerPreferenciasNotificacion(@PathVariable("id") Long id);

    /**
     * Ítem 378: ids de administradores ACTIVOS, sin PII. Endpoint S2S público en
     * servicio-usuarios (mismo motivo que {@link #obtenerPreferenciasNotificacion}) — se
     * invoca desde {@code UserApprovalEventConsumer} al procesar el evento
     * {@code DOCUMENTO_SUBIDO}, sin request HTTP entrante del que propagar un JWT.
     */
    @GetMapping("/api/v1/usuarios/admin/ids-activos")
    List<Long> obtenerAdminsActivos();
}
