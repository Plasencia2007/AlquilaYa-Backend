package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.entities.DocumentoVerificacion;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.EstadoVerificacion;
import com.alquilaya.serviciousuarios.enums.TipoDocumento;
import com.alquilaya.serviciousuarios.exceptions.RecursoNoEncontradoException;
import com.alquilaya.serviciousuarios.repositories.DocumentoVerificacionRepository;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import com.alquilaya.serviciousuarios.util.LogMask;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentoService {

    private final DocumentoVerificacionRepository documentoRepository;
    private final UsuarioRepository usuarioRepository;
    private final StorageService storageService;
    private final NotificationService notificationService;

    @Transactional
    public DocumentoVerificacion subirDocumento(Long usuarioId, TipoDocumento tipo, MultipartFile archivo) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario con ID " + usuarioId + " para subir el documento"));

        log.info("Subiendo documento tipo {} para el usuario {}", tipo, usuarioId);
        String nombreArchivo = storageService.store(archivo);

        DocumentoVerificacion documento = DocumentoVerificacion.builder()
                .usuario(usuario)
                .tipoDocumento(tipo)
                .archivoUrl(nombreArchivo)
                .estadoVerificacion(EstadoVerificacion.PENDIENTE)
                .build();

        return documentoRepository.save(documento);
    }

    public List<DocumentoVerificacion> obtenerDocumentosUsuario(Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario con ID " + usuarioId));
        return documentoRepository.findByUsuario(usuario);
    }

    public List<DocumentoVerificacion> listarPendientes() {
        return documentoRepository.findByEstadoVerificacion(EstadoVerificacion.PENDIENTE);
    }

    @Transactional
    public DocumentoVerificacion verificarDocumento(Long documentoId, EstadoVerificacion nuevoEstado, String comentario) {
        DocumentoVerificacion documento = documentoRepository.findById(documentoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el documento de verificación con ID " + documentoId));

        log.info("Verificando documento ID {}: cambiando estado a {}", documentoId, nuevoEstado);
        documento.setEstadoVerificacion(nuevoEstado);
        documento.setComentarioRechazo(comentario);
        DocumentoVerificacion guardado = documentoRepository.save(documento);

        // Notificar al usuario via WhatsApp
        enviarNotificacionStatus(guardado);

        return guardado;
    }

    public DocumentoVerificacion obtenerPorId(Long id) {
        return documentoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el documento con ID " + id));
    }

    @Transactional
    public void eliminarDocumento(Long id) {
        DocumentoVerificacion doc = obtenerPorId(id);
        // Opcional: eliminar el archivo físico del storage si se desea
        documentoRepository.delete(doc);
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
