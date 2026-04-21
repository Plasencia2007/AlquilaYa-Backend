package com.alquilaya.serviciousuarios.dto;

import com.alquilaya.serviciousuarios.enums.EstadoVerificacion;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class VerificarDocumentoRequest {
    @NotNull(message = "El estado de verificación es obligatorio")
    private EstadoVerificacion estado;

    @NotBlank(message = "El comentario es obligatorio para la verificación")
    private String comentario;
}
