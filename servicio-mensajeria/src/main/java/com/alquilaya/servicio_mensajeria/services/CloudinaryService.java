package com.alquilaya.servicio_mensajeria.services;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

/**
 * Wrapper sobre el SDK de Cloudinary para adjuntos del chat (ítem 254). Mismo patrón
 * que {@code servicio-propiedades.CloudinaryService}: el frontend nunca sube directo a
 * Cloudinary, siempre pasa por este backend. A diferencia de propiedades (que organiza
 * por arrendador/cuarto con public_id determinista), aquí cada imagen es un adjunto
 * suelto de una conversación — no hay "slot" que sobrescribir, así que se deja que
 * Cloudinary genere un public_id único por subida.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryService {

    private static final String ROOT = "alquilaya/mensajeria/adjuntos";

    /** Mismo set que servicio-propiedades: solo imágenes rasterizadas comunes. */
    private static final Set<String> MIME_PERMITIDOS = Set.of("image/jpeg", "image/png", "image/webp");

    /**
     * Límite de negocio (validado aquí, con mensaje amigable -> 400). Se deja algo de
     * margen respecto al límite duro de Spring (`spring.servlet.multipart.max-file-size`,
     * configurado en 12MB) para que un archivo apenas por encima de 10MB caiga en ESTA
     * validación (IllegalArgumentException -> 400 vía GlobalExceptionHandler) en vez del
     * MaxUploadSizeExceededException genérico de Spring (que este servicio no mapea a un
     * status específico).
     */
    private static final long MAX_BYTES = 10L * 1024 * 1024;

    private final Cloudinary cloudinary;

    /**
     * Valida tipo MIME y tamaño de una imagen de chat. Lanza {@link IllegalArgumentException}
     * (400 vía GlobalExceptionHandler) si no pasa, con un mensaje listo para mostrar al usuario.
     */
    public void validar(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Debes adjuntar un archivo");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException(
                    "La imagen excede el tamaño máximo permitido de " + (MAX_BYTES / (1024 * 1024)) + " MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !MIME_PERMITIDOS.contains(contentType)) {
            throw new IllegalArgumentException("Solo se permiten imágenes JPG, PNG o WEBP");
        }
    }

    /**
     * Sube una imagen adjunta de una conversación y devuelve su URL segura.
     * Carpeta: alquilaya/mensajeria/adjuntos/conv-{conversacionId}/ — public_id
     * autogenerado (no hay slot fijo que sobrescribir, cada adjunto es independiente).
     */
    public String subirAdjuntoChat(MultipartFile file, Long conversacionId) throws IOException {
        validar(file);

        Map<String, Object> opciones = ObjectUtils.asMap(
                "folder", ROOT + "/conv-" + conversacionId,
                "resource_type", "image",
                "use_filename", false,
                "unique_filename", true,
                "overwrite", false
        );

        Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), opciones);
        String url = String.valueOf(result.get("secure_url"));
        log.debug("[Cloudinary] adjunto de chat subido: conv={} -> {}", conversacionId, url);
        return url;
    }
}
