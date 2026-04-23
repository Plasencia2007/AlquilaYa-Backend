package com.alquilaya.serviciopagos.clients;

import com.alquilaya.serviciopagos.dto.ReservaDetalleDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "servicio-propiedades", path = "/api/v1/reservas")
public interface ReservasClient {
    @GetMapping("/{id}")
    ReservaDetalleDTO obtenerReserva(@PathVariable("id") Long id);
}
