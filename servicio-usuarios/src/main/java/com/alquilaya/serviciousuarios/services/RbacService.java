package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.dto.rbac.FuncionalidadDTO;
import com.alquilaya.serviciousuarios.dto.rbac.RolPersonalizadoDTO;
import com.alquilaya.serviciousuarios.dto.rbac.RolPersonalizadoRequest;
import com.alquilaya.serviciousuarios.entities.RolPersonalizado;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.exceptions.RecursoNoEncontradoException;
import com.alquilaya.serviciousuarios.repositories.FuncionalidadRepository;
import com.alquilaya.serviciousuarios.repositories.RolPersonalizadoRepository;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * RBAC dinámico (#32): gestión de roles personalizados, su set de permisos y su asignación
 * a usuarios. Los permisos efectivos de un usuario = permisos de su rol base (enum) ∪ permisos
 * de sus roles personalizados (ver {@link PermisoEnforcerService}).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RbacService {

    private final RolPersonalizadoRepository rolRepository;
    private final FuncionalidadRepository funcionalidadRepository;
    private final UsuarioRepository usuarioRepository;
    private final PermisoService permisoService;

    /** Caché TTL de funcionalidades por usuario (sus roles personalizados). Evita una query por request. */
    private record FuncsCacheadas(Set<String> funcs, long expiraMs) {}
    private static final long CACHE_TTL_MS = 30_000;
    private final Map<Long, FuncsCacheadas> cachePersonalizadas = new ConcurrentHashMap<>();

    // ===== Catálogo =====

    public List<FuncionalidadDTO> listarFuncionalidades() {
        return funcionalidadRepository.findAll().stream()
                .map(FuncionalidadDTO::from)
                .sorted((a, b) -> {
                    int c = nullSafe(a.categoria()).compareTo(nullSafe(b.categoria()));
                    return c != 0 ? c : a.nombre().compareTo(b.nombre());
                })
                .toList();
    }

    // ===== Roles =====

    public List<RolPersonalizadoDTO> listarRoles() {
        return rolRepository.findAll().stream().map(RolPersonalizadoDTO::from).toList();
    }

    @Transactional
    public RolPersonalizadoDTO crear(RolPersonalizadoRequest req) {
        String nombre = req.getNombre().trim();
        if (rolRepository.existsByNombre(nombre)) {
            throw new IllegalStateException("Ya existe un rol con el nombre '" + nombre + "'");
        }
        RolPersonalizado rol = RolPersonalizado.builder()
                .nombre(nombre)
                .descripcion(req.getDescripcion())
                .sistema(false)
                .funcionalidades(validar(req.getFuncionalidades()))
                .build();
        log.info("[RBAC] Rol personalizado creado: {}", nombre);
        return RolPersonalizadoDTO.from(rolRepository.save(rol));
    }

    @Transactional
    public RolPersonalizadoDTO actualizar(Long id, RolPersonalizadoRequest req) {
        RolPersonalizado rol = obtener(id);
        String nombre = req.getNombre().trim();
        // Los roles de sistema no se renombran, pero sí se pueden ajustar sus permisos.
        if (!rol.isSistema()) {
            if (!rol.getNombre().equalsIgnoreCase(nombre) && rolRepository.existsByNombre(nombre)) {
                throw new IllegalStateException("Ya existe un rol con el nombre '" + nombre + "'");
            }
            rol.setNombre(nombre);
        }
        rol.setDescripcion(req.getDescripcion());
        rol.setFuncionalidades(validar(req.getFuncionalidades()));
        return RolPersonalizadoDTO.from(rolRepository.save(rol));
    }

    @Transactional
    public void eliminar(Long id) {
        RolPersonalizado rol = obtener(id);
        if (rol.isSistema()) {
            throw new IllegalStateException("No se puede eliminar un rol del sistema");
        }
        // Desasignar de los usuarios que lo tengan (Usuario es el lado dueño de la relación).
        List<Usuario> conRol = usuarioRepository.findByRolPersonalizadoId(id);
        for (Usuario u : conRol) {
            u.getRolesPersonalizados().removeIf(r -> r.getId().equals(id));
        }
        usuarioRepository.saveAll(conRol);
        conRol.forEach(u -> invalidarCache(u.getId()));
        rolRepository.delete(rol);
        log.info("[RBAC] Rol personalizado {} eliminado (desasignado de {} usuarios)", id, conRol.size());
    }

    // ===== Asignación a usuarios =====

    @Transactional
    public void asignarRol(Long usuarioId, Long rolId) {
        Usuario u = usuario(usuarioId);
        RolPersonalizado rol = obtener(rolId);
        u.getRolesPersonalizados().add(rol);
        usuarioRepository.save(u);
        invalidarCache(usuarioId);
        log.info("[RBAC] Rol {} asignado a usuario {}", rolId, usuarioId);
    }

    @Transactional
    public void quitarRol(Long usuarioId, Long rolId) {
        Usuario u = usuario(usuarioId);
        u.getRolesPersonalizados().removeIf(r -> r.getId().equals(rolId));
        usuarioRepository.save(u);
        invalidarCache(usuarioId);
        log.info("[RBAC] Rol {} quitado de usuario {}", rolId, usuarioId);
    }

    @Transactional(readOnly = true)
    public List<RolPersonalizadoDTO> rolesDeUsuario(Long usuarioId) {
        return usuario(usuarioId).getRolesPersonalizados().stream()
                .map(RolPersonalizadoDTO::from).toList();
    }

    // ===== Permisos efectivos (para que el front muestre/oculte) =====

    @Transactional(readOnly = true)
    public Set<String> permisosEfectivos(Long usuarioId, Rol rolBase) {
        Set<String> efectivos = new HashSet<>(permisoService.funcionalidadesHabilitadas(rolBase));
        efectivos.addAll(funcionalidadesPersonalizadas(usuarioId));
        return efectivos;
    }

    /** Funcionalidades que dan los roles personalizados del usuario, con caché TTL. */
    @Transactional(readOnly = true)
    public Set<String> funcionalidadesPersonalizadas(Long usuarioId) {
        long now = System.currentTimeMillis();
        FuncsCacheadas c = cachePersonalizadas.get(usuarioId);
        if (c != null && c.expiraMs() > now) return c.funcs();
        Set<String> funcs = usuarioRepository.findFuncionalidadesByUsuarioId(usuarioId);
        cachePersonalizadas.put(usuarioId, new FuncsCacheadas(funcs, now + CACHE_TTL_MS));
        return funcs;
    }

    private void invalidarCache(Long usuarioId) {
        cachePersonalizadas.remove(usuarioId);
    }

    // ===== Helpers =====

    private RolPersonalizado obtener(Long id) {
        return rolRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el rol " + id));
    }

    private Usuario usuario(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el usuario " + id));
    }

    /** Conserva solo claves que existen en el catálogo (ignora desconocidas). */
    private Set<String> validar(Set<String> claves) {
        if (claves == null) return new HashSet<>();
        return claves.stream()
                .filter(funcionalidadRepository::existsByClave)
                .collect(Collectors.toCollection(HashSet::new));
    }

    private static String nullSafe(String s) {
        return s == null ? "" : s;
    }
}
