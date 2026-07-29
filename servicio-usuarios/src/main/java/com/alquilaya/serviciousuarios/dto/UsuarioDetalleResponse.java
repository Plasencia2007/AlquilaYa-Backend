package com.alquilaya.serviciousuarios.dto;

import com.alquilaya.serviciousuarios.entities.Arrendador;
import com.alquilaya.serviciousuarios.entities.Estudiante;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.EstadoUsuario;
import com.alquilaya.serviciousuarios.enums.Rol;

import java.time.LocalDateTime;

/**
 * Vista de DETALLE de un usuario para el frontend (perfil propio + edición admin).
 *
 * <p>Reemplaza la exposición de la entidad {@link Usuario} cruda en
 * {@code GET /usuarios/{id}}, {@code PUT /usuarios/{id}} y
 * {@code POST /usuarios/documentos/verificar-dni-instantaneo}. Nunca incluye el
 * {@code password} ni la colección {@code documentos}, y proyecta las relaciones
 * {@code arrendador}/{@code estudiante} como sub-DTOs de sólo los campos que el
 * frontend consume (forma anidada preservada: {@code profile-service.ts}).</p>
 *
 * <p>El mapeo vive en un único sitio ({@link #from(Usuario)}) para reutilizarlo desde
 * los tres endpoints. Las relaciones {@code @OneToOne} son EAGER, por lo que el mapeo
 * es seguro aunque se ejecute fuera de la transacción (no hay lazy-loading).</p>
 */
public record UsuarioDetalleResponse(
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
        String motivoBaneo,
        /** Datos del perfil arrendador; {@code null} si el usuario no es arrendador. */
        ArrendadorResumenDTO arrendador,
        /** Datos del perfil estudiante; {@code null} si el usuario no es estudiante. */
        EstudianteResumenDTO estudiante
) {

    /** Sub-DTO anidado del perfil arrendador (sólo los campos que consume el frontend). */
    public record ArrendadorResumenDTO(
            Long id,
            String nombreComercial,
            String ruc,
            String telefono,
            String direccionPropiedades,
            Double latitud,
            Double longitud,
            boolean esEmpresa,
            Double calificacion,
            /** KYC (U3): true cuando un admin aprobó sus documentos requeridos. Ítems 305/306 frontend. */
            boolean verificado
    ) {
        static ArrendadorResumenDTO from(Arrendador a) {
            if (a == null) return null;
            return new ArrendadorResumenDTO(
                    a.getId(),
                    a.getNombreComercial(),
                    a.getRuc(),
                    a.getTelefono(),
                    a.getDireccionPropiedades(),
                    a.getLatitud(),
                    a.getLongitud(),
                    a.isEsEmpresa(),
                    a.getCalificacion(),
                    a.isVerificado());
        }
    }

    /** Sub-DTO anidado del perfil estudiante (sólo los campos que consume el frontend). */
    public record EstudianteResumenDTO(
            Long id,
            String universidad,
            String codigoEstudiante,
            String carrera,
            Integer ciclo,
            boolean verificado
    ) {
        static EstudianteResumenDTO from(Estudiante e) {
            if (e == null) return null;
            return new EstudianteResumenDTO(
                    e.getId(),
                    e.getUniversidad(),
                    e.getCodigoEstudiante(),
                    e.getCarrera(),
                    e.getCiclo(),
                    e.isVerificado());
        }
    }

    /** Mapea la entidad a su vista de detalle. Sitio único de mapeo (reutilizado por 3 endpoints). */
    public static UsuarioDetalleResponse from(Usuario u) {
        return new UsuarioDetalleResponse(
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
                u.getMotivoBaneo(),
                ArrendadorResumenDTO.from(u.getArrendador()),
                EstudianteResumenDTO.from(u.getEstudiante()));
    }
}
