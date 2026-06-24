package com.alquilaya.serviciousuarios.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashSet;
import java.util.Set;

/**
 * Rol personalizable creado desde el panel admin (RBAC dinámico, #32). NO reemplaza al
 * enum {@code Rol} (tipo de cuenta base), sino que añade permisos finos sobre los usuarios
 * a los que se asigne. Sus permisos se unen a los del rol base en {@code PermisoEnforcerService}.
 */
@Entity
@Table(name = "roles_personalizados",
        uniqueConstraints = @UniqueConstraint(name = "uk_rol_personalizado_nombre", columnNames = "nombre"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RolPersonalizado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nombre;

    private String descripcion;

    /** Rol del sistema (semilla): no se puede eliminar desde el panel. */
    @Builder.Default
    @Column(nullable = false)
    private boolean sistema = false;

    /** Claves de {@link Funcionalidad} que este rol otorga. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "rol_personalizado_funcionalidades",
            joinColumns = @JoinColumn(name = "rol_id"))
    @Column(name = "funcionalidad", nullable = false)
    @Builder.Default
    private Set<String> funcionalidades = new HashSet<>();
}
