package com.alquilaya.serviciousuarios.entities;

import com.alquilaya.serviciousuarios.enums.Rol;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "permisos", uniqueConstraints = {
    @UniqueConstraint(name = "uk_permiso_rol_funcionalidad", columnNames = {"rol", "funcionalidad"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Permiso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Rol rol;

    @Column(nullable = false)
    private String funcionalidad; // Ej: "VER_CUARTOS"

    @Column(nullable = false)
    private boolean habilitado;
}
