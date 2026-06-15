package com.alquilaya.serviciousuarios.dto;

import com.alquilaya.serviciousuarios.enums.EstadoVerificacion;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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

    // Opcional: en APROBADO no hay comentario; en RECHAZADO el front exige el motivo.
    @Size(max = 300, message = "El comentario no puede exceder 300 caracteres")
    private String comentario;
}
