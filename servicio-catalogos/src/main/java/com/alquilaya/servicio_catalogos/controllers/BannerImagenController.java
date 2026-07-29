package com.alquilaya.servicio_catalogos.controllers;

import com.alquilaya.servicio_catalogos.dto.UrlResponse;
import com.alquilaya.servicio_catalogos.services.CloudinaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Uploader de la imagen del banner del hero. El admin sube un archivo, el backend
 * lo sube a Cloudinary (carpeta {@code alquilaya/banners}) y devuelve la URL segura,
 * que el frontend guarda como `imagenUrl` del ítem BANNER.
 *
 * Ruta bajo {@code /api/v1/catalogos/admin/**}: ya exige ADMIN en SecurityConfig,
 * reforzado aquí con {@code @PreAuthorize}.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/catalogos/admin/banners")
@RequiredArgsConstructor
public class BannerImagenController {

    /** Tamaño máximo aceptado para la imagen del banner (5 MB). */
    private static final long MAX_BYTES = 5L * 1024 * 1024;

    private final CloudinaryService cloudinaryService;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping(value = "/imagen", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UrlResponse> subirImagen(@RequestParam("file") MultipartFile file) throws IOException {
        validar(file);
        String url = cloudinaryService.uploadFile(file);
        return ResponseEntity.ok(new UrlResponse(url));
    }

    /** Validaciones de negocio: archivo presente, tipo imagen y tamaño razonable. */
    private void validar(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("El archivo de imagen es obligatorio y no puede estar vacío.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new IllegalArgumentException("El archivo debe ser una imagen (JPG, PNG, WEBP, etc.).");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("La imagen supera el tamaño máximo permitido (5 MB).");
        }
    }
}
