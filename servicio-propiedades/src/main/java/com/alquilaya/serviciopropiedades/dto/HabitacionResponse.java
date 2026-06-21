package com.alquilaya.serviciopropiedades.dto;

import com.alquilaya.serviciopropiedades.entities.Habitacion;
import com.alquilaya.serviciopropiedades.enums.EstadoHabitacion;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/** Habitación reservable de una propiedad gestionada por habitaciones. */
@Data
@Builder
public class HabitacionResponse {
    private Long id;
    private Long propiedadId;
    private String nombre;
    private BigDecimal precio;
    private EstadoHabitacion estado;
    private Double area;
    private String descripcion;
    private Integer orden;

    public static HabitacionResponse from(Habitacion h) {
        return HabitacionResponse.builder()
                .id(h.getId())
                .propiedadId(h.getPropiedadId())
                .nombre(h.getNombre())
                .precio(h.getPrecio())
                .estado(h.getEstado())
                .area(h.getArea())
                .descripcion(h.getDescripcion())
                .orden(h.getOrden())
                .build();
    }
}
