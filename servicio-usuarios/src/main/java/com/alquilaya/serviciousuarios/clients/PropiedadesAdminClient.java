package com.alquilaya.serviciousuarios.clients;

import com.alquilaya.serviciousuarios.config.FeignConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

/**
 * Ítem 354: consume {@code servicio-propiedades} para el endpoint agregado de métricas admin
 * ({@code GET /api/v1/usuarios/admin/metricas}). Solo se usa para contar propiedades pendientes
 * de moderación (ver {@link PropiedadPendienteDTO}).
 */
@FeignClient(
        name = "servicio-propiedades",
        contextId = "propiedadesAdminClient",
        path = "/api/v1/admin/propiedades",
        configuration = FeignConfig.class,
        fallback = PropiedadesAdminClient.Fallback.class)
public interface PropiedadesAdminClient {

    /** Espeja {@code AdminPropiedadController#listarPendientes} (requiere permiso MODERAR_PROPIEDADES). */
    @GetMapping("/pendientes")
    List<PropiedadPendienteDTO> listarPendientes();

    @Slf4j
    @Component
    class Fallback implements PropiedadesAdminClient {
        @Override
        public List<PropiedadPendienteDTO> listarPendientes() {
            log.error("Circuito abierto o fallo en servicio-propiedades al listar propiedades pendientes "
                    + "(métricas agregadas admin)");
            throw new IllegalStateException(
                    "El servicio de propiedades no está disponible. Intenta en unos minutos.");
        }
    }
}
