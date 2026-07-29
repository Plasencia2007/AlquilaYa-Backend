package com.alquilaya.serviciousuarios.dto;

import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.EstadoUsuario;
import com.alquilaya.serviciousuarios.enums.Rol;

import java.time.LocalDateTime;

/**
 * Vista de RESUMEN (plana) de un usuario para listados admin.
 *
 * <p>Reemplaza la exposición de la entidad {@link Usuario} cruda en
 * {@code GET /usuarios/rol/{rol}}. A diferencia de {@link UsuarioDetalleResponse}
 * NO anida {@code arrendador}/{@code estudiante}: la tabla admin de usuarios sólo
 * consume los campos de nivel superior, y una lista con objetos anidados por fila
 * sería innecesariamente pesada. Nunca incluye {@code password} ni {@code documentos}.</p>
 */
public record UsuarioResumenResponse(
        Long id,
        String nombre,
        String apellido,
        String dni,
        String correo,
        String telefono,
        Rol rol,
        EstadoUsuario estado,
        boolean telefonoVerificado,
        boolean emailVerificado,
        String fotoUrl,
        LocalDateTime fechaCreacion,
        /** Motivo del baneo (solo poblado si {@code estado == BANNED}); null en otro caso o si el
         *  baneo es anterior a esta columna. Consumido por el panel admin de baneos activos. */
        String motivoBaneo
) {

    /** Mapea la entidad a su vista de resumen plana. */
    public static UsuarioResumenResponse from(Usuario u) {
        return new UsuarioResumenResponse(
                u.getId(),
                u.getNombre(),
                u.getApellido(),
                u.getDni(),
                u.getCorreo(),
                u.getTelefono(),
                u.getRol(),
                u.getEstado(),
                u.isTelefonoVerificado(),
                u.isEmailVerificado(),
                u.getFotoUrl(),
                u.getFechaCreacion(),
                u.getMotivoBaneo());
    }
}
