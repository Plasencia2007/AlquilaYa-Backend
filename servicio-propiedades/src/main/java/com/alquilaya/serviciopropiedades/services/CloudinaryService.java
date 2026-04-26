package com.alquilaya.serviciopropiedades.services;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.text.Normalizer;
import java.util.HashMap;
import java.util.Map;

/**
 * Wrapper sobre el SDK de Cloudinary. Las imágenes de propiedades se organizan
 * en carpetas por arrendador y por cuarto:
 *
 *   alquilaya/arrendadores/{arrendadorId}-{nombre-slug}/cuarto-{propiedadId}/img-{idx}
 *
 * El `public_id` es determinista (sin timestamp) → re-subir la misma posición
 * sobrescribe la imagen previa en lugar de acumular huérfanos.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryService {

    public static final String ROOT = "alquilaya";

    private final Cloudinary cloudinary;

    /** Upload simple sin organización (legacy — solo para casos no atribuibles). */
    public String uploadFile(MultipartFile file) throws IOException {
        Map<?, ?> uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.emptyMap());
        return uploadResult.get("secure_url").toString();
    }

    /**
     * Sube la imagen N de un cuarto bajo la carpeta del arrendador.
     * - `arrendadorId`: requerido. Si `nombreArrendador` viene null, la carpeta
     *    queda solo con el ID.
     * - `propiedadId`: requerido.
     * - `indice`: posición de la imagen (0-based) — se usa como public_id.
     * - `overwrite=true` para sobrescribir si existe (caso re-subida).
     */
    public String uploadImagenCuarto(MultipartFile file,
                                     Long arrendadorId,
                                     String nombreArrendador,
                                     Long propiedadId,
                                     int indice) throws IOException {
        String folder = construirCarpeta(arrendadorId, nombreArrendador, propiedadId);
        String publicId = "img-" + indice;

        Map<String, Object> opciones = new HashMap<>();
        opciones.put("folder", folder);
        opciones.put("public_id", publicId);
        opciones.put("overwrite", true);
        opciones.put("resource_type", "image");
        opciones.put("use_filename", false);
        opciones.put("unique_filename", false);

        Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), opciones);
        String url = String.valueOf(result.get("secure_url"));
        log.debug("[Cloudinary] subido: {}/{} -> {}", folder, publicId, url);
        return url;
    }

    /**
     * Borra una imagen específica por la URL devuelta. Best-effort: log el
     * resultado pero no falla si Cloudinary devuelve "not found".
     */
    public void eliminarPorUrl(String url) {
        if (url == null || url.isBlank()) return;
        try {
            String publicId = extraerPublicId(url);
            if (publicId == null) return;
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", "image"));
            log.debug("[Cloudinary] borrado: {}", publicId);
        } catch (Exception e) {
            log.warn("[Cloudinary] fallo borrando {}: {}", url, e.getMessage());
        }
    }

    /**
     * Construye la ruta de carpeta para un cuarto:
     *   alquilaya/arrendadores/{id}-{slug}/cuarto-{propiedadId}
     */
    public static String construirCarpeta(Long arrendadorId, String nombreArrendador, Long propiedadId) {
        StringBuilder sb = new StringBuilder(ROOT).append("/arrendadores/");
        sb.append(arrendadorId);
        String slug = slugify(nombreArrendador);
        if (!slug.isEmpty()) sb.append('-').append(slug);
        sb.append("/cuarto-").append(propiedadId);
        return sb.toString();
    }

    /**
     * Convierte un nombre a slug ASCII seguro:
     *   "María Pérez Ñoño" -> "maria-perez-nono"
     */
    public static String slugify(String input) {
        if (input == null) return "";
        String normalizado = Normalizer.normalize(input.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replace('ñ', 'n').replace('Ñ', 'N');
        String slug = normalizado.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return slug.length() > 60 ? slug.substring(0, 60) : slug;
    }

    /**
     * Extrae el public_id (con folder) de una URL de Cloudinary.
     *   https://res.cloudinary.com/.../upload/v123/folder/sub/img-0.jpg
     *     -> folder/sub/img-0
     */
    static String extraerPublicId(String url) {
        int idx = url.indexOf("/upload/");
        if (idx < 0) return null;
        String resto = url.substring(idx + "/upload/".length());
        if (resto.startsWith("v") && resto.contains("/")) {
            resto = resto.substring(resto.indexOf('/') + 1);
        }
        int dot = resto.lastIndexOf('.');
        return dot > 0 ? resto.substring(0, dot) : resto;
    }
}
