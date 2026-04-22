package com.alquilaya.serviciopropiedades.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class FavoritoResponseDTO {
    private Long id;
    private Long estudianteId;
    private LocalDateTime fechaCreacion;
    private PropiedadPublicoDTO propiedad;
}
