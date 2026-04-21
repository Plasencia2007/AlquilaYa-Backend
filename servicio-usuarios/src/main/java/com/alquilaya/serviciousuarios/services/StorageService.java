package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.exceptions.ArchivoInvalidoException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@Slf4j
public class StorageService {

    @Value("${storage.location:uploads/documents}")
    private String storageLocation;

    private Path rootLocation;

    @PostConstruct
    public void init() {
        this.rootLocation = Paths.get(storageLocation);
        try {
            Files.createDirectories(rootLocation);
            log.info("Directorio de almacenamiento inicializado en: {}", rootLocation.toAbsolutePath());
        } catch (IOException e) {
            log.error("No se pudo inicializar el almacenamiento en {}", storageLocation, e);
            throw new ArchivoInvalidoException("No se pudo inicializar el almacenamiento de archivos");
        }
    }

    public String store(MultipartFile file) {
        String originalName = StringUtils.cleanPath(file.getOriginalFilename());
        try {
            if (file.isEmpty()) {
                throw new ArchivoInvalidoException("No se puede guardar un archivo vacío " + originalName);
            }
            
            String extension = "";
            if (originalName.contains(".")) {
                extension = originalName.substring(originalName.lastIndexOf("."));
            }
            
            String uniqueName = UUID.randomUUID().toString() + extension;
            
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, this.rootLocation.resolve(uniqueName),
                        StandardCopyOption.REPLACE_EXISTING);
            }
            
            log.debug("Archivo guardado exitosamente: {} -> {}", originalName, uniqueName);
            return uniqueName;
        } catch (IOException e) {
            log.error("Error al guardar el archivo {}", originalName, e);
            throw new ArchivoInvalidoException("Fallo al guardar el archivo " + originalName + ": " + e.getMessage());
        }
    }

    public Path load(String filename) {
        return rootLocation.resolve(filename);
    }

    public Path getRootLocation() {
        return this.rootLocation;
    }
}
