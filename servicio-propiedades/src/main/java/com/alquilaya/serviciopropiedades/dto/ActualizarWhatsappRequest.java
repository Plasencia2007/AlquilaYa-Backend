package com.alquilaya.serviciopropiedades.dto;

import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * Setear/editar el link del grupo de WhatsApp de un grupo de roommates (#221, alternativa de
 * bajo costo al chat grupal: el creador crea el grupo externamente en WhatsApp y comparte el
 * link aquí). Vacío/null limpia el link. Si trae valor, debe ser un link de grupo de WhatsApp
 * válido (https://chat.whatsapp.com/...).
 */
@Data
public class ActualizarWhatsappRequest {
    @Pattern(
            regexp = "^$|^https://chat\\.whatsapp\\.com/.+$",
            message = "El link debe ser una URL de grupo de WhatsApp (https://chat.whatsapp.com/...)")
    private String linkWhatsapp;
}
