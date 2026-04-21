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

import java.util.Arrays;
import java.util.List;

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
        if (permisoRepository.count() == 0) {
            log.info("Iniciando creación de permisos por defecto...");
            List<String> funcionalidades = Arrays.asList(
                    "VER_CUARTOS",
                    "PUBLICAR_CUARTOS",
                    "GESTIONAR_CUARTOS",
                    "ADMIN_PANEL"
            );

            for (Rol rol : Rol.values()) {
                for (String func : funcionalidades) {
                    boolean habilitado = false;

                    if (rol == Rol.ADMIN) {
                        habilitado = true;
                    } else if (rol == Rol.ARRENDADOR) {
                        if (func.equals("VER_CUARTOS") || func.equals("PUBLICAR_CUARTOS") || func.equals("GESTIONAR_CUARTOS")) {
                            habilitado = true;
                        }
                    } else if (rol == Rol.ESTUDIANTE) {
                        if (func.equals("VER_CUARTOS")) {
                            habilitado = true;
                        }
                    }

                    permisoRepository.save(Permiso.builder()
                            .rol(rol)
                            .funcionalidad(func)
                            .habilitado(habilitado)
                            .build());
                }
            }
            log.info("✅ Permisos dinámicos inicializados con éxito.");
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
