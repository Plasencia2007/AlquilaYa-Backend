package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.entities.DocumentoVerificacion;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.EstadoVerificacion;
import com.alquilaya.serviciousuarios.enums.TipoDocumento;
import com.alquilaya.serviciousuarios.repositories.DocumentoVerificacionRepository;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DocumentoService {

    private final DocumentoVerificacionRepository documentoRepository;
    private final UsuarioRepository usuarioRepository;
    private final StorageService storageService;
    private final NotificationService notificationService;

    @Transactional
    public DocumentoVerificacion subirDocumento(Long usuarioId, TipoDocumento tipo, MultipartFile archivo) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        // 1. Guardar archivo físicamente
        String nombreArchivo = storageService.store(archivo);

        // 2. Crear registro en BD
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
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return documentoRepository.findByUsuario(usuario);
    }

    public List<DocumentoVerificacion> listarPendientes() {
        return documentoRepository.findByEstadoVerificacion(EstadoVerificacion.PENDIENTE);
    }

    @Transactional
    public DocumentoVerificacion verificarDocumento(Long documentoId, EstadoVerificacion nuevoEstado, String comentario) {
        DocumentoVerificacion documento = documentoRepository.findById(documentoId)
                .orElseThrow(() -> new RuntimeException("Documento no encontrado"));

        documento.setEstadoVerificacion(nuevoEstado);
        documento.setComentarioRechazo(comentario);
        DocumentoVerificacion guardado = documentoRepository.save(documento);

        // Notificar al usuario via WhatsApp
        enviarNotificacionStatus(guardado);

        return guardado;
    }

    private void enviarNotificacionStatus(DocumentoVerificacion doc) {
        String telefono = doc.getUsuario().getTelefono();
        if (telefono == null || telefono.isEmpty()) return;

        String estadoStr = doc.getEstadoVerificacion() == EstadoVerificacion.APROBADO ? "APROBADO ✅" : "RECHAZADO ❌";
        String mensaje = String.format(
            "*AlquilaYa* 🏠\n\nActualización de verificación:\nTu documento *%s* ha sido *%s*.\n%s",
            doc.getTipoDocumento().name(),
            estadoStr,
            doc.getEstadoVerificacion() == EstadoVerificacion.RECHAZADO ? "\nMotivo: " + doc.getComentarioRechazo() : "\n¡Felicidades! Ya estás un paso más cerca de ser un usuario verificado."
        );

        notificationService.enviarMensajeWhatsApp(telefono, mensaje);
    }
}
