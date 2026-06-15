package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.clients.UsuariosClient;
import com.alquilaya.serviciopropiedades.config.CurrentUser;
import com.alquilaya.serviciopropiedades.config.CurrentUserProvider;
import com.alquilaya.serviciopropiedades.dto.ArrendadorInfoDTO;
import com.alquilaya.serviciopropiedades.dto.PropiedadCompletoDTO;
import com.alquilaya.serviciopropiedades.dto.PropiedadPublicoDTO;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.entities.PropiedadImagen;
import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import com.alquilaya.serviciopropiedades.repositories.PropiedadImagenRepository;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import com.alquilaya.serviciopropiedades.services.CloudinaryCleanupQueueService;
import com.alquilaya.serviciopropiedades.services.CloudinaryService;
import com.alquilaya.serviciopropiedades.services.KafkaProducerService;
import com.alquilaya.serviciopropiedades.services.PropiedadService;
import com.alquilaya.serviciopropiedades.validaciones.anotaciones.ArchivoImagenValido;
import com.alquilaya.serviciopropiedades.validaciones.validators.ArchivoImagenValidoValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
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
import java.util.Set;

@Slf4j
@RestController
@RequestMapping("/api/v1/propiedades")
@RequiredArgsConstructor
@Validated
public class PropiedadController {

    private final PropiedadRepository propiedadRepository;
    private final PropiedadImagenRepository propiedadImagenRepository;
    private final ReservaRepository reservaRepository;
    private final KafkaProducerService kafkaProducerService;
    private final CloudinaryService cloudinaryService;
    private final CloudinaryCleanupQueueService cloudinaryCleanupQueue;
    private final PropiedadService propiedadService;
    private final UsuariosClient usuariosClient;
    private final Validator validator;

    /** Estados de reserva que impiden eliminar una propiedad. */
    private static final java.util.EnumSet<EstadoReserva> ESTADOS_RESERVA_ACTIVA =
            java.util.EnumSet.of(EstadoReserva.SOLICITADA, EstadoReserva.APROBADA, EstadoReserva.PAGADA);

    /**
     * Verifica que el usuario autenticado sea el dueño de la propiedad (mismo
     * arrendadorId que perfilId) o que sea ADMIN. Lanza AccessDeniedException
     * (mapeada a 403) si no.
     */
    private void verificarPropietarioOAdmin(Propiedad propiedad) {
        CurrentUser cu = CurrentUserProvider.get();
        if (cu == null) {
            throw new AccessDeniedException("No autenticado.");
        }
        String rol = cu.getRol();
        if ("ADMIN".equalsIgnoreCase(rol)) {
            return;
        }
        Long perfilId = cu.getPerfilId();
        if (perfilId == null || !perfilId.equals(propiedad.getArrendadorId())) {
            log.warn("[AUTH] Usuario perfilId={} intentó modificar propiedad {} (dueño={})",
                    perfilId, propiedad.getId(), propiedad.getArrendadorId());
            throw new AccessDeniedException("No puedes modificar una propiedad que no es tuya.");
        }
    }

    // ===== Creación / listado básico =====

    @PostMapping(consumes = {"multipart/form-data"})
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    @CacheEvict(value = "propiedades:listado", allEntries = true)
    public ResponseEntity<Propiedad> crearPropiedad(
            @RequestPart("propiedad") String propiedadJson,
            @RequestPart(value = "file", required = false) @ArchivoImagenValido MultipartFile file
    ) throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        mapper.findAndRegisterModules();
        Propiedad propiedad = mapper.readValue(propiedadJson, Propiedad.class);

