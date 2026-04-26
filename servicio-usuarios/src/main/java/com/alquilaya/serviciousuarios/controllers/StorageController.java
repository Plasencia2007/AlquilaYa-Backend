package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.entities.DocumentoVerificacion;
import com.alquilaya.serviciousuarios.exceptions.AccesoDenegadoException;
import com.alquilaya.serviciousuarios.repositories.DocumentoVerificacionRepository;
import com.alquilaya.serviciousuarios.services.StorageService;
import com.alquilaya.serviciousuarios.validaciones.anotaciones.NombreArchivoSeguro;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.MalformedURLException;
import java.nio.file.Path;

@RestController
@RequestMapping("/api/v1/storage")
@RequiredArgsConstructor
@Validated
@Slf4j
public class StorageController {

    private final StorageService storageService;
    private final DocumentoVerificacionRepository documentoRepository;

    @GetMapping("/{filename}")
    public ResponseEntity<Resource> serveFile(
            @PathVariable @NombreArchivoSeguro String filename,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        // Autorización: ADMIN accede a todo; el resto solo a documentos propios.
        boolean esAdmin = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals);

        if (!esAdmin) {
            DocumentoVerificacion doc = documentoRepository.findByArchivoUrl(filename)
                    .orElseThrow(() -> new AccesoDenegadoException("Recurso no disponible"));

            String emailCaller = authentication.getName();
            String emailPropietario = doc.getUsuario() != null ? doc.getUsuario().getCorreo() : null;
            if (emailPropietario == null || !emailPropietario.equalsIgnoreCase(emailCaller)) {
                log.warn("Usuario {} intentó acceder a documento ajeno {}", emailCaller, filename);
                throw new AccesoDenegadoException("No tienes permiso para acceder a este archivo");
            }
        }

        try {
            Path file = storageService.load(filename).normalize();
            Path root = storageService.getRootLocation().normalize().toAbsolutePath();

            // Verificación de seguridad contra Path Traversal
            if (!file.toAbsolutePath().startsWith(root)) {
                log.warn("Intento de acceso no autorizado a archivo fuera del root: {}", filename);
                throw new AccesoDenegadoException("El archivo solicitado está fuera del directorio permitido");
            }

            Resource resource = new UrlResource(file.toUri());

            if (resource.exists() || resource.isReadable()) {
                String contentType = "image/jpeg"; // Default
                String lowerName = filename.toLowerCase();
                if (lowerName.endsWith(".png")) contentType = "image/png";
                else if (lowerName.endsWith(".pdf")) contentType = "application/pdf";
                else if (lowerName.endsWith(".gif")) contentType = "image/gif";

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                        .body(resource);
            } else {
                log.debug("Archivo no encontrado o no legible: {}", filename);
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException e) {
            log.error("URL de archivo mal formada: {}", filename, e);
            return ResponseEntity.badRequest().build();
        }
    }
}
