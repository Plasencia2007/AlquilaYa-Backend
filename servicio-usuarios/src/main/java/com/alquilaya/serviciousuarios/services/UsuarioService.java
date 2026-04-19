package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.dto.AuthDtos.RegisterRequest;
import com.alquilaya.serviciousuarios.entities.Arrendador;
import com.alquilaya.serviciousuarios.entities.Estudiante;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.repositories.ArrendadorRepository;
import com.alquilaya.serviciousuarios.repositories.EstudianteRepository;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import com.alquilaya.serviciousuarios.enums.EstadoUsuario;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final ArrendadorRepository arrendadorRepository;
    private final EstudianteRepository estudianteRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;

    @Transactional
    public Usuario registrarAdmin(com.alquilaya.serviciousuarios.dto.AuthDtos.AdminRegisterRequest request) {
        if (usuarioRepository.existsByCorreo(request.getCorreo())) {
            throw new RuntimeException("El correo ya está registrado");
        }

        Usuario admin = Usuario.builder()
                .nombre(request.getNombre())
                .apellido("") // No requerido para admin inicial
                .dni("") // No requerido para admin inicial
                .correo(request.getCorreo())
                .password(passwordEncoder.encode(request.getPassword()))
                .rol(Rol.ADMIN)
                .estado(EstadoUsuario.ACTIVE)
                .telefonoVerificado(true)
                .build();

        return usuarioRepository.save(admin);
    }

    @Transactional
    public Usuario registrarUsuario(RegisterRequest request) {
        if (usuarioRepository.existsByCorreo(request.getCorreo())) {
            throw new RuntimeException("El correo ya está registrado");
        }

        Rol rol = Rol.valueOf(request.getRol().toUpperCase());
        
        Usuario usuario = Usuario.builder()
                .nombre(request.getNombre())
                .apellido(request.getApellido())
                .dni(request.getDni())
                .correo(request.getCorreo())
                .telefono(request.getTelefono())
                .password(passwordEncoder.encode(request.getPassword()))
                .rol(rol)
                // Excepción para ADMIN: Se activa automáticamente
                .estado(rol == Rol.ADMIN ? EstadoUsuario.ACTIVE : EstadoUsuario.PENDING)
                .telefonoVerificado(rol == Rol.ADMIN)
                .build();

        Usuario savedUser = usuarioRepository.save(usuario);
        Map<String, Object> details = request.getDetallesPerfil();

        if (savedUser.getRol() == Rol.ARRENDADOR) {
            Arrendador arrendador = Arrendador.builder()
                    .usuario(savedUser)
                    .telefono((String) details.get("telefono"))
                    .ruc((String) details.get("ruc"))
                    .direccionPropiedades((String) details.get("direccionCuartos"))
                    .latitud(details.get("latitud") != null ? ((Number) details.get("latitud")).doubleValue() : null)
                    .longitud(details.get("longitud") != null ? ((Number) details.get("longitud")).doubleValue() : null)
                    .esEmpresa(details.get("esEmpresa") != null && (Boolean) details.get("esEmpresa"))
                    .build();
            arrendadorRepository.save(arrendador);
        } else if (savedUser.getRol() == Rol.ESTUDIANTE) {
            Estudiante estudiante = Estudiante.builder()
                    .usuario(savedUser)
                    .universidad((String) details.get("universidad"))
                    .codigoEstudiante((String) details.get("codigoEstudiante"))
                    .carrera((String) details.get("carrera"))
                    .ciclo(details.get("ciclo") != null ? Integer.parseInt(details.get("ciclo").toString()) : null)
                    .build();
            estudianteRepository.save(estudiante);
        }

        // Enviar OTP vía WhatsApp solo si NO es ADMIN
        if (usuario.getTelefono() != null && rol != Rol.ADMIN) {
            otpService.generarYEnviarOtp(usuario.getTelefono());
        }

        return savedUser;
    }

    public java.util.List<Usuario> listarTodos() {
        return usuarioRepository.findAll();
    }

    public java.util.List<Usuario> listarPorRol(Rol rol) {
        return usuarioRepository.findByRol(rol);
    }

    @Transactional
    public Usuario actualizarUsuario(Long id, Map<String, Object> updates) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (updates.containsKey("nombre")) usuario.setNombre((String) updates.get("nombre"));
        if (updates.containsKey("apellido")) usuario.setApellido((String) updates.get("apellido"));
        if (updates.containsKey("dni")) usuario.setDni((String) updates.get("dni"));
        if (updates.containsKey("telefono")) usuario.setTelefono((String) updates.get("telefono"));
        if (updates.containsKey("estado")) usuario.setEstado(EstadoUsuario.valueOf((String) updates.get("estado")));

        // Actualización de detalles de perfil si se proporcionan
        if (updates.containsKey("detallesPerfil")) {
            Map<String, Object> details = (Map<String, Object>) updates.get("detallesPerfil");
            if (usuario.getRol() == Rol.ARRENDADOR) {
                arrendadorRepository.findByUsuario(usuario).ifPresent(a -> {
                    if (details.containsKey("telefono")) a.setTelefono((String) details.get("telefono"));
                    if (details.containsKey("ruc")) a.setRuc((String) details.get("ruc"));
                    if (details.containsKey("nombreComercial")) a.setNombreComercial((String) details.get("nombreComercial"));
                    if (details.containsKey("direccionPropiedades")) a.setDireccionPropiedades((String) details.get("direccionPropiedades"));
                    if (details.containsKey("latitud")) a.setLatitud(details.get("latitud") != null ? ((Number) details.get("latitud")).doubleValue() : null);
                    if (details.containsKey("longitud")) a.setLongitud(details.get("longitud") != null ? ((Number) details.get("longitud")).doubleValue() : null);
                    if (details.containsKey("esEmpresa")) a.setEsEmpresa((Boolean) details.get("esEmpresa"));
                    arrendadorRepository.save(a);
                });
            } else if (usuario.getRol() == Rol.ESTUDIANTE) {
                estudianteRepository.findByUsuario(usuario).ifPresent(e -> {
                    if (details.containsKey("universidad")) e.setUniversidad((String) details.get("universidad"));
                    if (details.containsKey("codigoEstudiante")) e.setCodigoEstudiante((String) details.get("codigoEstudiante"));
                    if (details.containsKey("carrera")) e.setCarrera((String) details.get("carrera"));
                    if (details.containsKey("ciclo")) e.setCiclo(details.get("ciclo") != null ? Integer.parseInt(details.get("ciclo").toString()) : null);
                    estudianteRepository.save(e);
                });
            }
        }

        return usuarioRepository.save(usuario);
    }

    @Transactional
    public void eliminarUsuario(Long id) {
        usuarioRepository.deleteById(id);
    }

    @Transactional
    public boolean confirmarTelefono(String telefono, String codigo) {
        if (otpService.verificarOtp(telefono, codigo)) {
            return usuarioRepository.findByTelefono(telefono)
                    .map(u -> {
                        u.setTelefonoVerificado(true);
                        u.setEstado(EstadoUsuario.ACTIVE);
                        usuarioRepository.save(u);
                        return true;
                    }).orElse(false);
        }
        return false;
    }

    public Optional<Usuario> buscarPorCorreo(String correo) {
        return usuarioRepository.findByCorreo(correo);
    }

    public boolean verificarPassword(String passwordPlana, String passwordHashed) {
        return passwordEncoder.matches(passwordPlana, passwordHashed);
    }
}
