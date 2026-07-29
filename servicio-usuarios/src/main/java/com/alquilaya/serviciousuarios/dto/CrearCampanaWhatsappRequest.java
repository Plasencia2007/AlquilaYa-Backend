package com.alquilaya.serviciousuarios.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/** Payload para crear/lanzar una campaña de WhatsApp (ítem 381). */
public record CrearCampanaWhatsappRequest(
        /** Filtro de segmento opcional: carrera exacta (null/blank = todas). */
        String carrera,
        /** Filtro de segmento opcional: estado de cuenta (PENDING/ACTIVE/...; null = cualquiera). */
        String estado,
        @NotBlank(message = "El mensaje es obligatorio")
        @Size(min = 1, max = 1000, message = "El mensaje debe tener entre 1 y 1000 caracteres")
        String mensaje,
        /** Null = enviar de inmediato. Futuro = se encola y el scheduler la envía en su momento. */
        LocalDateTime programadoPara
) {
}
