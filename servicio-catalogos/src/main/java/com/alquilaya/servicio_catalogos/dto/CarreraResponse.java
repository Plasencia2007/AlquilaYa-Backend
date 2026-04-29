package com.alquilaya.servicio_catalogos.dto;

import com.alquilaya.servicio_catalogos.entities.Carrera;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CarreraResponse {

    private Long id;
    private String nombre;
    private String codigo;
    private Boolean activo;
    private LocalDateTime fechaCreacion;

    public static CarreraResponse from(Carrera carrera) {
        return CarreraResponse.builder()
                .id(carrera.getId())
                .nombre(carrera.getNombre())
                .codigo(carrera.getCodigo())
                .activo(carrera.getActivo())
                .fechaCreacion(carrera.getFechaCreacion())
                .build();
    }
}
