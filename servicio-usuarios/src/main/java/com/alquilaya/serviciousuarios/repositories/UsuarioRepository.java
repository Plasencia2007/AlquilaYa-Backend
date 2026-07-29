package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.Usuario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByCorreo(String correo);
    Optional<Usuario> findByTelefono(String telefono);
    java.util.List<Usuario> findByRol(com.alquilaya.serviciousuarios.enums.Rol rol);

    // ===== Listados que excluyen cuentas dadas de baja (GDPR, G8-B) =====
    // Paginado: usado por GET /api/v1/usuarios (listado general de admin) para no devolver
    // toda la tabla de usuarios en una sola respuesta sin límite.
    Page<Usuario> findByEliminadoFalse(Pageable pageable);
    List<Usuario> findByRolAndEliminadoFalse(com.alquilaya.serviciousuarios.enums.Rol rol);

    /** Listado por estado de cuenta (#367, p.ej. BANNED) para el panel admin de baneos activos. */
    List<Usuario> findByEstadoAndEliminadoFalse(com.alquilaya.serviciousuarios.enums.EstadoUsuario estado);

    boolean existsByCorreo(String correo);
    boolean existsByTelefono(String telefono);
    boolean existsByDni(String dni);

    // ===== Detección de cuentas duplicadas (#8) =====
    List<Usuario> findAllByDni(String dni);
    List<Usuario> findAllByTelefono(String telefono);

    /** DNIs compartidos por 2+ cuentas, excluyendo el placeholder de cuentas Google. */
    @Query("""
            SELECT u.dni FROM Usuario u
            WHERE u.dni <> :placeholder
            GROUP BY u.dni HAVING COUNT(u) > 1
            """)
    List<String> dnisDuplicados(@Param("placeholder") String placeholder);

    /** Teléfonos compartidos por 2+ cuentas (duplicados legacy previos a la validación). */
    @Query("""
            SELECT u.telefono FROM Usuario u
            WHERE u.telefono IS NOT NULL AND u.telefono <> ''
            GROUP BY u.telefono HAVING COUNT(u) > 1
            """)
    List<String> telefonosDuplicados();

    /** Claves de funcionalidad que otorgan los roles personalizados de un usuario (RBAC dinámico #32). */
    @Query("""
            SELECT f FROM Usuario u
            JOIN u.rolesPersonalizados r
            JOIN r.funcionalidades f
            WHERE u.id = :usuarioId
            """)
    java.util.Set<String> findFuncionalidadesByUsuarioId(@Param("usuarioId") Long usuarioId);

    /** Usuarios que tienen asignado un rol personalizado (para desasignar al borrar el rol). */
    @Query("SELECT u FROM Usuario u JOIN u.rolesPersonalizados r WHERE r.id = :rolId")
    List<Usuario> findByRolPersonalizadoId(@Param("rolId") Long rolId);

    /**
     * Ítem 386: conteo de registros agrupados por semana, para la gráfica de crecimiento de
     * usuarios del panel admin ({@code GET /api/v1/usuarios/admin/metricas/registros}). Nativa
     * (dialecto PostgreSQL) porque JPQL no tiene {@code date_trunc}; el volumen de {@code usuarios}
     * hace innecesario traer todas las filas y agrupar en Java. {@code semana} es el lunes de
     * cada semana ISO (comportamiento de {@code date_trunc('week', ...)} en Postgres).
     */
    @Query(value = """
            SELECT date_trunc('week', u.fecha_creacion) AS semana, COUNT(*) AS total
            FROM usuarios u
            WHERE u.fecha_creacion >= :desde AND u.fecha_creacion < :hasta
            GROUP BY date_trunc('week', u.fecha_creacion)
            ORDER BY semana ASC
            """, nativeQuery = true)
    List<Object[]> registrosPorSemana(@Param("desde") java.time.LocalDateTime desde,
                                      @Param("hasta") java.time.LocalDateTime hasta);

    /**
     * Estudiantes elegibles para una campaña de WhatsApp (ítem 381): rol ESTUDIANTE, cuenta no
     * dada de baja, CON teléfono y que hayan aceptado marketing ({@code notificarMarketing} —
     * la única categoría opt-in de notificaciones que existe hoy en {@link Usuario}). `carrera`
     * (vive en {@code Estudiante}, no en {@code Usuario}) y `estado` son filtros opcionales de
     * segmento: null = sin restricción en ese campo.
     */
    @Query("""
            SELECT u FROM Usuario u JOIN u.estudiante e
            WHERE u.rol = com.alquilaya.serviciousuarios.enums.Rol.ESTUDIANTE
              AND u.eliminado = false
              AND u.notificarMarketing = true
              AND u.telefono IS NOT NULL AND u.telefono <> ''
              AND (:carrera IS NULL OR e.carrera = :carrera)
              AND (:estado IS NULL OR u.estado = :estado)
            """)
    List<Usuario> buscarEstudiantesParaCampana(
            @Param("carrera") String carrera,
            @Param("estado") com.alquilaya.serviciousuarios.enums.EstadoUsuario estado);

    /**
     * Conteo de la misma consulta de arriba (preview "destinatarios estimados" del formulario
     * de campaña, sin traer la lista completa a memoria).
     */
    @Query("""
            SELECT COUNT(u) FROM Usuario u JOIN u.estudiante e
            WHERE u.rol = com.alquilaya.serviciousuarios.enums.Rol.ESTUDIANTE
              AND u.eliminado = false
              AND u.notificarMarketing = true
              AND u.telefono IS NOT NULL AND u.telefono <> ''
              AND (:carrera IS NULL OR e.carrera = :carrera)
              AND (:estado IS NULL OR u.estado = :estado)
            """)
    long contarEstudiantesParaCampana(
            @Param("carrera") String carrera,
            @Param("estado") com.alquilaya.serviciousuarios.enums.EstadoUsuario estado);

    /**
     * Búsqueda por texto libre para el command palette admin (Ctrl+K, ítem 377): coincide contra
     * nombre/apellido/correo (case-insensitive) o DNI, excluyendo cuentas dadas de baja (mismo
     * criterio GDPR que el resto de listados). {@code pageable} acota el tamaño del resultado —
     * esto es para autocompletar, no un listado paginado completo (el caller pasa
     * {@code PageRequest.of(0, limit)}).
     */
    @Query("""
            SELECT u FROM Usuario u
            WHERE u.eliminado = false
              AND (
                LOWER(u.nombre) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(u.apellido) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(u.correo) LIKE LOWER(CONCAT('%', :q, '%'))
                OR u.dni LIKE CONCAT('%', :q, '%')
              )
            ORDER BY u.nombre ASC
            """)
    List<Usuario> buscarPorTexto(@Param("q") String q, Pageable pageable);
}
