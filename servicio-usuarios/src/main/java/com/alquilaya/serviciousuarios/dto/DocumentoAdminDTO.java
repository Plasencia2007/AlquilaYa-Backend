package com.alquilaya.serviciousuarios.dto;

import com.alquilaya.serviciousuarios.entities.DocumentoVerificacion;

import java.time.LocalDateTime;

/**
 * Vista de un documento de verificación para el panel de administración.
 * Los nombres de campo coinciden con el contrato del frontend
 * ({@code DocumentoAdmin} en admin-moderation-service.ts): expone la URL del
 * documento, la fecha de subida y los datos del usuario (que en la entidad
 * está {@code @JsonIgnore} por la relación LAZY).
 */
public record DocumentoAdminDTO(
        Long id,
        Long usuarioId,
        String nombreUsuario,
        String apellidoUsuario,
        String correoUsuario,
        String tipoDocumento,
        String urlDocumento,
        LocalDateTime fechaSubida,
        String estado,
        String comentario
) {
    public static DocumentoAdminDTO desde(DocumentoVerificacion doc) {
        var u = doc.getUsuario();
        return new DocumentoAdminDTO(
                doc.getId(),
                u != null ? u.getId() : null,
                u != null ? u.getNombre() : null,
                u != null ? u.getApellido() : null,
                u != null ? u.getCorreo() : null,
                doc.getTipoDocumento() != null ? doc.getTipoDocumento().name() : null,
                doc.getArchivoUrl(),
                doc.getFechaCreacion(),
                doc.getEstadoVerificacion() != null ? doc.getEstadoVerificacion().name() : null,
                doc.getComentarioRechazo()
        );
    }
}
