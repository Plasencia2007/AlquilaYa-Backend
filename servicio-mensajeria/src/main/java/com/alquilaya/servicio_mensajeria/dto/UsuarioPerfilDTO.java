package com.alquilaya.servicio_mensajeria.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Respuesta flexible de servicio-usuarios: /api/v1/usuarios/{arrendador|estudiante}/{perfilId}/info
 * Solo necesitamos nombre para mostrar en el chat. Ignora campos extra.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class UsuarioPerfilDTO {
    private Long id;
    private Long usuarioId;
    private String nombre;
    private String apellido;
    private String correo;
    private String telefono;
}
