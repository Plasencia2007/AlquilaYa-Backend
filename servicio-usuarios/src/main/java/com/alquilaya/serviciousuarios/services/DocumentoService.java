package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.dto.ApiPeruDTOs;
import com.alquilaya.serviciousuarios.dto.DocumentoAdminDTO;
import com.alquilaya.serviciousuarios.entities.Arrendador;
import com.alquilaya.serviciousuarios.entities.DocumentoVerificacion;
import com.alquilaya.serviciousuarios.entities.Estudiante;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.EstadoVerificacion;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.enums.TipoDocumento;
import com.alquilaya.serviciousuarios.exceptions.RecursoNoEncontradoException;
import com.alquilaya.serviciousuarios.kafka.UserEventProducer;
import com.alquilaya.serviciousuarios.repositories.ArrendadorRepository;
import com.alquilaya.serviciousuarios.repositories.DocumentoVerificacionRepository;
import com.alquilaya.serviciousuarios.repositories.EstudianteRepository;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import com.alquilaya.serviciousuarios.util.LogMask;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentoService {

    private final DocumentoVerificacionRepository documentoRepository;
    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final ArrendadorRepository arrendadorRepository;
    private final CloudinaryDocumentService cloudinaryDocumentService;
    private final NotificationService notificationService;
    private final UserEventProducer userEventProducer;
    private final ApiPeruService apiPeruService;

    @Transactional
    public DocumentoVerificacion subirDocumento(Long usuarioId, TipoDocumento tipo, MultipartFile archivo) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario con ID " + usuarioId + " para subir el documento"));

        log.info("Subiendo documento tipo {} para el usuario {}", tipo, usuarioId);
        String archivoUrl;
        try {
            archivoUrl = cloudinaryDocumentService.subirDocumento(archivo, usuarioId, tipo.name());
        } catch (IOException e) {
            throw new RuntimeException("Error al subir el documento a Cloudinary", e);
        }

        DocumentoVerificacion documento = DocumentoVerificacion.builder()
                .usuario(usuario)
                .tipoDocumento(tipo)
                .archivoUrl(archivoUrl)
                .estadoVerificacion(EstadoVerificacion.PENDIENTE)
                .build();

        DocumentoVerificacion guardado = documentoRepository.save(documento);
        // Ítem 378 (PoC): notifica a los admins activos que hay un documento nuevo por revisar.
        userEventProducer.emitirEventoDocumentoSubido(guardado.getId(), usuario.getId(), usuario.getCorreo(),
                usuario.getNombre(), usuario.getApellido(), tipo.name());
        return guardado;
    }

    public List<DocumentoVerificacion> obtenerDocumentosUsuario(Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario con ID " + usuarioId));
        return documentoRepository.findByUsuario(usuario);
    }

    @Transactional(readOnly = true)
    public List<DocumentoAdminDTO> listarPendientes() {
        return documentoRepository.findByEstadoVerificacionConUsuario(EstadoVerificacion.PENDIENTE)
                .stream()
                .map(DocumentoAdminDTO::desde)
                .toList();
    }

    @Transactional
    public DocumentoVerificacion verificarDocumento(Long documentoId, EstadoVerificacion nuevoEstado, String comentario) {
        DocumentoVerificacion documento = documentoRepository.findById(documentoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el documento de verificación con ID " + documentoId));

        log.info("Verificando documento ID {}: cambiando estado a {}", documentoId, nuevoEstado);
        documento.setEstadoVerificacion(nuevoEstado);
        documento.setComentarioRechazo(comentario);
        DocumentoVerificacion guardado = documentoRepository.save(documento);

        recalcularVerificacion(guardado.getUsuario(), nuevoEstado, comentario);

        // Notificar al usuario via WhatsApp
        enviarNotificacionStatus(guardado);

        return guardado;
    }

    /**
     * Recalcula el flag {@code verificado} del perfil (Estudiante o Arrendador) a partir de los
     * documentos requeridos ({@link TipoDocumento#requeridos()}): todos APROBADOS → verificado.
     * Solo emite eventos Kafka (vía outbox, atómico con esta TX) cuando hay una transición real
     * del flag; re-aprobar un documento ya aprobado no re-emite. Despacha por rol (U3).
     */
    private void recalcularVerificacion(Usuario usuario, EstadoVerificacion nuevoEstado, String comentario) {
        if (usuario.getRol() == Rol.ESTUDIANTE) {
            recalcularVerificacionEstudiante(usuario, nuevoEstado, comentario);
        } else if (usuario.getRol() == Rol.ARRENDADOR) {
            recalcularVerificacionArrendador(usuario, nuevoEstado, comentario);
        }
    }

    /** True si TODOS los documentos requeridos del usuario están APROBADOS. */
    private boolean documentosRequeridosAprobados(Usuario usuario) {
        List<DocumentoVerificacion> docs = documentoRepository.findByUsuario(usuario);
        return TipoDocumento.requeridos().stream()
                .allMatch(tipo -> docs.stream().anyMatch(d ->
                        d.getTipoDocumento() == tipo
                        && d.getEstadoVerificacion() == EstadoVerificacion.APROBADO));
    }

    private void recalcularVerificacionEstudiante(Usuario usuario, EstadoVerificacion nuevoEstado, String comentario) {
        Estudiante estudiante = estudianteRepository.findByUsuario(usuario).orElse(null);
        if (estudiante == null) {
            log.warn("Usuario {} con rol ESTUDIANTE no tiene perfil Estudiante; no se recalcula verificación", usuario.getId());
            return;
        }
        boolean todosAprobados = documentosRequeridosAprobados(usuario);
        String nombreCompleto = usuario.getNombre() + " " + usuario.getApellido();

        if (todosAprobados && !estudiante.isVerificado()) {
            estudiante.setVerificado(true);
            estudianteRepository.save(estudiante);
            log.info("✅ Estudiante {} (usuario {}) verificado: documentos requeridos APROBADOS",
                    estudiante.getId(), usuario.getId());
            userEventProducer.emitirEventoAprobacion(
                    usuario.getId(), usuario.getCorreo(), nombreCompleto, usuario.getTelefono(), "ESTUDIANTE");
        } else if (!todosAprobados && estudiante.isVerificado()) {
            estudiante.setVerificado(false);
            estudianteRepository.save(estudiante);
            log.info("⚠️ Estudiante {} (usuario {}) pierde la verificación (documento pasó a {})",
                    estudiante.getId(), usuario.getId(), nuevoEstado);
            if (nuevoEstado == EstadoVerificacion.RECHAZADO) {
                userEventProducer.emitirEventoRechazo(
                        usuario.getId(), usuario.getCorreo(), nombreCompleto, usuario.getTelefono(),
                        comentario != null ? comentario : "Documento de verificación rechazado", "ESTUDIANTE");
            }
        }
    }

    private void recalcularVerificacionArrendador(Usuario usuario, EstadoVerificacion nuevoEstado, String comentario) {
        Arrendador arrendador = arrendadorRepository.findByUsuario(usuario).orElse(null);
        if (arrendador == null) {
            log.warn("Usuario {} con rol ARRENDADOR no tiene perfil Arrendador; no se recalcula verificación", usuario.getId());
            return;
        }
        boolean todosAprobados = documentosRequeridosAprobados(usuario);
        String nombreCompleto = usuario.getNombre() + " " + usuario.getApellido();

        if (todosAprobados && !arrendador.isVerificado()) {
            arrendador.setVerificado(true);
            arrendadorRepository.save(arrendador);
            log.info("✅ Arrendador {} (usuario {}) verificado: documentos requeridos APROBADOS",
                    arrendador.getId(), usuario.getId());
            userEventProducer.emitirEventoAprobacion(
                    usuario.getId(), usuario.getCorreo(), nombreCompleto, usuario.getTelefono(), "ARRENDADOR");
        } else if (!todosAprobados && arrendador.isVerificado()) {
            arrendador.setVerificado(false);
            arrendadorRepository.save(arrendador);
            log.info("⚠️ Arrendador {} (usuario {}) pierde la verificación (documento pasó a {})",
                    arrendador.getId(), usuario.getId(), nuevoEstado);
            if (nuevoEstado == EstadoVerificacion.RECHAZADO) {
                userEventProducer.emitirEventoRechazo(
                        usuario.getId(), usuario.getCorreo(), nombreCompleto, usuario.getTelefono(),
                        comentario != null ? comentario : "Documento de verificación rechazado", "ARRENDADOR");
            }
        }
    }

    public DocumentoVerificacion obtenerPorId(Long id) {
        return documentoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el documento con ID " + id));
    }

    @Transactional
    public void eliminarDocumento(Long id) {
        DocumentoVerificacion doc = obtenerPorId(id);
        Usuario usuario = doc.getUsuario();
        cloudinaryDocumentService.eliminarDocumento(doc.getArchivoUrl());
        documentoRepository.delete(doc);
        documentoRepository.flush(); // el recálculo debe ver el documento ya eliminado
        recalcularVerificacion(usuario, EstadoVerificacion.PENDIENTE, null);
        log.info("Documento {} eliminado", id);
    }

    private void enviarNotificacionStatus(DocumentoVerificacion doc) {
        String telefono = doc.getUsuario().getTelefono();
        if (telefono == null || telefono.isEmpty()) {
            log.warn("No se pudo enviar notificación: el usuario {} no tiene teléfono registrado", doc.getUsuario().getId());
            return;
        }

        String estadoStr = doc.getEstadoVerificacion() == EstadoVerificacion.APROBADO ? "APROBADO ✅" : "RECHAZADO ❌";
        String mensaje = String.format(
            "*AlquilaYa* 🏠\n\nActualización de verificación:\nTu documento *%s* ha sido *%s*.\n%s",
            doc.getTipoDocumento().name(),
            estadoStr,
            doc.getEstadoVerificacion() == EstadoVerificacion.RECHAZADO ? "\nMotivo: " + doc.getComentarioRechazo() : "\n¡Felicidades! Ya estás un paso más cerca de ser un usuario verificado."
        );

        log.debug("Enviando notificación de documento {} a {}", doc.getEstadoVerificacion(), LogMask.phone(telefono));
        notificationService.enviarMensajeWhatsApp(telefono, mensaje);
    }

    @Transactional
    public Usuario verificarDniInstantaneo(Long usuarioId, String dni) {
        // 1. Consultar ApiPeru
        ApiPeruDTOs.DniResponse apiPeruRes = apiPeruService.consultarDni(dni);
        if (!apiPeruRes.isSuccess() || apiPeruRes.getData() == null) {
            throw new IllegalArgumentException(apiPeruRes.getMessage() != null ? apiPeruRes.getMessage() : "No se pudo validar el DNI.");
        }

        ApiPeruDTOs.DniData data = apiPeruRes.getData();
        String nombresCompletosApi = (data.getNombreCompleto() != null ? data.getNombreCompleto() : "").toLowerCase().trim();

        // 2. Obtener usuario
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario con ID " + usuarioId));

        // 3. Validar coincidencia de nombre (insensible a acentos/mayúsculas)
        String nombreUser = (usuario.getNombre() != null ? usuario.getNombre() : "").toLowerCase().trim();
        String apellidoUser = (usuario.getApellido() != null ? usuario.getApellido() : "").toLowerCase().trim();

        // Limpiar acentos para mayor flexibilidad
        String nombreUserClean = normalizarTexto(nombreUser);
        String apellidoUserClean = normalizarTexto(apellidoUser);
        String nombresCompletosApiClean = normalizarTexto(nombresCompletosApi);

        // Validar si el nombre y el apellido del usuario están contenidos en la respuesta de RENIEC
        boolean coincideNombre = nombresCompletosApiClean.contains(nombreUserClean);
        boolean coincideApellido = nombresCompletosApiClean.contains(apellidoUserClean);

        if (!coincideNombre || !coincideApellido) {
            log.warn("El nombre del usuario '{} {}' no coincide con el DNI consultado en RENIEC '{}'",
                    usuario.getNombre(), usuario.getApellido(), data.getNombreCompleto());
            throw new IllegalArgumentException("El DNI consultado pertenece a otra persona ('" + data.getNombreCompleto() + "'). " +
                    "Por favor, verifica que tu DNI sea correcto o actualiza tu nombre en tu perfil.");
        }

        // 4. Si coincide: Guardar DNI
        usuario.setDni(dni);
        usuarioRepository.save(usuario);

        // 5. Crear registros virtuales y marcarlos como aprobados para DNI_FRONTAL y DNI_REVERSO
        crearDocumentoAprobadoVirtual(usuario, TipoDocumento.DNI_FRONTAL, "Instantáneo (RENIEC)");
        crearDocumentoAprobadoVirtual(usuario, TipoDocumento.DNI_REVERSO, "Instantáneo (RENIEC)");

        // 6. Recalcular la verificación del estudiante
        recalcularVerificacion(usuario, EstadoVerificacion.APROBADO, "Verificación instantánea por DNI.");

        return usuario;
    }

    private void crearDocumentoAprobadoVirtual(Usuario usuario, TipoDocumento tipo, String metadata) {
        // Eliminar si ya existe uno anterior
        List<DocumentoVerificacion> existentes = documentoRepository.findByUsuario(usuario);
        existentes.stream()
                .filter(d -> d.getTipoDocumento() == tipo)
                .forEach(d -> {
                    try {
                        cloudinaryDocumentService.eliminarDocumento(d.getArchivoUrl());
                    } catch (Exception e) {
                        // ignore
                    }
                    documentoRepository.delete(d);
                });
        documentoRepository.flush();

        DocumentoVerificacion doc = DocumentoVerificacion.builder()
                .usuario(usuario)
                .tipoDocumento(tipo)
                .archivoUrl("verificacion-digital-auto-" + metadata) // URL marcador virtual
                .estadoVerificacion(EstadoVerificacion.APROBADO)
                .comentarioRechazo(null)
                .build();
        documentoRepository.save(doc);
    }

    private String normalizarTexto(String str) {
        if (str == null) return "";
        return str.toLowerCase()
                .replace("á", "a")
                .replace("é", "e")
                .replace("í", "i")
                .replace("ó", "o")
                .replace("ú", "u")
                .replace("ñ", "n")
                .replaceAll("[^a-z0-9 ]", "")
                .trim();
    }
}
