package com.alquilaya.serviciousuarios.services;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Sube documentos de verificación a Cloudinary bajo la carpeta:
 *   alquilaya/usuarios/{usuarioId}/documentos/{tipo}
 *
 * El public_id es determinista → re-subir el mismo tipo para el mismo usuario
 * sobrescribe el archivo anterior sin acumular huérfanos.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryDocumentService {

    private static final String ROOT = "alquilaya/usuarios";

    private final Cloudinary cloudinary;

    public String subirDocumento(MultipartFile archivo, Long usuarioId, String tipo) throws IOException {
        String folder = ROOT + "/" + usuarioId + "/documentos";
        String publicId = tipo.toLowerCase();

        Map<String, Object> opciones = new HashMap<>();
        opciones.put("folder", folder);
        opciones.put("public_id", publicId);
        opciones.put("overwrite", true);
        opciones.put("resource_type", "auto");
        opciones.put("use_filename", false);
        opciones.put("unique_filename", false);

        Map<?, ?> result = cloudinary.uploader().upload(archivo.getBytes(), opciones);
        String url = String.valueOf(result.get("secure_url"));
        log.debug("[Cloudinary] documento subido: {}/{} -> {}", folder, publicId, url);
        return url;
    }

    public void eliminarDocumento(String archivoUrl) {
        if (archivoUrl == null || archivoUrl.isBlank() || !archivoUrl.startsWith("http")) return;
        try {
            String publicId = extraerPublicId(archivoUrl);
            if (publicId == null) return;
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", "image"));
            log.debug("[Cloudinary] documento eliminado: {}", publicId);
        } catch (Exception e) {
            log.warn("[Cloudinary] fallo eliminando {}: {}", archivoUrl, e.getMessage());
        }
    }

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
