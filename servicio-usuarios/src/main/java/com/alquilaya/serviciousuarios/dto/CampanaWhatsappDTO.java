package com.alquilaya.serviciousuarios.dto;

import com.alquilaya.serviciousuarios.entities.CampanaWhatsapp;

import java.time.LocalDateTime;

/** Vista de una campaña de WhatsApp para el panel admin (ítem 381). */
public record CampanaWhatsappDTO(
        Long id,
        String carrera,
        String estado,
        String mensaje,
        LocalDateTime programadoPara,
        String estadoEnvio,
        Integer destinatarios,
        String ultimoError,
        LocalDateTime createdAt,
        LocalDateTime enviadoAt
) {
    public static CampanaWhatsappDTO de(CampanaWhatsapp c) {
        return new CampanaWhatsappDTO(
                c.getId(),
                c.getCarrera(),
                c.getEstado() != null ? c.getEstado().name() : null,
                c.getMensaje(),
                c.getProgramadoPara(),
                c.getEstadoEnvio() != null ? c.getEstadoEnvio().name() : null,
                c.getDestinatarios(),
                c.getUltimoError(),
                c.getCreatedAt(),
                c.getEnviadoAt()
        );
    }
}
