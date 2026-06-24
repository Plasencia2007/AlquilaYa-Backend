package com.alquilaya.serviciousuarios.dto.rbac;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.HashSet;
import java.util.Set;

/** Cuerpo para crear/editar un rol personalizado (#32). */
@Data
public class RolPersonalizadoRequest {
    @NotBlank(message = "El nombre del rol es obligatorio")
    private String nombre;

    private String descripcion;

    /** Claves de funcionalidad que el rol otorga. */
    private Set<String> funcionalidades = new HashSet<>();
}
