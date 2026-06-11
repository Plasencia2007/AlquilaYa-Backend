package com.alquilaya.serviciopropiedades.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Página de favoritos con forma estable para el frontend
 * (evita serializar PageImpl de Spring directamente).
 */
@Data
@Builder
public class FavoritosPageDTO {
    private List<FavoritoResponseDTO> content;
    private int page;
    private int size;
    private long totalElements;
    private boolean hasNext;
}
