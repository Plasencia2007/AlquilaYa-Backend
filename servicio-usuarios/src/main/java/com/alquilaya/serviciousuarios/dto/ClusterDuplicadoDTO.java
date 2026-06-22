package com.alquilaya.serviciousuarios.dto;

import com.alquilaya.serviciousuarios.entities.Usuario;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Un grupo de cuentas detectadas como posibles duplicados por compartir un dato (#8).
 * criterio = DNI | TELEFONO | EMAIL (email canónico, normaliza trucos de Gmail).
 */
public record ClusterDuplicadoDTO(
        String criterio,
        String valor,
        List<CuentaDuplicadaDTO> cuentas
) {
    public record CuentaDuplicadaDTO(
            Long id,
            String nombre,
            String apellido,
            String correo,
            String dni,
            String telefono,
            String rol,
            String estado,
            LocalDateTime fechaCreacion
    ) {
        public static CuentaDuplicadaDTO de(Usuario u) {
            return new CuentaDuplicadaDTO(
                    u.getId(), u.getNombre(), u.getApellido(), u.getCorreo(),
                    u.getDni(), u.getTelefono(),
                    u.getRol() != null ? u.getRol().name() : null,
                    u.getEstado() != null ? u.getEstado().name() : null,
                    u.getFechaCreacion());
        }
    }
}
