package com.alquilaya.serviciousuarios.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload de {@code POST /api/v1/usuarios/admin/duplicados/revisar} (ítem 385): identifica
 * el cluster de duplicados a marcar como revisado por el mismo par (criterio, valor) que
 * arma {@link ClusterDuplicadoDTO}.
 */
public record RevisarDuplicadoRequest(
        @NotBlank String criterio,
        @NotBlank String valor
) {
}
