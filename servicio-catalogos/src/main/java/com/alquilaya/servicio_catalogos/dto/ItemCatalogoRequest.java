package com.alquilaya.servicio_catalogos.dto;

import com.alquilaya.servicio_catalogos.enums.TipoItem;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request de creación/edición de un ítem de catálogo. Sin campo {@code id}: el id de un
 * item existente siempre viene del path variable en la actualización, nunca del body
 * (evita mass assignment sobre {@link com.alquilaya.servicio_catalogos.entities.ItemCatalogo}).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItemCatalogoRequest {

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 120, message = "El nombre no puede superar 120 caracteres")
    private String nombre;

    @NotBlank(message = "El valor es obligatorio")
    @Size(max = 60, message = "El valor no puede superar 60 caracteres")
    private String valor;

    @NotNull(message = "El tipo es obligatorio")
    private TipoItem tipo;

    private Boolean activo;

    private String icono;

    private String descripcion;

    /** URL de imagen (Cloudinary). Usado por ítems tipo BANNER para el hero/CTA del home. */
    @Size(max = 500, message = "La URL de imagen no puede superar 500 caracteres")
    private String imagenUrl;
}