        // Jackson deserializa el JSON crudo; disparamos bean validation manualmente
        // porque no pasa por @RequestBody.
        Set<ConstraintViolation<Propiedad>> violations = validator.validate(propiedad);
        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }

        propiedadService.calcularYSetearDistancia(propiedad);

        // Persistimos primero (sin imagen) para tener el ID de la propiedad. Lo
        // usamos en el path de Cloudinary: alquilaya/arrendadores/{aId}-{slug}/cuarto-{pId}/img-0
        Propiedad nueva = propiedadRepository.save(propiedad);

        if (file != null && !file.isEmpty()) {
            log.info("[POST] Archivo: {} ({} bytes)", file.getOriginalFilename(), file.getSize());
            String nombreArrendador = resolverNombreArrendador(nueva.getArrendadorId());
            String urlFoto = cloudinaryService.uploadImagenCuarto(
                    file, nueva.getArrendadorId(), nombreArrendador, nueva.getId(), 0);

            nueva.setImagenUrl(urlFoto);
            PropiedadImagen img = PropiedadImagen.builder()
                    .propiedad(nueva)
                    .url(urlFoto)
                    .orden(0)
                    .build();
            if (nueva.getImagenes() == null) nueva.setImagenes(new ArrayList<>());
            nueva.getImagenes().add(img);
            nueva = propiedadRepository.save(nueva);
        }

        kafkaProducerService.enviarEventoPropiedad("Nueva propiedad creada: " + nueva.getTitulo() + " (ID: " + nueva.getId() + ")");
        log.info("[POST] Propiedad creada con ID: {}", nueva.getId());
        return ResponseEntity.ok(nueva);
    }

    /**
     * Best-effort: resuelve el nombre del arrendador vía Feign para usarlo en
     * el path de Cloudinary. Si servicio-usuarios no responde, devuelve null y
     * la carpeta queda solo con el ID — la subida no falla.
     */
    private String resolverNombreArrendador(Long arrendadorId) {
        if (arrendadorId == null) return null;
        try {
            ArrendadorInfoDTO info = usuariosClient.obtenerArrendador(arrendadorId);
            if (info == null) return null;
            String n = info.getNombre() == null ? "" : info.getNombre();
            String a = info.getApellido() == null ? "" : info.getApellido();
            String completo = (n + " " + a).trim();
            return completo.isEmpty() ? null : completo;
        } catch (Exception e) {
            log.warn("No pude resolver nombre arrendador {} para Cloudinary: {}", arrendadorId, e.getMessage());
            return null;
        }
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
    @CacheEvict(value = "propiedades:listado", allEntries = true)
    public ResponseEntity<Propiedad> actualizarPropiedad(@PathVariable Long id, @RequestBody Propiedad updates) {
        return propiedadRepository.findById(id)
                .map(p -> {
                    verificarPropietarioOAdmin(p);
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
                    
                    if (updates.getServiciosIncluidos() != null) {
                        p.getServiciosIncluidos().clear();
                        p.getServiciosIncluidos().addAll(updates.getServiciosIncluidos());
                    }
                    if (updates.getReglas() != null) {
                        p.getReglas().clear();
                        p.getReglas().addAll(updates.getReglas());
                    }

                    if (updates.getLatitud() != null || updates.getLongitud() != null) {
                        if (updates.getLatitud() != null) p.setLatitud(updates.getLatitud());
                        if (updates.getLongitud() != null) p.setLongitud(updates.getLongitud());
                        propiedadService.calcularYSetearDistancia(p);
                    }
                    
                    // Campos privilegiados (sólo ADMIN puede tocarlos)
                    CurrentUser cu = CurrentUserProvider.get();
                    boolean isAdmin = cu != null && "ADMIN".equalsIgnoreCase(cu.getRol());
                    if (isAdmin) {
                        if (updates.getAprobadoPorAdmin() != null) p.setAprobadoPorAdmin(updates.getAprobadoPorAdmin());
                        if (updates.getArrendadorId() != null) p.setArrendadorId(updates.getArrendadorId());
                    }
                    if (updates.getEstado() != null) p.setEstado(updates.getEstado());

                    return ResponseEntity.ok(propiedadRepository.save(p));
                }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    @CacheEvict(value = "propiedades:listado", allEntries = true)
    public ResponseEntity<Void> eliminarPropiedad(@PathVariable Long id) {
        Propiedad propiedad = propiedadRepository.findById(id).orElse(null);
        if (propiedad == null) {
            return ResponseEntity.notFound().build();
        }
        // 1) Autorización: dueño o ADMIN
        verificarPropietarioOAdmin(propiedad);

        // 2) Conflicto si hay reservas activas (SOLICITADA/APROBADA/PAGADA)
        List<Reserva> activas = reservaRepository.findByPropiedadIdAndEstadoIn(id, ESTADOS_RESERVA_ACTIVA);
        if (!activas.isEmpty()) {
            log.warn("[DELETE] Propiedad {} no se puede eliminar: tiene {} reserva(s) activa(s)", id, activas.size());
            // IllegalStateException -> 409 Conflict (ver GlobalExceptionHandler)
            throw new IllegalStateException(
                    "No se puede eliminar la propiedad porque tiene " + activas.size()
                            + " reserva(s) activa(s) en estado SOLICITADA/APROBADA/PAGADA.");
        }

        // 3) Limpieza best-effort de imágenes en Cloudinary. Si falla, encolar
        //    para limpieza diferida en Redis y continuar con el delete de BD.
        List<PropiedadImagen> imagenes = propiedadImagenRepository.findByPropiedadIdOrderByOrdenAsc(id);
        for (PropiedadImagen img : imagenes) {
            String url = img.getUrl();
            if (url == null || url.isBlank()) continue;
            try {
                cloudinaryService.eliminarPorUrl(url);
            } catch (Exception e) {
                log.error("[DELETE] Fallo borrando imagen {} en Cloudinary: {}. Encolando para limpieza diferida.",
                        url, e.getMessage());
                cloudinaryCleanupQueue.encolar(url);
            }
        }
        // También la imagen "portada" legacy (imagenUrl) si difiere
        String portada = propiedad.getImagenUrl();
        if (portada != null && !portada.isBlank()) {
            boolean yaProcesada = imagenes.stream().anyMatch(i -> portada.equals(i.getUrl()));
            if (!yaProcesada) {
                try {
                    cloudinaryService.eliminarPorUrl(portada);
                } catch (Exception e) {
                    log.error("[DELETE] Fallo borrando portada {} en Cloudinary: {}", portada, e.getMessage());
                    cloudinaryCleanupQueue.encolar(portada);
                }
            }
        }

        // 4) Delete en BD
        propiedadRepository.delete(propiedad);
        log.info("[DELETE] Propiedad {} eliminada (imágenes procesadas: {})", id, imagenes.size());
        return ResponseEntity.noContent().build();
    }

    // ===== Búsqueda y vistas pública/completa =====

    /**
     * Listado público de propiedades con filtros. Cacheado en Redis 5 min porque
     * NO depende del JWT del usuario actual y mismos filtros producen mismos
     * resultados. La key combina todos los params para evitar colisiones.
     * Se invalida en create/update/delete/disponibilidad.
     */
    @GetMapping("/buscar")
    public List<PropiedadPublicoDTO> buscar(
            @RequestParam(required = false) BigDecimal precioMin,
            @RequestParam(required = false) BigDecimal precioMax,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String periodo,
            @RequestParam(required = false) Boolean disponible,
            @RequestParam(required = false) Integer distanciaMax,
            @RequestParam(required = false) List<String> servicios,
            @RequestParam(required = false) String zona
    ) {
        // El @Cacheable vive en el servicio (devuelve un contenedor, no una List
        // cruda, porque Redis no deserializa colecciones en la raíz). Aquí solo
        // desenvolvemos para mantener el contrato HTTP (array JSON).
        return propiedadService.buscarPublicoCacheado(
                precioMin, precioMax, tipo, periodo, disponible, distanciaMax, servicios, zona
        ).getPropiedades();
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
                .map(p -> {
                    // Incremento asíncrono del contador de vistas (no bloquea el GET).
                    propiedadService.incrementarVistasAsync(p.getId());
                    return ResponseEntity.ok(propiedadService.toCompleto(p));
                })
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
        verificarPropietarioOAdmin(propiedad);

        int base = propiedadImagenRepository.findByPropiedadIdOrderByOrdenAsc(id).size();
        String nombreArrendador = resolverNombreArrendador(propiedad.getArrendadorId());

        List<PropiedadImagen> creadas = new ArrayList<>();
        for (int i = 0; i < files.size(); i++) {
            MultipartFile f = files.get(i);
            if (f.isEmpty()) continue;
            String errorValidacion = ArchivoImagenValidoValidator.validar(f);
            if (errorValidacion != null) {
                throw new IllegalArgumentException("Archivo " + f.getOriginalFilename() + ": " + errorValidacion);
            }
            int indice = base + i;
            String url = cloudinaryService.uploadImagenCuarto(
                    f, propiedad.getArrendadorId(), nombreArrendador, propiedad.getId(), indice);
            PropiedadImagen img = PropiedadImagen.builder()
                    .propiedad(propiedad)
                    .url(url)
                    .orden(indice)
                    .build();
            creadas.add(propiedadImagenRepository.save(img));
        }
        return ResponseEntity.ok(creadas);
    }

    @GetMapping("/{id}/imagenes")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<List<PropiedadImagen>> listarImagenes(@PathVariable Long id) {
        return ResponseEntity.ok(propiedadImagenRepository.findByPropiedadIdOrderByOrdenAsc(id));
    }

    @DeleteMapping("/{id}/imagenes/{imagenId}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<Void> eliminarImagen(@PathVariable Long id, @PathVariable Long imagenId) {
        propiedadRepository.findById(id).ifPresent(this::verificarPropietarioOAdmin);
        propiedadImagenRepository.findById(imagenId).ifPresent(img -> {
            // Borra del Cloudinary best-effort y luego de la BD.
            try {
                cloudinaryService.eliminarPorUrl(img.getUrl());
            } catch (Exception e) {
                log.warn("[DELETE-IMG] Fallo borrando {} en Cloudinary, encolando: {}", img.getUrl(), e.getMessage());
                cloudinaryCleanupQueue.encolar(img.getUrl());
            }
            propiedadImagenRepository.delete(img);
        });
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/imagenes/reordenar")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<List<PropiedadImagen>> reordenarImagenes(
            @PathVariable Long id,
            @RequestBody Map<String, List<Long>> body
    ) {
        propiedadRepository.findById(id).ifPresent(this::verificarPropietarioOAdmin);
        List<Long> orden = body.get("orden");
        if (orden == null || orden.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        List<PropiedadImagen> imagenes = propiedadImagenRepository.findByPropiedadIdOrderByOrdenAsc(id);
        for (PropiedadImagen img : imagenes) {
            int pos = orden.indexOf(img.getId());
            img.setOrden(pos >= 0 ? pos : imagenes.size());
        }
        List<PropiedadImagen> actualizadas = propiedadImagenRepository.saveAll(imagenes);
        actualizadas.sort((a, b) -> Integer.compare(a.getOrden(), b.getOrden()));
        return ResponseEntity.ok(actualizadas);
    }

    // ===== Disponibilidad y aprobación admin =====

    @PatchMapping("/{id}/disponibilidad")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    @CacheEvict(value = "propiedades:listado", allEntries = true)
    public ResponseEntity<Propiedad> actualizarDisponibilidad(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        return propiedadRepository.findById(id)
                .map(p -> {
                    verificarPropietarioOAdmin(p);
                    Object ed = body.get("estaDisponible");
                    if (ed instanceof Boolean b) p.setEstaDisponible(b);
                    Object dd = body.get("disponibleDesde");
                    if (dd instanceof String s && !s.isBlank()) p.setDisponibleDesde(LocalDate.parse(s));
                    return ResponseEntity.ok(propiedadRepository.save(p));
                }).orElse(ResponseEntity.notFound().build());
    }
}
