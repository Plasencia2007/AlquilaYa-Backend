package com.alquilaya.servicio_catalogos.services;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * Wrapper sobre el SDK de Cloudinary para catálogos. Las imágenes de banners del
 * hero se guardan bajo la carpeta lógica {@code alquilaya/banners} para no
 * mezclarlas con las fotos de propiedades. Devuelve la {@code secure_url}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryService {

    /** Carpeta lógica en Cloudinary donde viven las imágenes de banners. */
    public static final String CARPETA_BANNERS = "alquilaya/banners";

    private final Cloudinary cloudinary;

    /**
     * Sube un archivo de imagen a la carpeta de banners y devuelve su URL segura.
     *
     * @param file archivo multipart (ya validado por el controlador).
     * @return la {@code secure_url} de la imagen subida.
     * @throws IOException si falla la lectura del archivo o la subida.
     */
    public String uploadFile(MultipartFile file) throws IOException {
        Map<?, ?> resultado = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder", CARPETA_BANNERS,
                        "resource_type", "image"));
        String url = String.valueOf(resultado.get("secure_url"));
        log.debug("[Cloudinary] banner subido -> {}", url);
        return url;
    }
}
