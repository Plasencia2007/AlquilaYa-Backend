package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.services.PermisoEnforcerService;
import com.alquilaya.serviciopropiedades.services.KafkaProducerService;
import com.alquilaya.serviciopropiedades.services.CloudinaryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.security.access.prepost.PreAuthorize;
import java.io.IOException;
import java.util.List;

@Slf4j
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
        log.info("[POST] Archivo: {} ({} bytes)", file.getOriginalFilename(), file.getSize());

        ObjectMapper mapper = new ObjectMapper();
        mapper.findAndRegisterModules();
        Propiedad propiedad = mapper.readValue(propiedadJson, Propiedad.class);

        String urlFoto = cloudinaryService.uploadFile(file);
        propiedad.setImagenUrl(urlFoto);

        Propiedad nuevaPropiedad = propiedadRepository.save(propiedad);
        kafkaProducerService.enviarEventoPropiedad("Nueva propiedad creada: " + nuevaPropiedad.getTitulo() + " (ID: " + nuevaPropiedad.getId() + ")");

        log.info("[POST] Propiedad creada con ID: {}", nuevaPropiedad.getId());
        return ResponseEntity.ok(nuevaPropiedad);
    }

    @GetMapping
    @PreAuthorize("@permisoEnforcer.tienePermiso('VER_CUARTOS')")
    public ResponseEntity<List<Propiedad>> listarPropiedades() {
        log.debug("[GET] Listando propiedades");
        return ResponseEntity.ok(propiedadRepository.findAll());
    }

    @GetMapping("/arrendador/{arrendadorId}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('VER_CUARTOS')")
    public ResponseEntity<List<Propiedad>> listarPorArrendador(@PathVariable Long arrendadorId) {
        return ResponseEntity.ok(propiedadRepository.findByArrendadorId(arrendadorId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<Propiedad> actualizarPropiedad(@PathVariable Long id, @RequestBody Propiedad updates) {
        return propiedadRepository.findById(id)
                .map(p -> {
                    if (updates.getTitulo() != null) p.setTitulo(updates.getTitulo());
                    if (updates.getDescripcion() != null) p.setDescripcion(updates.getDescripcion());
                    if (updates.getPrecio() != null) p.setPrecio(updates.getPrecio());
                    // Otros campos...
                    return ResponseEntity.ok(propiedadRepository.save(p));
                }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<Void> eliminarPropiedad(@PathVariable Long id) {
        propiedadRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
