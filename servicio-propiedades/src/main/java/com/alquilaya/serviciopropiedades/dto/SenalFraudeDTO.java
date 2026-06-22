package com.alquilaya.serviciopropiedades.dto;

/**
 * Una señal automática de posible fraude/catfishing en una publicación (#48/#50).
 * Es heurística (no prueba nada): sirve para que el admin priorice la revisión.
 */
public record SenalFraudeDTO(
        String codigo,     // PRECIO_SOSPECHOSO | CONTACTO_EXTERNO | IMAGEN_DUPLICADA
        String mensaje,    // explicación legible para el admin
        String severidad   // ALTA | MEDIA
) {}
