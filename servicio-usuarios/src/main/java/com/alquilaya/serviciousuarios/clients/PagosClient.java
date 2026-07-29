package com.alquilaya.serviciousuarios.clients;

import com.alquilaya.serviciousuarios.config.FeignConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Ítem 354: consume {@code servicio-pagos} para el endpoint agregado de métricas admin
 * ({@code GET /api/v1/usuarios/admin/metricas}), evitando que el frontend tenga que llamar a
 * cada microservicio por separado.
 */
@FeignClient(
        name = "servicio-pagos",
        contextId = "pagosClient",
        path = "/api/v1/pagos",
        configuration = FeignConfig.class,
        fallback = PagosClient.Fallback.class)
public interface PagosClient {

    /** Espeja {@code PagoController#resumenFinanciero} (solo ADMIN en servicio-pagos). */
    @GetMapping("/admin/resumen")
    ResumenFinancieroDTO obtenerResumenFinanciero();

    @Slf4j
    @Component
    class Fallback implements PagosClient {
        @Override
        public ResumenFinancieroDTO obtenerResumenFinanciero() {
            log.error("Circuito abierto o fallo en servicio-pagos al consultar el resumen financiero "
                    + "(métricas agregadas admin)");
            throw new IllegalStateException(
                    "El servicio de pagos no está disponible. Intenta en unos minutos.");
        }
    }
}
