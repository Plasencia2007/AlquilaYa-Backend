package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.Usuario;
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
}
