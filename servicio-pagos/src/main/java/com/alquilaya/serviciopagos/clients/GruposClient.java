package com.alquilaya.serviciopagos.clients;

import com.alquilaya.serviciopagos.config.FeignClientConfig;
import com.alquilaya.serviciopagos.dto.CuotaPagoDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/** Cliente para la cuota grupal de servicio-propiedades (#38 Fase 2). */
@FeignClient(
        name = "servicio-propiedades",
        contextId = "gruposClient",
        path = "/api/v1/grupos",
        configuration = FeignClientConfig.class,
        fallback = GruposClient.Fallback.class)
public interface GruposClient {

    @GetMapping("/reserva/{reservaId}/mi-cuota")
    CuotaPagoDTO miCuota(@PathVariable("reservaId") Long reservaId);

    @Slf4j
    @Component
    class Fallback implements GruposClient {
        @Override
        public CuotaPagoDTO miCuota(Long reservaId) {
            log.error("Circuito abierto o fallo al consultar la cuota grupal de la reserva {}", reservaId);
            throw new IllegalStateException("El servicio de grupos no está disponible. Intenta en unos minutos.");
        }
    }
}
