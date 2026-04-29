package com.alquilaya.serviciopropiedades.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActividadDTO {
    private String tipo;
    private String descripcion;
    private LocalDateTime fecha;
    private String referenciaId;
}
