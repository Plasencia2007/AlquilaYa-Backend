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
import com.alquilaya.serviciousuarios.exceptions.DniYaRegistradoException;
import com.alquilaya.serviciousuarios.exceptions.TelefonoYaRegistradoException;
import com.alquilaya.serviciousuarios.exceptions.CredencialesInvalidasException;
import com.alquilaya.serviciousuarios.exceptions.RecursoNoEncontradoException;
import com.alquilaya.serviciousuarios.util.LogMask;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
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
    private final ConfiguracionAuthService configuracionAuthService;
    private final CloudinaryDocumentService cloudinaryDocumentService;
    private final SesionService sesionService;
    private final RefreshTokenService refreshTokenService;
    private final com.alquilaya.serviciousuarios.repositories.DocumentoVerificacionRepository documentoVerificacionRepository;

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

        log.info("Registrando nuevo administrador: {}", LogMask.email(request.getCorreo()));
        return usuarioRepository.save(admin);
    }

    @Transactional
    public Usuario registrarUsuario(RegisterRequest request) {
        if (usuarioRepository.existsByCorreo(request.getCorreo())) {
            throw new CorreoYaRegistradoException("El correo " + request.getCorreo() + " ya está registrado en AlquilaYa. Si ya tienes cuenta, intenta iniciar sesión.");
        }

        // El teléfono es la clave del OTP (login/verificación), debe ser único.
        // Sin esto se crean cuentas duplicadas y findByTelefono lanza NonUniqueResultException al verificar.
        if (request.getTelefono() != null && usuarioRepository.existsByTelefono(request.getTelefono())) {
            throw new TelefonoYaRegistradoException("El teléfono " + request.getTelefono() + " ya está registrado en AlquilaYa. Si ya tienes cuenta, intenta iniciar sesión.");
        }

        // El DNI identifica a la persona: una persona = una cuenta (#8). Excluye el placeholder
        // "00000000" de las cuentas creadas por Google.
        if (request.getDni() != null && !request.getDni().isBlank()
                && !"00000000".equals(request.getDni())
                && usuarioRepository.existsByDni(request.getDni())) {
            throw new DniYaRegistradoException("El DNI " + request.getDni() + " ya está registrado en AlquilaYa. Si ya tienes cuenta, inicia sesión.");
        }

        Rol rol = Rol.valueOf(request.getRol().toUpperCase());

        // Defensa en profundidad: aunque el DTO ya restringe el rol, nunca se permite
        // crear un ADMIN desde el registro público. Los ADMIN se crean vía /register-admin
        // (protegido con @PreAuthorize) o por semilla inicial.
        if (rol == Rol.ADMIN) {
            throw new IllegalArgumentException("No se puede registrar una cuenta ADMIN desde el registro público");
        }

        Usuario usuario = Usuario.builder()
                .nombre(request.getNombre())
                .apellido(request.getApellido())
                .dni(request.getDni())
                .correo(request.getCorreo())
                .telefono(request.getTelefono())
                .password(passwordEncoder.encode(request.getPassword()))
                .rol(rol)
                .estado(EstadoUsuario.PENDING)
                .telefonoVerificado(false)
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
        }

        // Envía OTP solo si el método de verificación elegido por el admin exige teléfono (#3).
        if (usuario.getTelefono() != null
                && configuracionAuthService.getMetodo().requiereTelefono()) {
            log.debug("Enviando OTP a {}", LogMask.phone(usuario.getTelefono()));
            otpService.generarYEnviarOtp(usuario.getTelefono());
        }

        return savedUser;
    }

    public java.util.List<Usuario> listarTodos() {
        // Excluye cuentas dadas de baja/anonimizadas (GDPR, G8-B).
        return usuarioRepository.findByEliminadoFalse();
    }

    public Usuario obtenerPorId(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario con ID " + id));
    }

    public java.util.List<Usuario> listarPorRol(Rol rol) {
        // Excluye cuentas dadas de baja/anonimizadas (GDPR, G8-B).
        return usuarioRepository.findByRolAndEliminadoFalse(rol);
    }

    public java.util.List<com.alquilaya.serviciousuarios.dto.AdminArrendadorDTO> listarArrendadoresAdmin() {
        return usuarioRepository.findByRolAndEliminadoFalse(Rol.ARRENDADOR).stream()
                .map(u -> {
                    com.alquilaya.serviciousuarios.entities.Arrendador a = u.getArrendador();
                    return new com.alquilaya.serviciousuarios.dto.AdminArrendadorDTO(
                            u.getId(),
                            u.getNombre(),
                            u.getApellido(),
                            u.getCorreo(),
                            u.getDni(),
                            u.getTelefono(),
                            u.isTelefonoVerificado(),
                            u.getFotoUrl(),
                            u.getEstado().name(),
                            u.getFechaCreacion(),
                            a != null ? a.getCalificacion() : null,
                            a != null ? a.getNombreComercial() : null,
                            a != null ? a.getId() : null
                    );
                }).toList();
    }

    @Transactional
    public Usuario actualizarUsuario(Long id, ActualizarUsuarioRequest updates) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario con ID " + id));

        if (updates.getNombre() != null) usuario.setNombre(updates.getNombre());
        if (updates.getApellido() != null) usuario.setApellido(updates.getApellido());
        if (updates.getDni() != null) usuario.setDni(updates.getDni());
        // Si el teléfono cambia, se invalida la verificación (el número nuevo debe re-verificarse) (U6).
        if (updates.getTelefono() != null && !updates.getTelefono().equals(usuario.getTelefono())) {
            usuario.setTelefono(updates.getTelefono());
            usuario.setTelefonoVerificado(false);
        }
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

    /**
     * Baja de cuenta por ANONIMIZACIÓN (GDPR, G8-B). Se prefiere sobre el borrado físico:
     * reservas/pagos/mensajes viven en otros servicios (FKs lógicas vía Feign/Kafka, no en BD),
     * así que un DELETE dejaría huérfanos allí. En su lugar se borra el PII y se marca la cuenta
     * como eliminada, de modo que quede inutilizable pero sin romper referencias cruzadas.
     *
     * <p>Cubre: documentos KYC (fila + asset en Cloudinary, best-effort), PII de la cuenta,
     * PII de contacto del perfil Arrendador/Estudiante, y revocación de todas las sesiones.
     * Idempotente: si ya está eliminada, no hace nada.</p>
     *
     * <p><b>Alcance:</b> sólo anonimiza datos de ESTE servicio. Los datos en propiedades/pagos/
     * mensajería (p. ej. historial de reservas, mensajes) NO se tocan desde aquí; su borrado/
     * anonimización sería un follow-up vía evento Kafka de "usuario eliminado".</p>
     */
    @Transactional
    public void anonimizarCuenta(Long id) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario con ID " + id));

        if (u.isEliminado()) {
            log.info("Cuenta {} ya estaba anonimizada; no-op.", id);
            return;
        }

        // 1) Documentos KYC: borra la fila y (best-effort) el asset en Cloudinary.
        java.util.List<com.alquilaya.serviciousuarios.entities.DocumentoVerificacion> docs =
                documentoVerificacionRepository.findByUsuario(u);
        for (com.alquilaya.serviciousuarios.entities.DocumentoVerificacion d : docs) {
            try {
                cloudinaryDocumentService.eliminarDocumento(d.getArchivoUrl());
            } catch (Exception e) {
                log.warn("[GDPR] No se pudo eliminar documento en Cloudinary (usuario {}): {}", id, e.getMessage());
            }
        }
        documentoVerificacionRepository.deleteAll(docs);

        // 2) PII de contacto del perfil (mismo servicio).
        arrendadorRepository.findByUsuario(u).ifPresent(a -> {
            a.setTelefono(null);
            a.setRuc(null);
            a.setNombreComercial(null);
            a.setDireccionPropiedades(null);
            a.setVerificado(false);
            arrendadorRepository.save(a);
        });
        estudianteRepository.findByUsuario(u).ifPresent(e -> {
            e.setBio(null);
            e.setInstagram(null);
            e.setCodigoEstudiante(null);
            e.setVerificado(false);
            e.setBuscaCompaneros(false); // no debe seguir apareciendo en el board de roommates
            estudianteRepository.save(e);
        });

        // 3) PII de la cuenta. dni es NOT NULL en BD → placeholder '00000000' (excluido del
        //    índice único ux_usuarios_dni); no se puede setear a NULL sin alterar la columna.
        u.setNombre("Usuario");
        u.setApellido("eliminado");
        u.setCorreo("deleted-" + id + "@removed.local"); // el correo real queda liberado
        u.setTelefono(null);
        u.setTelefonoVerificado(false);
        u.setEmailVerificado(false);
        u.setDni("00000000");
        u.setFotoUrl(null);
        u.setFechaNacimiento(null);
        // Hash inutilizable: aunque no se bloqueara el login, la contraseña deja de ser válida.
        u.setPassword(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
        u.setEstado(EstadoUsuario.BANNED); // estado terminal (bloquea acceso); el gate real es `eliminado`.
        u.setEliminado(true);
        u.setFechaEliminacion(java.time.LocalDateTime.now());
        usuarioRepository.save(u);

        // 4) Revoca todas las sesiones activas (reutiliza #10) y refresh tokens (G7).
        sesionService.revocarTodas(id);
        refreshTokenService.revocarTodas(id);

        log.warn("[GDPR] Cuenta {} anonimizada/dada de baja.", id);
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

    /** Recarga el usuario por teléfono (p. ej. tras verificar el OTP, para emitir su token). U1. */
    public Optional<Usuario> buscarPorTelefono(String telefono) {
        return usuarioRepository.findByTelefono(telefono);
    }

    public boolean verificarPassword(String passwordPlana, String passwordHashed) {
        return passwordEncoder.matches(passwordPlana, passwordHashed);
    }

    @Transactional
    public void cambiarPassword(Long id, String passwordActual, String nuevaPassword) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario con ID " + id));
        if (!passwordEncoder.matches(passwordActual, usuario.getPassword())) {
            throw new CredencialesInvalidasException("La contraseña actual es incorrecta");
        }
        usuario.setPassword(passwordEncoder.encode(nuevaPassword));
        usuarioRepository.save(usuario);
        // Revocar todas las sesiones y refresh tokens (G7) tras cambiar la contraseña.
        sesionService.revocarTodas(id);
        refreshTokenService.revocarTodas(id);
    }

    @Transactional
    public String subirFotoPerfil(Long id, MultipartFile archivo) throws IOException {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario con ID " + id));
        String url = cloudinaryDocumentService.subirAvatar(archivo, id);
        usuario.setFotoUrl(url);
        usuarioRepository.save(usuario);
        log.info("Foto de perfil actualizada para usuario ID: {}", id);
        return url;
    }
}
