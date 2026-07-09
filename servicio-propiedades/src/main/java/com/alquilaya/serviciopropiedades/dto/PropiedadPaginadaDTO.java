package com.alquilaya.serviciopropiedades.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * P5: shape simple y explícito para la búsqueda paginada — evita serializar el objeto
 * {@code Page} crudo de Spring (trae campos internos como `pageable`/`sort` que no aportan
 * al frontend). `pagina` es 0-based, igual que Spring Data.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PropiedadPaginadaDTO {
    private List<PropiedadPublicoDTO> propiedades;
    private int pagina;
    private int tamano;
    private long totalElementos;
    private int totalPaginas;
    private boolean esUltimaPagina;
}
