package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.dto.*;
import com.alquilaya.serviciousuarios.entities.Arrendador;
import com.alquilaya.serviciousuarios.entities.Estudiante;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.repositories.ArrendadorRepository;
import com.alquilaya.serviciousuarios.repositories.EstudianteRepository;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import com.alquilaya.serviciousuarios.enums.EstadoUsuario;
import com.alquilaya.serviciousuarios.exceptions.CorreoYaRegistradoException;
import com.alquilaya.serviciousuarios.exceptions.RecursoNoEncontradoException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final ArrendadorRepository arrendadorRepository;
    private final EstudianteRepository estudianteRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;

    @Transactional
    public Usuario registrarAdmin(AdminRegisterRequest request) {
        if (usuarioRepository.existsByCorreo(request.getCorreo())) {
            throw new CorreoYaRegistradoException("El correo " + request.getCorreo() + " ya está registrado en AlquilaYa");
        }

        Usuario admin = Usuario.builder()
                .nombre(request.getNombre())
                .apellido("ADMIN")
                .dni("00000000")
                .correo(request.getCorreo())
                .password(passwordEncoder.encode(request.getPassword()))
                .rol(Rol.ADMIN)
                .estado(EstadoUsuario.ACTIVE)
                .telefonoVerificado(true)
                .build();

        log.info("Registrando nuevo administrador: {}", request.getCorreo());
        return usuarioRepository.save(admin);
    }

    @Transactional
    public Usuario registrarUsuario(RegisterRequest request) {
        if (usuarioRepository.existsByCorreo(request.getCorreo())) {
            throw new CorreoYaRegistradoException("El correo " + request.getCorreo() + " ya está registrado en AlquilaYa. Si ya tienes cuenta, intenta iniciar sesión.");
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
                .estado(rol == Rol.ADMIN ? EstadoUsuario.ACTIVE : EstadoUsuario.PENDING)
                .telefonoVerificado(rol == Rol.ADMIN)
                .build();

        Usuario savedUser = usuarioRepository.save(usuario);
        log.info("Usuario básico guardado con ID: {} y Rol: {}", savedUser.getId(), savedUser.getRol());

        if (rol == Rol.ARRENDADOR) {
            if (request.getDetallesArrendador() == null) {
                throw new IllegalArgumentException("Los datos de arrendador son obligatorios para el rol ARRENDADOR");
            }
            DetallesArrendadorRequest det = request.getDetallesArrendador();
            Arrendador arrendador = Arrendador.builder()
                    .usuario(savedUser)
                    .telefono(det.getTelefono())
                    .ruc(det.getRuc())
                    .nombreComercial(det.getNombreComercial())
                    .direccionPropiedades(det.getDireccionCuartos())
                    .latitud(det.getLatitud())
                    .longitud(det.getLongitud())
                    .esEmpresa(det.getEsEmpresa() != null && det.getEsEmpresa())
                    .build();
            arrendadorRepository.save(arrendador);
        } else if (rol == Rol.ESTUDIANTE) {
            if (request.getDetallesEstudiante() == null) {
                throw new IllegalArgumentException("Los datos de estudiante son obligatorios para el rol ESTUDIANTE");
            }
            DetallesEstudianteRequest det = request.getDetallesEstudiante();
            Estudiante estudiante = Estudiante.builder()
                    .usuario(savedUser)
                    .universidad(det.getUniversidad())
                    .codigoEstudiante(det.getCodigoEstudiante())
                    .carrera(det.getCarrera())
                    .ciclo(det.getCiclo())
                    .build();
            estudianteRepository.save(estudiante);
        } else if (rol == Rol.ADMIN) {
            log.info("Registrando usuario con rol ADMIN de forma simplificada");
            // No se requieren detalles adicionales para ADMIN
        }

        if (usuario.getTelefono() != null && rol != Rol.ADMIN) {
            log.debug("Enviando OTP a {}", usuario.getTelefono());
            otpService.generarYEnviarOtp(usuario.getTelefono());
        }

        return savedUser;
    }

    public java.util.List<Usuario> listarTodos() {
        return usuarioRepository.findAll();
    }

    public Usuario obtenerPorId(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario con ID " + id));
    }

    public java.util.List<Usuario> listarPorRol(Rol rol) {
        return usuarioRepository.findByRol(rol);
    }

    @Transactional
    public Usuario actualizarUsuario(Long id, ActualizarUsuarioRequest updates) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario con ID " + id));

        if (updates.getNombre() != null) usuario.setNombre(updates.getNombre());
        if (updates.getApellido() != null) usuario.setApellido(updates.getApellido());
        if (updates.getDni() != null) usuario.setDni(updates.getDni());
        if (updates.getTelefono() != null) usuario.setTelefono(updates.getTelefono());
        if (updates.getEstado() != null) usuario.setEstado(updates.getEstado());

        if (usuario.getRol() == Rol.ARRENDADOR && updates.getDetallesArrendador() != null) {
            arrendadorRepository.findByUsuario(usuario).ifPresent(a -> {
                DetallesArrendadorRequest det = updates.getDetallesArrendador();
                if (det.getTelefono() != null) a.setTelefono(det.getTelefono());
                if (det.getRuc() != null) a.setRuc(det.getRuc());
                if (det.getNombreComercial() != null) a.setNombreComercial(det.getNombreComercial());
                if (det.getDireccionCuartos() != null) a.setDireccionPropiedades(det.getDireccionCuartos());
                if (det.getLatitud() != null) a.setLatitud(det.getLatitud());
                if (det.getLongitud() != null) a.setLongitud(det.getLongitud());
                if (det.getEsEmpresa() != null) a.setEsEmpresa(det.getEsEmpresa());
                arrendadorRepository.save(a);
            });
        } else if (usuario.getRol() == Rol.ESTUDIANTE && updates.getDetallesEstudiante() != null) {
            estudianteRepository.findByUsuario(usuario).ifPresent(e -> {
                DetallesEstudianteRequest det = updates.getDetallesEstudiante();
                if (det.getUniversidad() != null) e.setUniversidad(det.getUniversidad());
                if (det.getCodigoEstudiante() != null) e.setCodigoEstudiante(det.getCodigoEstudiante());
                if (det.getCarrera() != null) e.setCarrera(det.getCarrera());
                if (det.getCiclo() != null) e.setCiclo(det.getCiclo());
                estudianteRepository.save(e);
            });
        }

        return usuarioRepository.save(usuario);
    }

    @Transactional
    public void eliminarUsuario(Long id) {
        if (!usuarioRepository.existsById(id)) {
            throw new RecursoNoEncontradoException("No se encontró el usuario con ID " + id);
        }
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
