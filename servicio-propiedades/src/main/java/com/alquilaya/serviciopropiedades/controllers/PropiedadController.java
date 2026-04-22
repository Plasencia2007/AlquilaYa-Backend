package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.dto.PropiedadCompletoDTO;
import com.alquilaya.serviciopropiedades.dto.PropiedadPublicoDTO;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.entities.PropiedadImagen;
import com.alquilaya.serviciopropiedades.enums.PeriodoAlquiler;
import com.alquilaya.serviciopropiedades.enums.TipoPropiedad;
import com.alquilaya.serviciopropiedades.repositories.PropiedadImagenRepository;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.services.CloudinaryService;
import com.alquilaya.serviciopropiedades.services.KafkaProducerService;
import com.alquilaya.serviciopropiedades.services.PropiedadService;
import com.alquilaya.serviciopropiedades.validaciones.anotaciones.ArchivoImagenValido;
import com.alquilaya.serviciopropiedades.validaciones.validators.ArchivoImagenValidoValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/propiedades")
@RequiredArgsConstructor
@Validated
public class PropiedadController {

    private final PropiedadRepository propiedadRepository;
    private final PropiedadImagenRepository propiedadImagenRepository;
    private final KafkaProducerService kafkaProducerService;
    private final CloudinaryService cloudinaryService;
    private final PropiedadService propiedadService;

    // ===== Creación / listado básico =====

    @PostMapping(consumes = {"multipart/form-data"})
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<Propiedad> crearPropiedad(
            @RequestPart("propiedad") String propiedadJson,
            @RequestPart(value = "file", required = false) @ArchivoImagenValido MultipartFile file
    ) throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        mapper.findAndRegisterModules();
        Propiedad propiedad = mapper.readValue(propiedadJson, Propiedad.class);

        if (file != null && !file.isEmpty()) {
            log.info("[POST] Archivo: {} ({} bytes)", file.getOriginalFilename(), file.getSize());
            String urlFoto = cloudinaryService.uploadFile(file);
            propiedad.setImagenUrl(urlFoto);
            PropiedadImagen img = PropiedadImagen.builder()
                    .propiedad(propiedad)
                    .url(urlFoto)
                    .orden(0)
                    .build();
            propiedad.getImagenes().add(img);
        }

        propiedadService.calcularYSetearDistancia(propiedad);

        Propiedad nueva = propiedadRepository.save(propiedad);
        kafkaProducerService.enviarEventoPropiedad("Nueva propiedad creada: " + nueva.getTitulo() + " (ID: " + nueva.getId() + ")");
        log.info("[POST] Propiedad creada con ID: {}", nueva.getId());
        return ResponseEntity.ok(nueva);
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
                    if (updates.getDireccion() != null) p.setDireccion(updates.getDireccion());
                    if (updates.getUbicacionGps() != null) p.setUbicacionGps(updates.getUbicacionGps());
                    if (updates.getTipoPropiedad() != null) p.setTipoPropiedad(updates.getTipoPropiedad());
                    if (updates.getPeriodoAlquiler() != null) p.setPeriodoAlquiler(updates.getPeriodoAlquiler());
                    if (updates.getArea() != null) p.setArea(updates.getArea());
                    if (updates.getNroPiso() != null) p.setNroPiso(updates.getNroPiso());
                    if (updates.getEstaDisponible() != null) p.setEstaDisponible(updates.getEstaDisponible());
                    if (updates.getDisponibleDesde() != null) p.setDisponibleDesde(updates.getDisponibleDesde());
                    if (updates.getServiciosIncluidos() != null) p.setServiciosIncluidos(updates.getServiciosIncluidos());
                    if (updates.getReglas() != null) p.setReglas(updates.getReglas());
                    if (updates.getLatitud() != null || updates.getLongitud() != null) {
                        if (updates.getLatitud() != null) p.setLatitud(updates.getLatitud());
                        if (updates.getLongitud() != null) p.setLongitud(updates.getLongitud());
                        propiedadService.calcularYSetearDistancia(p);
                    }
                    return ResponseEntity.ok(propiedadRepository.save(p));
                }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<Void> eliminarPropiedad(@PathVariable Long id) {
        propiedadRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ===== Búsqueda y vistas pública/completa =====

    @GetMapping("/buscar")
    public ResponseEntity<List<PropiedadPublicoDTO>> buscar(
            @RequestParam(required = false) BigDecimal precioMin,
            @RequestParam(required = false) BigDecimal precioMax,
            @RequestParam(required = false) TipoPropiedad tipo,
            @RequestParam(required = false) PeriodoAlquiler periodo,
            @RequestParam(required = false) Boolean disponible,
            @RequestParam(required = false) Integer distanciaMax,
            @RequestParam(required = false) List<String> servicios
    ) {
        List<Propiedad> resultados = propiedadService.buscar(precioMin, precioMax, tipo, periodo, disponible, distanciaMax, servicios);
        List<PropiedadPublicoDTO> dto = resultados.stream().map(propiedadService::toPublico).toList();
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/{id}/publico")
    public ResponseEntity<PropiedadPublicoDTO> verPublico(@PathVariable Long id) {
        return propiedadRepository.findById(id)
                .map(p -> ResponseEntity.ok(propiedadService.toPublico(p)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/completo")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PropiedadCompletoDTO> verCompleto(@PathVariable Long id) {
        return propiedadRepository.findById(id)
                .map(p -> ResponseEntity.ok(propiedadService.toCompleto(p)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ===== Imágenes múltiples =====

    @PostMapping(value = "/{id}/imagenes", consumes = {"multipart/form-data"})
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<List<PropiedadImagen>> subirImagenes(
            @PathVariable Long id,
            @RequestPart("files") List<MultipartFile> files
    ) throws IOException {
        Propiedad propiedad = propiedadRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("No existe propiedad con ID " + id));

        int base = propiedadImagenRepository.findByPropiedadIdOrderByOrdenAsc(id).size();
        List<PropiedadImagen> creadas = new ArrayList<>();
        for (int i = 0; i < files.size(); i++) {
            MultipartFile f = files.get(i);
            if (f.isEmpty()) continue;
            String errorValidacion = ArchivoImagenValidoValidator.validar(f);
            if (errorValidacion != null) {
                throw new IllegalArgumentException("Archivo " + f.getOriginalFilename() + ": " + errorValidacion);
            }
            String url = cloudinaryService.uploadFile(f);
            PropiedadImagen img = PropiedadImagen.builder()
                    .propiedad(propiedad)
                    .url(url)
                    .orden(base + i)
                    .build();
            creadas.add(propiedadImagenRepository.save(img));
        }
        return ResponseEntity.ok(creadas);
    }

    @DeleteMapping("/{id}/imagenes/{imagenId}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<Void> eliminarImagen(@PathVariable Long id, @PathVariable Long imagenId) {
        propiedadImagenRepository.deleteById(imagenId);
        return ResponseEntity.noContent().build();
    }

    // ===== Disponibilidad y aprobación admin =====

    @PatchMapping("/{id}/disponibilidad")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<Propiedad> actualizarDisponibilidad(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        return propiedadRepository.findById(id)
                .map(p -> {
                    Object ed = body.get("estaDisponible");
                    if (ed instanceof Boolean b) p.setEstaDisponible(b);
                    Object dd = body.get("disponibleDesde");
                    if (dd instanceof String s && !s.isBlank()) p.setDisponibleDesde(LocalDate.parse(s));
                    return ResponseEntity.ok(propiedadRepository.save(p));
                }).orElse(ResponseEntity.notFound().build());
    }
}
