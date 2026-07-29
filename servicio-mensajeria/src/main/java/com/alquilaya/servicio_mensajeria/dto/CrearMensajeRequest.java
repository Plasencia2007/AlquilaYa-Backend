package com.alquilaya.servicio_mensajeria.dto;

import com.alquilaya.servicio_mensajeria.enums.TipoMensaje;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Ítem 254: `contenido` ya NO es @NotBlank a nivel de bean-validation — un mensaje
 * IMAGEN puede omitirlo (MensajeService resuelve un fallback legible). La obligatoriedad
 * condicional ("contenido requerido si tipo=TEXTO", "urlAdjunto requerido si tipo=IMAGEN")
 * se valida en MensajeService.enviar(), no aquí, porque bean-validation no expresa bien
 * reglas cruzadas entre campos sin un validador custom.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CrearMensajeRequest {

    @Size(max = 2000, message = "El mensaje debe tener máximo 2000 caracteres")
    private String contenido;

    /** Si se omite, MensajeService lo trata como TEXTO. */
    private TipoMensaje tipo;

    /** Obligatorio (validado en el service) cuando tipo == IMAGEN. URL ya subida a Cloudinary. */
    @Size(max = 500, message = "urlAdjunto inválida")
    private String urlAdjunto;
}
