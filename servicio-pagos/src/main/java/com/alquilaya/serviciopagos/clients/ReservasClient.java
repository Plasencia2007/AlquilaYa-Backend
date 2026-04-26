package com.alquilaya.serviciopagos.clients;

import com.alquilaya.serviciopagos.config.FeignClientConfig;
import com.alquilaya.serviciopagos.dto.ReservaDetalleDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(
        name = "servicio-propiedades",
        path = "/api/v1/reservas",
        configuration = FeignClientConfig.class,
        fallback = ReservasClient.Fallback.class)
public interface ReservasClient {

    @GetMapping("/{id}")
    ReservaDetalleDTO obtenerReserva(@PathVariable("id") Long id);

    @Slf4j
    @Component
    class Fallback implements ReservasClient {
        @Override
        public ReservaDetalleDTO obtenerReserva(Long id) {
            log.error("Circuito abierto o fallo en servicio-propiedades al consultar reserva {}", id);
            throw new IllegalStateException(
                    "El servicio de reservas no está disponible. Intenta en unos minutos.");
        }
    }
}
