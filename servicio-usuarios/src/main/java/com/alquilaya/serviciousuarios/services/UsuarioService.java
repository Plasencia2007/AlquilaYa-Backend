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
    public Usuario registrarUsuario(RegisterRequest request) {
        if (usuarioRepository.existsByCorreo(request.getCorreo())) {
            throw new RuntimeException("El correo ya está registrado");
        }

        Usuario usuario = Usuario.builder()
                .nombre(request.getNombre())
                .apellido(request.getApellido())
                .dni(request.getDni())
                .correo(request.getCorreo())
                .telefono(request.getTelefono())
                .password(passwordEncoder.encode(request.getPassword()))
                .rol(Rol.valueOf(request.getRol().toUpperCase()))
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

        // 3. Enviar OTP vía WhatsApp (Simulación o Real según el microservicio)
        if (usuario.getTelefono() != null) {
            otpService.generarYEnviarOtp(usuario.getTelefono());
        }

        return savedUser;
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
