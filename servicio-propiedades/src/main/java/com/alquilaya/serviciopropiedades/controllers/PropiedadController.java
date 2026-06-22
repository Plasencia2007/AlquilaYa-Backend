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
import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import com.alquilaya.serviciopropiedades.repositories.HabitacionRepository;
import com.alquilaya.serviciopropiedades.repositories.PropiedadImagenRepository;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import com.alquilaya.serviciopropiedades.services.CampusProvider;
import com.alquilaya.serviciopropiedades.services.CloudinaryCleanupQueueService;
import com.alquilaya.serviciopropiedades.services.CloudinaryService;
import com.alquilaya.serviciopropiedades.services.KafkaProducerService;
import com.alquilaya.serviciopropiedades.services.PropiedadService;
import com.alquilaya.serviciopropiedades.services.ZonaResolver;
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
    private final com.alquilaya.serviciopropiedades.repositories.PrecioTemporadaRepository precioTemporadaRepository;
    private final HabitacionRepository habitacionRepository;
    private final ReservaRepository reservaRepository;
    private final KafkaProducerService kafkaProducerService;
    private final CloudinaryService cloudinaryService;
    private final CloudinaryCleanupQueueService cloudinaryCleanupQueue;
    private final PropiedadService propiedadService;
    private final UsuariosClient usuariosClient;
    private final ZonaResolver zonaResolver;
    private final CampusProvider campusProvider;
    private final com.alquilaya.serviciopropiedades.services.PublicacionService publicacionService;
    private final com.alquilaya.serviciopropiedades.services.AnaliticaPropiedadService analiticaPropiedadService;
    private final com.alquilaya.serviciopropiedades.repositories.EventoPropiedadRepository eventoPropiedadRepository;
    private final Validator validator;

    /**
     * Resuelve y asigna la zona de cobertura de una propiedad a partir de su ubicación.
     * Las zonas del catálogo son la autoridad multi-universidad:
     * <ul>
     *   <li>{@code ASIGNADA}: cae en una zona → se guardan zonaId/universidadId.</li>
     *   <li>{@code FUERA_DE_ZONA}: hay zonas cargadas pero no cae en ninguna → rechaza (400).</li>
     *   <li>{@code SIN_DATOS}: el catálogo no respondió → fallback de degradación elegante:
     *       exige estar dentro del radio del campus principal (un solo campus, solo mientras
     *       el catálogo está caído).</li>
     * </ul>
     */
    private void asignarZonaOrechazar(Propiedad propiedad) {
        propiedad.setZonaId(null);
        propiedad.setUniversidadId(null);
        ZonaResolver.Resultado r = zonaResolver.resolver(propiedad.getLatitud(), propiedad.getLongitud());
        switch (r.estado()) {
            case ASIGNADA -> {
                propiedad.setZonaId(r.zonaId());
                propiedad.setUniversidadId(r.universidadId());
            }
            case FUERA_DE_ZONA -> throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "La ubicación está fuera de toda zona de cobertura. Acércala a una universidad registrada.");
            case SIN_DATOS -> validarRadioCampusFallback(propiedad);
        }
    }

    /**
     * Fallback de ubicación cuando el catálogo de zonas no está disponible: la propiedad debe
     * estar dentro del radio del campus principal. Reutiliza la distancia ya calculada por
     * {@code calcularYSetearDistancia} (invocado justo antes) y el radio dinámico del campus.
     * Sin coordenadas o sin distancia calculada no bloquea; otras validaciones lo cubren.
     */
    private void validarRadioCampusFallback(Propiedad propiedad) {
        if (propiedad.getLatitud() == null || propiedad.getLongitud() == null) {
            return;
        }
        Integer distanciaMetros = propiedad.getDistanciaMetros();
        if (distanciaMetros == null) {
            return;
        }
        double radioKm = campusProvider.get().radioKm();
        if (distanciaMetros > radioKm * 1000) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    String.format("La ubicación está a %.2f km del campus principal y excede el radio de "
                                    + "%.1f km permitido. AlquilaYa solo lista cuartos cercanos a una universidad registrada.",
                            distanciaMetros / 1000.0, radioKm));
        }
    }

    /** Tipos que se alquilan como inmueble completo y deben declarar su distribución. */
    private static final java.util.Set<String> TIPOS_MULTIAMBIENTE =
            java.util.Set.of("DEPARTAMENTO", "MINI_DEPA", "CASA");

    /**
     * Para inmuebles completos (departamento/mini depa/casa) exige declarar la distribución:
     * dormitorios, baños y capacidad de personas. Para un cuarto/estudio individual son opcionales.
     */
    private void validarDistribucionPorTipo(Propiedad p) {
        String tipo = p.getTipoPropiedad() == null ? "" : p.getTipoPropiedad().trim().toUpperCase();
        if (!TIPOS_MULTIAMBIENTE.contains(tipo)) {
            return;
        }
        java.util.List<String> faltan = new java.util.ArrayList<>();
        if (p.getNumDormitorios() == null || p.getNumDormitorios() < 1) faltan.add("número de dormitorios");
        if (p.getNumBanos() == null || p.getNumBanos() < 1) faltan.add("número de baños");
        if (p.getCapacidadPersonas() == null || p.getCapacidadPersonas() < 1) faltan.add("capacidad de personas");
        if (!faltan.isEmpty()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Para un inmueble completo debes indicar: " + String.join(", ", faltan) + ".");
        }
    }

    /**
     * Valida y normaliza el enlace de video. Devuelve null si viene vacío. Solo acepta
     * YouTube, Vimeo o archivos .mp4/.webm/.ogg por https — así evitamos URLs no
     * embebibles, esquemas peligrosos (javascript:, data:) o basura. 400 si no califica.
     */
    private String normalizarVideoUrl(String raw) {
        if (raw == null) return null;
        String url = raw.trim();
        if (url.isEmpty()) return null;
        if (url.length() > 512) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "El enlace de video es demasiado largo.");
        }
        java.net.URI uri;
        try {
            uri = java.net.URI.create(url);
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "El enlace de video no es una URL válida.");
        }
        String scheme = uri.getScheme();
        String host = uri.getHost();
        if (scheme == null || host == null || !scheme.equalsIgnoreCase("https")) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "El enlace de video debe ser una URL https válida.");
        }
        String h = host.toLowerCase().replaceFirst("^www\\.", "");
        boolean youtube = h.equals("youtube.com") || h.equals("m.youtube.com") || h.equals("youtu.be");
        boolean vimeo = h.equals("vimeo.com") || h.equals("player.vimeo.com");
        String path = uri.getPath() == null ? "" : uri.getPath().toLowerCase();
        boolean archivo = path.endsWith(".mp4") || path.endsWith(".webm") || path.endsWith(".ogg");
        if (!(youtube || vimeo || archivo)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Solo se aceptan enlaces de YouTube, Vimeo o archivos .mp4/.webm.");
        }
        return url;
    }

    /**
     * Valida y normaliza una URL de imagen externa. Exige https + un enlace DIRECTO a
     * archivo de imagen (.jpg/.jpeg/.png/.webp/.gif/.avif). Rechaza páginas de Google
     * Imágenes/Drive/Fotos (no son enlaces directos y bloquean hotlinking). 400 si no califica.
     */
    private String normalizarImagenUrl(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Indica la URL de la imagen.");
        }
        String url = raw.trim();
        if (url.length() > 512) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "La URL de la imagen es demasiado larga.");
        }
        java.net.URI uri;
        try {
            uri = java.net.URI.create(url);
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "La URL de la imagen no es válida.");
        }
        String scheme = uri.getScheme();
        String host = uri.getHost();
        if (scheme == null || host == null || !scheme.equalsIgnoreCase("https")) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "La URL de la imagen debe ser https.");
        }
        String path = uri.getPath() == null ? "" : uri.getPath().toLowerCase();
        boolean esImagen = path.endsWith(".jpg") || path.endsWith(".jpeg") || path.endsWith(".png")
                || path.endsWith(".webp") || path.endsWith(".gif") || path.endsWith(".avif");
        if (!esImagen) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Debe ser un enlace DIRECTO a una imagen (.jpg, .png, .webp). "
                            + "Los enlaces de Google Imágenes/Drive/Fotos no sirven.");
        }
        return url;
    }

    /** Lado mínimo (px) aceptado para una foto subida — bloquea miniaturas/imágenes pixeladas. */
    private static final int MIN_LADO_PX = 500;

    private boolean resolucionSuficiente(CloudinaryService.ImagenSubida sub) {
        return sub != null && sub.width() >= MIN_LADO_PX && sub.height() >= MIN_LADO_PX;
    }

    private String mensajeResolucion(CloudinaryService.ImagenSubida sub) {
        return "La imagen es muy pequeña (" + sub.width() + "×" + sub.height()
                + " px). Mínimo " + MIN_LADO_PX + " px por lado.";
    }

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
        propiedad.sincronizarServiciosIncluidos(); // deriva serviciosIncluidos de la lista con estado
        propiedad.setVideoUrl(normalizarVideoUrl(propiedad.getVideoUrl()));

        // Jackson deserializa el JSON crudo; disparamos bean validation manualmente
        // porque no pasa por @RequestBody.
        Set<ConstraintViolation<Propiedad>> violations = validator.validate(propiedad);
        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }

        // Exige la distribución (dormitorios/baños/capacidad) si es un inmueble completo.
        validarDistribucionPorTipo(propiedad);

        propiedadService.calcularYSetearDistancia(propiedad);
        // Resuelve la zona de cobertura según la ubicación; rechaza si cae fuera de toda zona.
        asignarZonaOrechazar(propiedad);

        // Persistimos primero (sin imagen) para tener el ID de la propiedad. Lo
        // usamos en el path de Cloudinary: alquilaya/arrendadores/{aId}-{slug}/cuarto-{pId}/img-0
        Propiedad nueva = propiedadRepository.save(propiedad);

        if (file != null && !file.isEmpty()) {
            log.info("[POST] Archivo: {} ({} bytes)", file.getOriginalFilename(), file.getSize());
            String nombreArrendador = resolverNombreArrendador(nueva.getArrendadorId());
            CloudinaryService.ImagenSubida sub = cloudinaryService.uploadImagenCuarto(
                    file, nueva.getArrendadorId(), nombreArrendador, nueva.getId(), 0);
            if (!resolucionSuficiente(sub)) {
                cloudinaryService.eliminarPorUrl(sub.url());
                propiedadRepository.delete(nueva); // no dejar propiedad huérfana sin su foto
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.BAD_REQUEST, mensajeResolucion(sub));
            }

            nueva.setImagenUrl(sub.url());
            PropiedadImagen img = PropiedadImagen.builder()
                    .propiedad(nueva)
                    .url(sub.url())
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
        // Excluye borradores: la lista de "mis propiedades" muestra solo las publicadas.
        return ResponseEntity.ok(propiedadRepository
                .findByArrendadorIdAndEstadoNot(arrendadorId, EstadoPropiedad.BORRADOR));
    }

    // ===== Borradores (autoguardado en servidor) =====

    /** Borradores del arrendador autenticado. */
    @GetMapping("/borradores")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<List<Propiedad>> misBorradores() {
        Long arrendadorId = CurrentUserProvider.requirePerfilId();
        return ResponseEntity.ok(propiedadRepository
                .findByArrendadorIdAndEstado(arrendadorId, EstadoPropiedad.BORRADOR));
    }

    /** Crea un borrador (lenient: acepta datos incompletos; no valida ni resuelve zona). */
    @PostMapping("/borradores")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<Propiedad> crearBorrador(@RequestBody Propiedad body) {
        Long arrendadorId = CurrentUserProvider.requirePerfilId();
        Propiedad b = new Propiedad();
        copiarCamposBorrador(body, b);
        b.setArrendadorId(arrendadorId);
        b.setEstado(EstadoPropiedad.BORRADOR);
        b.setAprobadoPorAdmin(false);
        return ResponseEntity.ok(propiedadRepository.save(b));
    }

    /** Actualiza un borrador existente (solo dueño/admin, solo si sigue en BORRADOR). */
    @PutMapping("/borradores/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<Propiedad> actualizarBorrador(@PathVariable Long id, @RequestBody Propiedad body) {
        return propiedadRepository.findById(id).map(p -> {
            if (p.getEstado() != EstadoPropiedad.BORRADOR) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.BAD_REQUEST, "La propiedad no es un borrador");
            }
            verificarPropietarioOAdmin(p);
            copiarCamposBorrador(body, p);
            return ResponseEntity.ok(propiedadRepository.save(p));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Publica un borrador: corre la validación completa (como el alta) y pasa a PENDIENTE. */
    @PostMapping("/borradores/{id}/publicar")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    @CacheEvict(value = "propiedades:listado", allEntries = true)
    public ResponseEntity<Propiedad> publicarBorrador(@PathVariable Long id) {
        Propiedad p = propiedadRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Borrador no encontrado"));
        verificarPropietarioOAdmin(p);
        return ResponseEntity.ok(publicacionService.publicarBorrador(id));
    }

    /**
     * El arrendador confirma que su aviso sigue vigente (#49 caducidad). Renueva la fecha
     * de confirmación y quita la marca de "requiere reconfirmación".
     */
    @PostMapping("/{id}/confirmar-disponibilidad")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    @CacheEvict(value = "propiedades:listado", allEntries = true)
    public ResponseEntity<Propiedad> confirmarDisponibilidad(@PathVariable Long id) {
        Propiedad p = propiedadRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Propiedad no encontrada"));
        verificarPropietarioOAdmin(p);
        p.setFechaUltimaConfirmacion(java.time.LocalDateTime.now());
        p.setRequiereReconfirmacion(false);
        log.info("[CADUCIDAD] Propiedad {} reconfirmada por su dueño", id);
        return ResponseEntity.ok(propiedadRepository.save(p));
    }

    /** Analítica de una propiedad (#51–#55). Solo el dueño (o admin). */
    @GetMapping("/{id}/analitica")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<com.alquilaya.serviciopropiedades.dto.AnaliticaPropiedadDTO> analitica(
            @PathVariable Long id) {
        Propiedad p = propiedadRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Propiedad no encontrada"));
        verificarPropietarioOAdmin(p);
        return ResponseEntity.ok(analiticaPropiedadService.calcular(p));
    }

    /**
     * Registra un evento de CONTACTO (estudiante inició conversación). Alimenta el embudo
     * de analítica (#52). Best-effort: cualquier usuario autenticado, no falla la UX.
     */
    @PostMapping("/{id}/contacto")
    public ResponseEntity<Void> registrarContacto(@PathVariable Long id) {
        if (!propiedadRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        Long perfilId = CurrentUserProvider.get() != null ? CurrentUserProvider.get().getPerfilId() : null;
        eventoPropiedadRepository.save(
                com.alquilaya.serviciopropiedades.entities.EventoPropiedad.builder()
                        .propiedadId(id)
                        .tipo(com.alquilaya.serviciopropiedades.enums.TipoEvento.CONTACTO)
                        .perfilId(perfilId)
                        .build());
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).build();
    }

    /** Programa la publicación de un borrador para una fecha/hora futura (ISO yyyy-MM-ddTHH:mm). */
    @PostMapping("/borradores/{id}/programar")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<Propiedad> programarBorrador(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Propiedad p = propiedadRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Borrador no encontrado"));
        if (p.getEstado() != EstadoPropiedad.BORRADOR) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Solo se pueden programar borradores");
        }
        verificarPropietarioOAdmin(p);
        String fechaRaw = body != null ? body.get("fecha") : null;
        if (fechaRaw == null || fechaRaw.isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Indica la fecha de publicación");
        }
        java.time.LocalDateTime fecha;
        try {
            fecha = java.time.LocalDateTime.parse(fechaRaw);
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Fecha inválida (usa ISO yyyy-MM-ddTHH:mm)");
        }
        if (!fecha.isAfter(java.time.LocalDateTime.now())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "La fecha de publicación debe ser futura");
        }
        // El borrador debe ser publicable ya (campos completos); si no, no tiene sentido programarlo.
        publicacionService.validarPublicable(p);
        p.setFechaPublicacionProgramada(fecha);
        return ResponseEntity.ok(propiedadRepository.save(p));
    }

    /** Cancela la programación de publicación de un borrador. */
    @DeleteMapping("/borradores/{id}/programar")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<Propiedad> cancelarProgramacion(@PathVariable Long id) {
        return propiedadRepository.findById(id).map(p -> {
            verificarPropietarioOAdmin(p);
            p.setFechaPublicacionProgramada(null);
            return ResponseEntity.ok(propiedadRepository.save(p));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Copia los campos editables coalesciendo los NOT NULL (permite borradores incompletos). */
    private void copiarCamposBorrador(Propiedad src, Propiedad dst) {
        dst.setTitulo(src.getTitulo() != null ? src.getTitulo() : "");
        dst.setDescripcion(src.getDescripcion());
        dst.setPrecio(src.getPrecio() != null ? src.getPrecio() : java.math.BigDecimal.ZERO);
        dst.setDireccion(src.getDireccion() != null ? src.getDireccion() : "");
        dst.setUbicacionGps(src.getUbicacionGps());
        dst.setTipoPropiedad(src.getTipoPropiedad());
        dst.setPeriodoAlquiler(src.getPeriodoAlquiler());
        dst.setArea(src.getArea());
        dst.setNroPiso(src.getNroPiso());
        dst.setNumDormitorios(src.getNumDormitorios());
        dst.setNumBanos(src.getNumBanos());
        dst.setCapacidadPersonas(src.getCapacidadPersonas());
        dst.setTieneSala(src.getTieneSala());
        dst.setTieneCocina(src.getTieneCocina());
        dst.setAmoblado(src.getAmoblado());
        dst.setGestionPorHabitacion(src.getGestionPorHabitacion());
        dst.setLatitud(src.getLatitud());
        dst.setLongitud(src.getLongitud());
        dst.setDisponibleDesde(src.getDisponibleDesde());
        if (src.getPoliticaCancelacion() != null) dst.setPoliticaCancelacion(src.getPoliticaCancelacion());
        dst.setVideoUrl(normalizarVideoUrl(src.getVideoUrl()));
        if (src.getServicios() != null) {
            dst.getServicios().clear();
            dst.getServicios().addAll(src.getServicios());
            dst.sincronizarServiciosIncluidos();
        } else if (src.getServiciosIncluidos() != null) {
            dst.getServiciosIncluidos().clear();
            dst.getServiciosIncluidos().addAll(src.getServiciosIncluidos());
        }
        if (src.getReglas() != null) {
            dst.getReglas().clear();
            dst.getReglas().addAll(src.getReglas());
        }
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
                    if (updates.getPrecio() != null && p.getPrecio() != null
                            && updates.getPrecio().compareTo(p.getPrecio()) != 0) {
                        if (updates.getPrecio().compareTo(p.getPrecio()) < 0) {
                            // Bajó -> recordar precio previo y cuándo, para el badge REBAJA (con expiración).
                            p.setPrecioAnterior(p.getPrecio());
                            p.setFechaCambioPrecio(java.time.LocalDateTime.now());
                        } else {
                            // Subió -> ya no hay rebaja vigente.
                            p.setPrecioAnterior(null);
                            p.setFechaCambioPrecio(null);
                        }
                        p.setPrecio(updates.getPrecio());
                    } else if (updates.getPrecio() != null) {
                        p.setPrecio(updates.getPrecio());
                    }
                    if (updates.getDireccion() != null) p.setDireccion(updates.getDireccion());
                    if (updates.getUbicacionGps() != null) p.setUbicacionGps(updates.getUbicacionGps());
                    if (updates.getTipoPropiedad() != null) p.setTipoPropiedad(updates.getTipoPropiedad());
                    if (updates.getPeriodoAlquiler() != null) p.setPeriodoAlquiler(updates.getPeriodoAlquiler());
                    if (updates.getArea() != null) p.setArea(updates.getArea());
                    if (updates.getNroPiso() != null) p.setNroPiso(updates.getNroPiso());
                    if (updates.getNumDormitorios() != null) p.setNumDormitorios(updates.getNumDormitorios());
                    if (updates.getNumBanos() != null) p.setNumBanos(updates.getNumBanos());
                    if (updates.getCapacidadPersonas() != null) p.setCapacidadPersonas(updates.getCapacidadPersonas());
                    if (updates.getTieneSala() != null) p.setTieneSala(updates.getTieneSala());
                    if (updates.getTieneCocina() != null) p.setTieneCocina(updates.getTieneCocina());
                    if (updates.getAmoblado() != null) p.setAmoblado(updates.getAmoblado());
                    if (updates.getGestionPorHabitacion() != null) p.setGestionPorHabitacion(updates.getGestionPorHabitacion());
                    if (updates.getEstaDisponible() != null) p.setEstaDisponible(updates.getEstaDisponible());
                    if (updates.getDisponibleDesde() != null) p.setDisponibleDesde(updates.getDisponibleDesde());
                    if (updates.getPoliticaCancelacion() != null) p.setPoliticaCancelacion(updates.getPoliticaCancelacion());
                    // videoUrl: "" o "  " limpia el video (-> null); null = no tocar.
                    if (updates.getVideoUrl() != null) p.setVideoUrl(normalizarVideoUrl(updates.getVideoUrl()));
                    
                    if (updates.getServicios() != null) {
                        p.getServicios().clear();
                        p.getServicios().addAll(updates.getServicios());
                        p.sincronizarServiciosIncluidos();
                    } else if (updates.getServiciosIncluidos() != null) {
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
                        // Re-resuelve la zona con la nueva ubicación; rechaza si queda fuera de cobertura.
                        asignarZonaOrechazar(p);
                    }
                    
                    // Campos privilegiados (sólo ADMIN puede tocarlos)
                    CurrentUser cu = CurrentUserProvider.get();
                    boolean isAdmin = cu != null && "ADMIN".equalsIgnoreCase(cu.getRol());
                    if (isAdmin) {
                        if (updates.getAprobadoPorAdmin() != null) p.setAprobadoPorAdmin(updates.getAprobadoPorAdmin());
                        if (updates.getArrendadorId() != null) p.setArrendadorId(updates.getArrendadorId());
                    }
                    if (updates.getEstado() != null) p.setEstado(updates.getEstado());

                    // Si tras la edición sigue siendo un inmueble completo, exige su distribución.
                    validarDistribucionPorTipo(p);

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

        // 4) Borrar habitaciones del inmueble (si se gestiona por habitaciones) y luego la propiedad.
        habitacionRepository.deleteByPropiedadId(id);
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
            @RequestParam(required = false) String zona,
            @RequestParam(required = false) Long universidadId,
            @RequestParam(required = false) Long zonaId,
            @RequestParam(required = false) Integer capacidadMin,
            @RequestParam(required = false) Integer dormitoriosMin
    ) {
        // El @Cacheable vive en el servicio (devuelve un contenedor, no una List
        // cruda, porque Redis no deserializa colecciones en la raíz). Aquí solo
        // desenvolvemos para mantener el contrato HTTP (array JSON).
        return propiedadService.buscarPublicoCacheado(
                precioMin, precioMax, tipo, periodo, disponible, distanciaMax, servicios, zona,
                universidadId, zonaId, capacidadMin, dormitoriosMin
        ).getPropiedades();
    }

    @GetMapping("/{id}/publico")
    public ResponseEntity<PropiedadPublicoDTO> verPublico(@PathVariable Long id) {
        return propiedadRepository.findById(id)
                .map(p -> ResponseEntity.ok(propiedadService.toPublico(p)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Calendario de ocupación (público): rangos de fechas ya ocupados por reservas activas
     * (SOLICITADA/APROBADA/PAGADA) que aún no terminaron. Lo usa la ficha para mostrar
     * "ocupado hasta X / disponible desde Y".
     */
    @GetMapping("/{id}/calendario")
    public ResponseEntity<List<Map<String, Object>>> calendarioOcupacion(@PathVariable Long id) {
        if (!propiedadRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        LocalDate hoy = LocalDate.now();
        List<Map<String, Object>> ocupado = reservaRepository
                .findByPropiedadIdAndEstadoIn(id, ESTADOS_RESERVA_ACTIVA).stream()
                .filter(r -> r.getFechaFin() == null || !r.getFechaFin().isBefore(hoy))
                .sorted(java.util.Comparator.comparing(Reserva::getFechaInicio))
                .map(r -> {
                    Map<String, Object> m = new java.util.HashMap<>();
                    m.put("desde", r.getFechaInicio());
                    m.put("hasta", r.getFechaFin());
                    m.put("estado", r.getEstado());
                    return m;
                })
                .toList();
        return ResponseEntity.ok(ocupado);
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

    /** Precio sugerido al publicar: estadísticas de avisos parecidos (zona/universidad/tipo). */
    @GetMapping("/precio-sugerido")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<com.alquilaya.serviciopropiedades.dto.PrecioSugeridoDTO> precioSugerido(
            @RequestParam(required = false) Long zonaId,
            @RequestParam(required = false) Long universidadId,
            @RequestParam(required = false) String tipo) {
        return ResponseEntity.ok(propiedadService.precioSugerido(zonaId, universidadId, tipo));
    }

    // ===== Precios por temporada/ciclo =====

    /** Lista las temporadas de precio de una propiedad. Público (se muestran en la ficha). */
    @GetMapping("/{id}/temporadas")
    public ResponseEntity<List<com.alquilaya.serviciopropiedades.dto.PrecioTemporadaDTO>> listarTemporadas(
            @PathVariable Long id) {
        var lista = precioTemporadaRepository.findByPropiedadIdOrderByFechaInicioAsc(id)
                .stream().map(this::toTemporadaDTO).toList();
        return ResponseEntity.ok(lista);
    }

    /** Crea una temporada de precio (solo el arrendador dueño). Valida fechas, precio y no-solape. */
    @PostMapping("/{id}/temporadas")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<com.alquilaya.serviciopropiedades.dto.PrecioTemporadaDTO> crearTemporada(
            @PathVariable Long id,
            @RequestBody com.alquilaya.serviciopropiedades.entities.PrecioTemporada body) {
        Propiedad propiedad = propiedadRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "No existe propiedad con ID " + id));
        verificarPropietarioOAdmin(propiedad);
        if (body.getFechaInicio() == null || body.getFechaFin() == null
                || body.getFechaFin().isBefore(body.getFechaInicio())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Rango de fechas inválido.");
        }
        if (body.getPrecio() == null || body.getPrecio().signum() <= 0) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "El precio debe ser mayor a 0.");
        }
        boolean solapa = precioTemporadaRepository
                .existsByPropiedadIdAndFechaInicioLessThanEqualAndFechaFinGreaterThanEqual(
                        id, body.getFechaFin(), body.getFechaInicio());
        if (solapa) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Esa temporada se solapa con otra existente.");
        }
        com.alquilaya.serviciopropiedades.entities.PrecioTemporada t =
                com.alquilaya.serviciopropiedades.entities.PrecioTemporada.builder()
                        .propiedadId(id)
                        .fechaInicio(body.getFechaInicio())
                        .fechaFin(body.getFechaFin())
                        .precio(body.getPrecio())
                        .etiqueta(body.getEtiqueta())
                        .build();
        return ResponseEntity.ok(toTemporadaDTO(precioTemporadaRepository.save(t)));
    }

    /** Elimina una temporada de precio (solo el arrendador dueño). */
    @DeleteMapping("/{id}/temporadas/{temporadaId}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<Void> eliminarTemporada(@PathVariable Long id, @PathVariable Long temporadaId) {
        propiedadRepository.findById(id).ifPresent(this::verificarPropietarioOAdmin);
        precioTemporadaRepository.findByIdAndPropiedadId(temporadaId, id)
                .ifPresent(precioTemporadaRepository::delete);
        return ResponseEntity.noContent().build();
    }

    private com.alquilaya.serviciopropiedades.dto.PrecioTemporadaDTO toTemporadaDTO(
            com.alquilaya.serviciopropiedades.entities.PrecioTemporada t) {
        return com.alquilaya.serviciopropiedades.dto.PrecioTemporadaDTO.builder()
                .id(t.getId()).fechaInicio(t.getFechaInicio()).fechaFin(t.getFechaFin())
                .precio(t.getPrecio()).etiqueta(t.getEtiqueta()).build();
    }

    /** Propiedades similares (sección "También te puede interesar" de la ficha). Público. */
    @GetMapping("/{id}/similares")
    public ResponseEntity<List<com.alquilaya.serviciopropiedades.dto.PropiedadPublicoDTO>> similares(
            @PathVariable Long id,
            @RequestParam(defaultValue = "4") int limit) {
        return ResponseEntity.ok(propiedadService.similares(id, limit));
    }

    // ===== Imágenes múltiples =====

    @PostMapping(value = "/{id}/imagenes", consumes = {"multipart/form-data"})
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    @CacheEvict(value = "propiedades:listado", allEntries = true)
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
            CloudinaryService.ImagenSubida sub = cloudinaryService.uploadImagenCuarto(
                    f, propiedad.getArrendadorId(), nombreArrendador, propiedad.getId(), indice);
            if (!resolucionSuficiente(sub)) {
                cloudinaryService.eliminarPorUrl(sub.url());
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.BAD_REQUEST,
                        "Archivo " + f.getOriginalFilename() + ": " + mensajeResolucion(sub));
            }
            PropiedadImagen img = PropiedadImagen.builder()
                    .propiedad(propiedad)
                    .url(sub.url())
                    .orden(indice)
                    .build();
            creadas.add(propiedadImagenRepository.save(img));
        }
        sincronizarPortada(id);
        return ResponseEntity.ok(creadas);
    }

    /**
     * Agrega una imagen por URL EXTERNA (host del arrendador), sin pasar por Cloudinary.
     * Body: {"url": "https://.../foto.jpg"}. Se valida que sea un enlace directo a imagen.
     * Útil para no consumir Cloudinary cuando la foto ya está alojada en otro lado.
     */
    @PostMapping("/{id}/imagenes/url")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    @CacheEvict(value = "propiedades:listado", allEntries = true)
    public ResponseEntity<PropiedadImagen> agregarImagenPorUrl(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        Propiedad propiedad = propiedadRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "No existe propiedad con ID " + id));
        verificarPropietarioOAdmin(propiedad);

        String url = normalizarImagenUrl(body != null ? body.get("url") : null);
        int orden = propiedadImagenRepository.findByPropiedadIdOrderByOrdenAsc(id).size();
        PropiedadImagen img = PropiedadImagen.builder()
                .propiedad(propiedad)
                .url(url)
                .orden(orden)
                .externa(true)
                .build();
        PropiedadImagen guardada = propiedadImagenRepository.save(img);
        sincronizarPortada(id);
        return ResponseEntity.ok(guardada);
    }

    @GetMapping("/{id}/imagenes")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<List<PropiedadImagen>> listarImagenes(@PathVariable Long id) {
        return ResponseEntity.ok(propiedadImagenRepository.findByPropiedadIdOrderByOrdenAsc(id));
    }

    @DeleteMapping("/{id}/imagenes/{imagenId}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    @CacheEvict(value = "propiedades:listado", allEntries = true)
    public ResponseEntity<Void> eliminarImagen(@PathVariable Long id, @PathVariable Long imagenId) {
        propiedadRepository.findById(id).ifPresent(this::verificarPropietarioOAdmin);
        propiedadImagenRepository.findById(imagenId).ifPresent(img -> {
            // Solo intentamos borrar de Cloudinary las imágenes NUESTRAS; las externas
            // (URL pegada) viven en otro host y no nos pertenecen.
            if (!Boolean.TRUE.equals(img.getExterna())) {
                try {
                    cloudinaryService.eliminarPorUrl(img.getUrl());
                } catch (Exception e) {
                    log.warn("[DELETE-IMG] Fallo borrando {} en Cloudinary, encolando: {}", img.getUrl(), e.getMessage());
                    cloudinaryCleanupQueue.encolar(img.getUrl());
                }
            }
            propiedadImagenRepository.delete(img);
        });
        sincronizarPortada(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Mantiene el {@code imagenUrl} legacy (portada / thumbnail del card) en sincronía con
     * la primera imagen por orden de {@code propiedad_imagenes}. Null si ya no quedan imágenes.
     * Evita que la portada quede apuntando a una foto borrada al subir/agregar/eliminar.
     */
    private void sincronizarPortada(Long propiedadId) {
        List<PropiedadImagen> imgs = propiedadImagenRepository.findByPropiedadIdOrderByOrdenAsc(propiedadId);
        String nuevaPortada = imgs.isEmpty() ? null : imgs.get(0).getUrl();
        propiedadRepository.findById(propiedadId).ifPresent(p -> {
            if (!java.util.Objects.equals(p.getImagenUrl(), nuevaPortada)) {
                p.setImagenUrl(nuevaPortada);
                propiedadRepository.save(p);
            }
        });
    }

    @PatchMapping("/{id}/imagenes/reordenar")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    @CacheEvict(value = "propiedades:listado", allEntries = true)
    public ResponseEntity<List<PropiedadImagen>> reordenarImagenes(
            @PathVariable Long id,
            @RequestBody Map<String, List<Long>> body
    ) {
        Propiedad propiedad = propiedadRepository.findById(id).orElse(null);
        if (propiedad == null) {
            return ResponseEntity.notFound().build();
        }
        verificarPropietarioOAdmin(propiedad);

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

        // La primera imagen es la PORTADA: sincroniza el imagenUrl legacy (thumbnail/fallback)
        // para que no quede apuntando a la foto anterior tras reordenar.
        if (!actualizadas.isEmpty()) {
            String nuevaPortada = actualizadas.get(0).getUrl();
            if (!java.util.Objects.equals(propiedad.getImagenUrl(), nuevaPortada)) {
                propiedad.setImagenUrl(nuevaPortada);
                propiedadRepository.save(propiedad);
            }
        }
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
