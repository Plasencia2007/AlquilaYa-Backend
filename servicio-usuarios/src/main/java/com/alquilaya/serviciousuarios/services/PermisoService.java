package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.entities.Permiso;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.exceptions.ConflictoEstadoException;
import com.alquilaya.serviciousuarios.repositories.PermisoRepository;
import com.alquilaya.serviciousuarios.repositories.RolPersonalizadoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PermisoService {

    /**
     * Funcionalidad que da acceso al panel admin. Si se desactiva en el último rol (base o
     * personalizado) que la otorga, nadie puede volver a entrar al panel para revertirlo —
     * de ahí el guard en {@link #actualizarEstado} (#387, "guard del último admin").
     */
    private static final String FUNCIONALIDAD_ADMIN_PANEL = "ADMIN_PANEL";

    private final PermisoRepository permisoRepository;
    private final RolPersonalizadoRepository rolPersonalizadoRepository;

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

        boolean seEstaDesactivando = permiso.isHabilitado() && !habilitado;
        if (seEstaDesactivando && FUNCIONALIDAD_ADMIN_PANEL.equals(permiso.getFuncionalidad())) {
            validarNoEsUltimaFuenteDeAdminPanel(permiso);
        }

        permiso.setHabilitado(habilitado);
        return permisoRepository.save(permiso);
    }

    /**
     * Rechaza con 409 si este es el último rol (base o personalizado, #32) que otorga
     * ADMIN_PANEL. Cuenta sobre CUALQUIER rol —no solo el literal 'ADMIN'— porque un rol
     * personalizado también puede ser la única fuente de acceso al panel para algún usuario.
     */
    private void validarNoEsUltimaFuenteDeAdminPanel(Permiso permiso) {
        // El propio permiso todavía cuenta como habilitado=true en BD en este punto (aún no
        // se guardó el cambio), así que se descuenta para saber cuántos OTROS quedarían.
        long otrosRolesBaseActivos =
                permisoRepository.countByFuncionalidadAndHabilitadoTrue(FUNCIONALIDAD_ADMIN_PANEL) - 1;
        boolean algunRolPersonalizadoLoOtorga =
                rolPersonalizadoRepository.existsByFuncionalidad(FUNCIONALIDAD_ADMIN_PANEL);

        if (otrosRolesBaseActivos <= 0 && !algunRolPersonalizadoLoOtorga) {
            throw new ConflictoEstadoException(
                    "No se puede desactivar '" + FUNCIONALIDAD_ADMIN_PANEL + "' para el rol " + permiso.getRol()
                            + ": ningún otro rol (base o personalizado) lo mantiene activo. Esto dejaría "
                            + "la plataforma sin ningún camino de acceso al panel administrativo.");
        }
    }

    public boolean tienePermiso(Rol rol, String funcionalidad) {
        return permisoRepository.findByRolAndFuncionalidad(rol, funcionalidad)
                .map(Permiso::isHabilitado)
                .orElse(false);
    }

    /** Funcionalidades habilitadas para un rol base (para calcular permisos efectivos #32). */
    public java.util.Set<String> funcionalidadesHabilitadas(Rol rol) {
        return permisoRepository.findByRol(rol).stream()
                .filter(Permiso::isHabilitado)
                .map(Permiso::getFuncionalidad)
                .collect(java.util.stream.Collectors.toSet());
    }

    public Permiso obtenerPorId(Long id) {
        return permisoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Permiso no encontrado con id: " + id));
    }

    @Transactional
    public Permiso crearPermiso(Permiso permiso) {
        return permisoRepository.save(permiso);
    }

    @Transactional
    public void eliminarPermiso(Long id) {
        if (!permisoRepository.existsById(id)) {
            throw new RuntimeException("Permiso no encontrado con id: " + id);
        }
        permisoRepository.deleteById(id);
    }
}
