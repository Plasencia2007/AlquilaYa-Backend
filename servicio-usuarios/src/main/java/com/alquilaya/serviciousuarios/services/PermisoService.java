package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.entities.Permiso;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.repositories.PermisoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PermisoService {

    private final PermisoRepository permisoRepository;

    public List<Permiso> obtenerTodos() {
        return permisoRepository.findAll();
    }

    public List<Permiso> obtenerPorRol(Rol rol) {
        return permisoRepository.findByRol(rol);
    }

    @Transactional
    public Permiso actualizarEstado(Long id, boolean habilitado) {
        Permiso permiso = permisoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Permiso no encontrado con id: " + id));
        permiso.setHabilitado(habilitado);
        return permisoRepository.save(permiso);
    }

    public boolean tienePermiso(Rol rol, String funcionalidad) {
        return permisoRepository.findByRolAndFuncionalidad(rol, funcionalidad)
                .map(Permiso::isHabilitado)
                .orElse(false); // Por defecto, si no existe la entrada, no tiene permiso
    }
}
