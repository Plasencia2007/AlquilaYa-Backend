package com.alquilaya.serviciousuarios.config;

import com.alquilaya.serviciousuarios.entities.Arrendador;
import com.alquilaya.serviciousuarios.entities.Estudiante;
import com.alquilaya.serviciousuarios.entities.Funcionalidad;
import com.alquilaya.serviciousuarios.entities.Permiso;
import com.alquilaya.serviciousuarios.entities.RolPersonalizado;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.repositories.ArrendadorRepository;
import com.alquilaya.serviciousuarios.repositories.EstudianteRepository;
import com.alquilaya.serviciousuarios.repositories.FuncionalidadRepository;
import com.alquilaya.serviciousuarios.repositories.PermisoRepository;
import com.alquilaya.serviciousuarios.repositories.RolPersonalizadoRepository;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final PermisoRepository permisoRepository;
    private final UsuarioRepository usuarioRepository;
    private final ArrendadorRepository arrendadorRepository;
    private final EstudianteRepository estudianteRepository;
    private final FuncionalidadRepository funcionalidadRepository;
    private final RolPersonalizadoRepository rolPersonalizadoRepository;

    @Override
    @Transactional
    public void run(String... args) {
        inicializarPermisos();
        inicializarCatalogoFuncionalidades();
        inicializarRolesSistema();
        inicializarPerfilesFaltantes();
    }

    /** Catálogo de funcionalidades (permisos atómicos) para el panel RBAC (#32). */
    private void inicializarCatalogoFuncionalidades() {
        String[][] catalogo = {
                {"VER_CUARTOS", "Ver cuartos", "Explorar el catálogo de propiedades", "Propiedades"},
                {"PUBLICAR_CUARTOS", "Publicar cuartos", "Crear nuevas publicaciones", "Propiedades"},
                {"GESTIONAR_CUARTOS", "Gestionar cuartos", "Editar/eliminar publicaciones propias", "Propiedades"},
                {"RESERVAR", "Reservar", "Solicitar reservas de cuartos", "Reservas"},
                {"GESTIONAR_RESERVAS", "Gestionar reservas", "Aprobar/rechazar/gestionar reservas", "Reservas"},
                {"AGREGAR_FAVORITOS", "Agregar favoritos", "Guardar propiedades como favoritas", "Estudiante"},
                {"RESENAR", "Dejar reseñas", "Calificar propiedades y arrendadores", "Reseñas"},
                {"MODERAR_RESENAS", "Moderar reseñas", "Revisar y ocultar reseñas reportadas", "Reseñas"},
                {"MODERAR_PROPIEDADES", "Moderar propiedades", "Aprobar/rechazar/auditar publicaciones", "Moderación"},
                {"GESTIONAR_DENUNCIAS", "Gestionar denuncias", "Revisar y resolver reportes de avisos", "Moderación"},
                {"ADMIN_PANEL", "Acceder al panel admin", "Entrar al panel de administración", "Administración"},
                {"VER_USUARIOS", "Ver usuarios", "Listar y consultar usuarios", "Usuarios"},
                {"EDITAR_USUARIO", "Editar usuarios", "Modificar datos de usuarios", "Usuarios"},
                {"ELIMINAR_USUARIO", "Eliminar usuarios", "Dar de baja usuarios", "Usuarios"},
                {"GESTIONAR_DOCUMENTOS", "Gestionar documentos (KYC)", "Aprobar/rechazar verificaciones de identidad", "Verificación"},
                {"GESTIONAR_SISTEMA", "Gestionar sistema", "Administrar roles, permisos y configuración", "Sistema"},
        };
        int creados = 0;
        for (String[] f : catalogo) {
            if (funcionalidadRepository.existsByClave(f[0])) continue;
            funcionalidadRepository.save(Funcionalidad.builder()
                    .clave(f[0]).nombre(f[1]).descripcion(f[2]).categoria(f[3]).build());
            creados++;
        }
        if (creados > 0) log.info("✅ Catálogo de funcionalidades: {} nuevas.", creados);
    }

    /** Roles de staff de ejemplo (sistema) — no eliminables, pero editables, para arrancar el panel. */
    private void inicializarRolesSistema() {
        crearRolSistemaSiFalta("Moderador", "Modera reseñas, propiedades y denuncias",
                Set.of("ADMIN_PANEL", "MODERAR_RESENAS", "MODERAR_PROPIEDADES", "GESTIONAR_DENUNCIAS", "VER_USUARIOS"));
        crearRolSistemaSiFalta("Verificador", "Aprueba documentos de identidad (KYC) y audita publicaciones",
                Set.of("ADMIN_PANEL", "GESTIONAR_DOCUMENTOS", "MODERAR_PROPIEDADES", "VER_USUARIOS"));
        crearRolSistemaSiFalta("Soporte", "Atención al usuario (solo lectura)",
                Set.of("ADMIN_PANEL", "VER_USUARIOS"));
    }

    private void crearRolSistemaSiFalta(String nombre, String descripcion, Set<String> funcionalidades) {
        if (rolPersonalizadoRepository.existsByNombre(nombre)) return;
        rolPersonalizadoRepository.save(RolPersonalizado.builder()
                .nombre(nombre).descripcion(descripcion).sistema(true)
                .funcionalidades(new HashSet<>(funcionalidades)).build());
        log.info("✅ Rol de sistema sembrado: {}", nombre);
    }

    private void inicializarPermisos() {
        // Mapa: funcionalidad → roles habilitados por defecto
        // ADMIN siempre obtiene todo automáticamente.
        Map<String, Set<Rol>> matriz = Map.ofEntries(
                Map.entry("VER_CUARTOS", EnumSet.of(Rol.ESTUDIANTE, Rol.ARRENDADOR)),
                Map.entry("PUBLICAR_CUARTOS", EnumSet.of(Rol.ARRENDADOR)),
                Map.entry("GESTIONAR_CUARTOS", EnumSet.of(Rol.ARRENDADOR)),
                Map.entry("ADMIN_PANEL", EnumSet.noneOf(Rol.class)),
                Map.entry("RESERVAR", EnumSet.of(Rol.ESTUDIANTE)),
                Map.entry("GESTIONAR_RESERVAS", EnumSet.of(Rol.ARRENDADOR)),
                Map.entry("AGREGAR_FAVORITOS", EnumSet.of(Rol.ESTUDIANTE)),
                Map.entry("RESENAR", EnumSet.of(Rol.ESTUDIANTE)),
                Map.entry("MODERAR_RESENAS", EnumSet.noneOf(Rol.class)),
                Map.entry("MODERAR_PROPIEDADES", EnumSet.noneOf(Rol.class)),
                Map.entry("GESTIONAR_DENUNCIAS", EnumSet.noneOf(Rol.class)),
                // Permisos de gestión de usuarios y sistema (solo ADMIN)
                Map.entry("VER_USUARIOS", EnumSet.noneOf(Rol.class)),
                Map.entry("EDITAR_USUARIO", EnumSet.noneOf(Rol.class)),
                Map.entry("ELIMINAR_USUARIO", EnumSet.noneOf(Rol.class)),
                Map.entry("GESTIONAR_SISTEMA", EnumSet.noneOf(Rol.class)),
                Map.entry("GESTIONAR_DOCUMENTOS", EnumSet.noneOf(Rol.class))
        );

        int creados = 0;
        for (Map.Entry<String, Set<Rol>> entry : matriz.entrySet()) {
            String func = entry.getKey();
            Set<Rol> habilitadosPorDefecto = entry.getValue();

            for (Rol rol : Rol.values()) {
                if (permisoRepository.findByRolAndFuncionalidad(rol, func).isPresent()) {
                    continue;
                }
                boolean habilitado = (rol == Rol.ADMIN) || habilitadosPorDefecto.contains(rol);
                permisoRepository.save(Permiso.builder()
                        .rol(rol)
                        .funcionalidad(func)
                        .habilitado(habilitado)
                        .build());
                creados++;
            }
        }

        if (creados > 0) {
            log.info("✅ Permisos upsert completado. {} permisos nuevos creados.", creados);
        } else {
            log.debug("Permisos ya sincronizados — no hay nada que insertar.");
        }
    }

    private void inicializarPerfilesFaltantes() {
        List<Usuario> usuarios = usuarioRepository.findAll();
        for (Usuario u : usuarios) {
            if (u.getRol() == Rol.ARRENDADOR) {
                if (arrendadorRepository.findByUsuario(u).isEmpty()) {
                    arrendadorRepository.save(Arrendador.builder()
                            .usuario(u)
                            .nombreComercial("Negocio de " + u.getNombre())
                            .build());
                    log.info("🏠 Perfil de Arrendador (fallback) creado para: {}", u.getNombre());
                }
            } else if (u.getRol() == Rol.ESTUDIANTE) {
                if (estudianteRepository.findByUsuario(u).isEmpty()) {
                    estudianteRepository.save(Estudiante.builder()
                            .usuario(u)
                            .universidad("Por definir")
                            .build());
                    log.info("🎓 Perfil de Estudiante (fallback) creado para: {}", u.getNombre());
                }
            }
        }
    }
}
