package com.alquilaya.serviciousuarios.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Catálogo de funcionalidades (permisos atómicos) del sistema. Es el universo de
 * permisos que un rol personalizado puede otorgar. Se seedea en {@code DataInitializer}.
 */
@Entity
@Table(name = "funcionalidades")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Funcionalidad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Clave estable usada en código y en {@code @PreAuthorize} (ej. "MODERAR_RESENAS"). */
    @Column(nullable = false, unique = true)
    private String clave;

    /** Etiqueta legible para la UI (ej. "Moderar reseñas"). */
    @Column(nullable = false)
    private String nombre;

    private String descripcion;

    /** Agrupación para la UI (ej. "Reseñas", "Usuarios", "Sistema"). */
    private String categoria;
}
