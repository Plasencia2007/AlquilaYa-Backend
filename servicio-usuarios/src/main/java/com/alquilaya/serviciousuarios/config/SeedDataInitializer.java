package com.alquilaya.serviciousuarios.config;

import com.alquilaya.serviciousuarios.entities.Arrendador;
import com.alquilaya.serviciousuarios.entities.Estudiante;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.EstadoUsuario;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.repositories.ArrendadorRepository;
import com.alquilaya.serviciousuarios.repositories.EstudianteRepository;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

/**
 * Carga usuarios de prueba para desarrollo.
 *
 * <p>Es <b>idempotente</b>: cada usuario se crea únicamente si su correo aún no
 * existe, así que arrancar el servicio repetidamente nunca duplica datos ni borra
 * nada. No requiere reiniciar la BD salvo que quieras partir de cero.</p>
 *
 * <p>Todos quedan {@link EstadoUsuario#ACTIVE} y con el teléfono verificado para
 * poder iniciar sesión sin pasar por el OTP de WhatsApp. Password común:
 * {@code Jhons2007@}.</p>
 *
 * <p><b>IMPORTANTE — enlace con servicio-propiedades:</b> el orden de creación de
 * los arrendadores fija su {@code perfilId} en una BD recién reiniciada
 * ({@code arrendador@ -> 1}, {@code arrendador2@ -> 2}). servicio-propiedades usa
 * esos ids para enlazar las propiedades de prueba (ver
 * {@code alquilaya.seed.arrendador*-perfil-id}). Si reinicias datos, reinicia
 * ambas BDs juntas para que los ids sigan alineados.</p>
 *
 * <p>Desactivable con {@code alquilaya.seed.enabled=false}
 * (env {@code ALQUILAYA_SEED_ENABLED=false}).</p>
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
@Order(20)
public class SeedDataInitializer implements CommandLineRunner {

    private static final String PASSWORD_PRUEBA = "Jhons2007@";

    private final UsuarioRepository usuarioRepository;
    private final ArrendadorRepository arrendadorRepository;
    private final EstudianteRepository estudianteRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${alquilaya.seed.enabled:true}")
    private boolean seedEnabled;

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled) {
            log.info("[SEED] alquilaya.seed.enabled=false — no se cargan usuarios de prueba.");
            return;
        }

        crearAdmin("admin@gmail.com", "Admin", "00000001");

        crearEstudiante("estudiante@gmail.com", "Juan", "Pérez",
                "70000002", "51999000002");

        // El ORDEN importa: arrendador@ debe crearse antes que arrendador2@ para que
        // sus perfilId queden como 1 y 2 en una BD limpia (los usa servicio-propiedades).
        crearArrendador("arrendador@gmail.com", "Carlos", "López",
                "70000003", "51999000003",
                "Cuartos San Carlos", "Av. Central 123, Ñaña, Lurigancho",
                -11.9885, -76.8965, true);

        crearArrendador("arrendador2@gmail.com", "María", "Quispe",
                "70000004", "51999000004",
                "Residencia Estudiantil María", "Jr. Las Flores 456, Ñaña, Lurigancho",
                -11.9860, -76.8995, false);

        log.info("[SEED] Usuarios de prueba verificados/creados. Password de todos: {}", PASSWORD_PRUEBA);
    }

    private void crearAdmin(String correo, String nombre, String dni) {
        if (usuarioRepository.existsByCorreo(correo)) {
            log.debug("[SEED] {} ya existe — se omite.", correo);
            return;
        }
        Usuario u = Usuario.builder()
                .nombre(nombre)
                .apellido("ADMIN")
                .dni(dni)
                .correo(correo)
                .password(passwordEncoder.encode(PASSWORD_PRUEBA))
                .rol(Rol.ADMIN)
                .estado(EstadoUsuario.ACTIVE)
                .telefonoVerificado(true)
                .emailVerificado(true)
                .build();
        usuarioRepository.save(u);
        log.info("[SEED] 👑 ADMIN creado: {}", correo);
    }

    private void crearEstudiante(String correo, String nombre, String apellido,
                                 String dni, String telefono) {
        if (usuarioRepository.existsByCorreo(correo)) {
            log.debug("[SEED] {} ya existe — se omite.", correo);
            return;
        }
        Usuario saved = usuarioRepository.save(Usuario.builder()
                .nombre(nombre)
                .apellido(apellido)
                .dni(dni)
                .correo(correo)
                .telefono(telefono)
                .password(passwordEncoder.encode(PASSWORD_PRUEBA))
                .rol(Rol.ESTUDIANTE)
                .estado(EstadoUsuario.ACTIVE)
                .telefonoVerificado(true)
                .emailVerificado(true)
                .build());

        estudianteRepository.save(Estudiante.builder()
                .usuario(saved)
                .universidad("Universidad Peruana Unión")
                .codigoEstudiante("202410001")
                .carrera("Ingeniería de Sistemas")
                .ciclo(5)
                .build());
        log.info("[SEED] 🎓 ESTUDIANTE creado: {} (perfilId={})", correo, saved.getId());
    }

    private void crearArrendador(String correo, String nombre, String apellido,
                                 String dni, String telefono, String nombreComercial,
                                 String direccion, double lat, double lon, boolean esEmpresa) {
        if (usuarioRepository.existsByCorreo(correo)) {
            log.debug("[SEED] {} ya existe — se omite.", correo);
            return;
        }
        Usuario saved = usuarioRepository.save(Usuario.builder()
                .nombre(nombre)
                .apellido(apellido)
                .dni(dni)
                .correo(correo)
                .telefono(telefono)
                .password(passwordEncoder.encode(PASSWORD_PRUEBA))
                .rol(Rol.ARRENDADOR)
                .estado(EstadoUsuario.ACTIVE)
                .telefonoVerificado(true)
                .emailVerificado(true)
                .build());

        Arrendador a = arrendadorRepository.save(Arrendador.builder()
                .usuario(saved)
                .nombreComercial(nombreComercial)
                .telefono(telefono)
                .direccionPropiedades(direccion)
                .latitud(lat)
                .longitud(lon)
                .esEmpresa(esEmpresa)
                .build());
        log.info("[SEED] 🏠 ARRENDADOR creado: {} (perfilId={})", correo, a.getId());
    }
}
