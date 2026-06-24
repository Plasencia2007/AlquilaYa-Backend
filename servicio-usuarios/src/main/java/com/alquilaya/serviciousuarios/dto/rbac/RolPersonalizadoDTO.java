package com.alquilaya.serviciousuarios.dto.rbac;

import com.alquilaya.serviciousuarios.entities.RolPersonalizado;

import java.util.Set;
import java.util.TreeSet;

/** Rol personalizado con sus permisos, para el panel RBAC (#32). */
public record RolPersonalizadoDTO(
        Long id,
        String nombre,
        String descripcion,
        boolean sistema,
        Set<String> funcionalidades) {

    public static RolPersonalizadoDTO from(RolPersonalizado r) {
        return new RolPersonalizadoDTO(
                r.getId(), r.getNombre(), r.getDescripcion(), r.isSistema(),
                new TreeSet<>(r.getFuncionalidades()));
    }
}
