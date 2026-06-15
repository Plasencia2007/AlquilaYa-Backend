package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.dto.DocumentoAdminDTO;
import com.alquilaya.serviciousuarios.entities.DocumentoVerificacion;
import com.alquilaya.serviciousuarios.entities.Estudiante;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.EstadoVerificacion;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.enums.TipoDocumento;
import com.alquilaya.serviciousuarios.exceptions.RecursoNoEncontradoException;
import com.alquilaya.serviciousuarios.kafka.UserEventProducer;
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
    private final CloudinaryDocumentService cloudinaryDocumentService;
    private final NotificationService notificationService;
    private final UserEventProducer userEventProducer;

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

        return documentoRepository.save(documento);
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

        recalcularVerificacionEstudiante(guardado.getUsuario(), nuevoEstado, comentario);

        // Notificar al usuario via WhatsApp
        enviarNotificacionStatus(guardado);

        return guardado;
    }

    /**
     * Recalcula el flag {@code Estudiante.verificado} a partir de los documentos
     * requeridos ({@link TipoDocumento#requeridos()}): todos APROBADOS → verificado.
     * Solo emite eventos Kafka (vía outbox, atómico con esta TX) cuando hay una
     * transición real del flag; re-aprobar un documento ya aprobado no re-emite.
     */
    private void recalcularVerificacionEstudiante(Usuario usuario, EstadoVerificacion nuevoEstado, String comentario) {
        if (usuario.getRol() != Rol.ESTUDIANTE) return;

        Estudiante estudiante = estudianteRepository.findByUsuario(usuario).orElse(null);
        if (estudiante == null) {
            log.warn("Usuario {} con rol ESTUDIANTE no tiene perfil Estudiante; no se recalcula verificación", usuario.getId());
            return;
        }

        List<DocumentoVerificacion> docs = documentoRepository.findByUsuario(usuario);
        boolean todosAprobados = TipoDocumento.requeridos().stream()
                .allMatch(tipo -> docs.stream().anyMatch(d ->
                        d.getTipoDocumento() == tipo
                        && d.getEstadoVerificacion() == EstadoVerificacion.APROBADO));

        String nombreCompleto = usuario.getNombre() + " " + usuario.getApellido();

        if (todosAprobados && !estudiante.isVerificado()) {
            estudiante.setVerificado(true);
            estudianteRepository.save(estudiante);
            log.info("✅ Estudiante {} (usuario {}) verificado: todos los documentos requeridos APROBADOS",
                    estudiante.getId(), usuario.getId());
            userEventProducer.emitirEventoAprobacion(
                    usuario.getId(), usuario.getCorreo(), nombreCompleto, usuario.getTelefono());
        } else if (!todosAprobados && estudiante.isVerificado()) {
            estudiante.setVerificado(false);
            estudianteRepository.save(estudiante);
            log.info("⚠️ Estudiante {} (usuario {}) pierde la verificación (documento pasó a {})",
                    estudiante.getId(), usuario.getId(), nuevoEstado);
            if (nuevoEstado == EstadoVerificacion.RECHAZADO) {
                userEventProducer.emitirEventoRechazo(
                        usuario.getId(), usuario.getCorreo(), nombreCompleto, usuario.getTelefono(),
                        comentario != null ? comentario : "Documento de verificación rechazado");
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
        recalcularVerificacionEstudiante(usuario, EstadoVerificacion.PENDIENTE, null);
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
}
