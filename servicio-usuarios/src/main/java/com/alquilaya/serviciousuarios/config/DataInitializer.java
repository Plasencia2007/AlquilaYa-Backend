package com.alquilaya.serviciousuarios.config;

import com.alquilaya.serviciousuarios.entities.Arrendador;
import com.alquilaya.serviciousuarios.entities.Estudiante;
import com.alquilaya.serviciousuarios.entities.Permiso;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.repositories.ArrendadorRepository;
import com.alquilaya.serviciousuarios.repositories.EstudianteRepository;
import com.alquilaya.serviciousuarios.repositories.PermisoRepository;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
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

    @Override
    @Transactional
    public void run(String... args) {
        inicializarPermisos();
        inicializarPerfilesFaltantes();
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
                Map.entry("MODERAR_RESENAS", EnumSet.noneOf(Rol.class))
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
