package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.services.PermisoEnforcerService;
import com.alquilaya.serviciopropiedades.services.KafkaProducerService;
import com.alquilaya.serviciopropiedades.services.CloudinaryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.security.access.prepost.PreAuthorize;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/v1/propiedades")
@RequiredArgsConstructor
public class PropiedadController {

    private final PropiedadRepository propiedadRepository;
    private final KafkaProducerService kafkaProducerService;
    private final CloudinaryService cloudinaryService;

    @PostMapping(consumes = {"multipart/form-data"})
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<Propiedad> crearPropiedad(
            @RequestPart("propiedad") String propiedadJson,
            @RequestPart("file") MultipartFile file
    ) throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        mapper.findAndRegisterModules();
        Propiedad propiedad = mapper.readValue(propiedadJson, Propiedad.class);

        String urlFoto = cloudinaryService.uploadFile(file);
        propiedad.setImagenUrl(urlFoto);
        
        Propiedad nuevaPropiedad = propiedadRepository.save(propiedad);
        
        kafkaProducerService.enviarEventoPropiedad("Nueva propiedad creada con foto: " + nuevaPropiedad.getTitulo() + " (ID: " + nuevaPropiedad.getId() + ")");
        
        return ResponseEntity.ok(nuevaPropiedad);
    }

    @GetMapping
    @PreAuthorize("@permisoEnforcer.tienePermiso('VER_CUARTOS')")
    public ResponseEntity<List<Propiedad>> listarPropiedades() {
        return ResponseEntity.ok(propiedadRepository.findAll());
    }

    @GetMapping("/arrendador/{arrendadorId}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('VER_CUARTOS')")
    public ResponseEntity<List<Propiedad>> listarPorArrendador(@PathVariable Long arrendadorId) {
        return ResponseEntity.ok(propiedadRepository.findByArrendadorId(arrendadorId));
    }
}
