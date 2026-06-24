package com.alquilaya.serviciousuarios.dto.rbac;

import com.alquilaya.serviciousuarios.entities.Funcionalidad;

/** Entrada del catálogo de funcionalidades (permisos atómicos) para el panel RBAC (#32). */
public record FuncionalidadDTO(String clave, String nombre, String descripcion, String categoria) {
    public static FuncionalidadDTO from(Funcionalidad f) {
        return new FuncionalidadDTO(f.getClave(), f.getNombre(), f.getDescripcion(), f.getCategoria());
    }
}
