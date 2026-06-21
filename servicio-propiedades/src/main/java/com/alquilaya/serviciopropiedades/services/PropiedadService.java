package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.clients.UsuariosClient;
import com.alquilaya.serviciopropiedades.dto.ArrendadorInfoDTO;
import com.alquilaya.serviciopropiedades.dto.PropiedadAdminDTO;
import com.alquilaya.serviciopropiedades.dto.PropiedadBusquedaResultado;
import com.alquilaya.serviciopropiedades.dto.PropiedadCompletoDTO;
import com.alquilaya.serviciopropiedades.dto.PropiedadPublicoDTO;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.entities.PropiedadImagen;
import com.alquilaya.serviciopropiedades.enums.EstadoHabitacion;
import com.alquilaya.serviciopropiedades.repositories.HabitacionRepository;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.util.BadgeCalculator;
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PropiedadService {

    private final PropiedadRepository propiedadRepository;
    private final HabitacionRepository habitacionRepository;
    private final DistanciaService distanciaService;
    private final UsuariosClient usuariosClient;

    public List<Propiedad> buscar(BigDecimal precioMin, BigDecimal precioMax, String tipo,
                                   String periodo, Boolean disponible, Integer distanciaMax,
                                   List<String> servicios, String zona,
                                   Long universidadId, Long zonaId,
                                   Integer capacidadMin, Integer dormitoriosMin) {
        if (precioMin != null && precioMin.signum() < 0) {
            throw new IllegalArgumentException("precioMin no puede ser negativo");
        }
        if (precioMax != null && precioMax.signum() < 0) {
            throw new IllegalArgumentException("precioMax no puede ser negativo");
        }
        if (precioMin != null && precioMax != null && precioMin.compareTo(precioMax) > 0) {
            throw new IllegalArgumentException("precioMin no puede ser mayor que precioMax");
        }
        if (distanciaMax != null && distanciaMax < 0) {
            throw new IllegalArgumentException("distanciaMax no puede ser negativa");
        }
        List<String> filtroServicios = (servicios == null || servicios.isEmpty()) ? null : servicios;
        // El patrón LIKE (comodines + minúsculas) se arma aquí para que :zona viaje
        // como String puro a la query (LOWER(p.direccion) LIKE :zona). Si se concatena
        // dentro del HQL, Hibernate no infiere el tipo y PostgreSQL lo trata como bytea
        // -> "function lower(bytea) does not exist".
        String filtroZona = (zona == null || zona.isBlank())
                ? null
                : "%" + zona.trim().toLowerCase() + "%";
        return propiedadRepository.buscar(precioMin, precioMax, tipo, periodo, disponible, distanciaMax,
                filtroServicios, filtroZona, universidadId, zonaId, capacidadMin, dormitoriosMin);
    }

    /**
     * Búsqueda pública cacheada en Redis (5 min). El @Cacheable vive aquí (y no en
     * el controller) porque devuelve un contenedor {@link PropiedadBusquedaResultado}:
     * Redis no deserializa una List en la raíz. El controller desenvuelve para
     * mantener el contrato HTTP (array). Se invalida con los @CacheEvict del
     * controller sobre "propiedades:listado" en create/update/delete.
     */
    @Cacheable(
        value = "propiedades:listado",
        key = "T(java.util.Objects).hash(#precioMin, #precioMax, #tipo, #periodo, #disponible, #distanciaMax, #servicios, #zona, #universidadId, #zonaId, #capacidadMin, #dormitoriosMin)"
    )
    public PropiedadBusquedaResultado buscarPublicoCacheado(
            BigDecimal precioMin, BigDecimal precioMax, String tipo, String periodo,
            Boolean disponible, Integer distanciaMax, List<String> servicios, String zona,
            Long universidadId, Long zonaId, Integer capacidadMin, Integer dormitoriosMin) {
        List<Propiedad> resultados = buscar(precioMin, precioMax, tipo, periodo, disponible, distanciaMax, servicios, zona, universidadId, zonaId, capacidadMin, dormitoriosMin);
        // Batch enrich: una sola llamada Feign al servicio-usuarios por página
        // (evita N+1 contra el listado). Si Feign falla, devuelve sin enriquecer.
        return new PropiedadBusquedaResultado(toPublicoBatch(resultados));
    }

    public void calcularYSetearDistancia(Propiedad p) {
        if (p.getLatitud() != null && p.getLongitud() != null) {
            p.setDistanciaMetros(distanciaService.distanciaACampusMetros(p.getLatitud(), p.getLongitud()));
        }
    }

    /**
     * Construye el DTO público SIN enriquecer con datos del arrendador.
     * Para listados, preferir {@link #toPublicoBatch(List)} para evitar N+1.
     */
    public PropiedadPublicoDTO toPublico(Propiedad p) {
        return toPublicoBuilder(p, null, contarLibres(p)).build();
    }

    private PropiedadPublicoDTO.PropiedadPublicoDTOBuilder toPublicoBuilder(Propiedad p, ArrendadorInfoDTO info,
                                                                            Long habitacionesLibres) {
        PropiedadPublicoDTO.PropiedadPublicoDTOBuilder b = PropiedadPublicoDTO.builder()
                .id(p.getId())
                .titulo(p.getTitulo())
                .descripcion(p.getDescripcion())
                .precio(p.getPrecio())
                .precioAnterior(p.getPrecioAnterior())
                .videoUrl(p.getVideoUrl())
                .direccion(p.getDireccion())
                .tipoPropiedad(p.getTipoPropiedad())
                .periodoAlquiler(p.getPeriodoAlquiler())
                .area(p.getArea())
                .nroPiso(p.getNroPiso())
                .numDormitorios(p.getNumDormitorios())
                .numBanos(p.getNumBanos())
                .capacidadPersonas(p.getCapacidadPersonas())
                .tieneSala(p.getTieneSala())
                .tieneCocina(p.getTieneCocina())
                .amoblado(p.getAmoblado())
                .gestionPorHabitacion(p.getGestionPorHabitacion())
                .estaDisponible(p.getEstaDisponible())
                .disponibleDesde(p.getDisponibleDesde())
                .politicaCancelacion(p.getPoliticaCancelacion())
                .serviciosIncluidos(copiaPlana(p.getServiciosIncluidos()))
                .servicios(p.getServicios() != null ? new java.util.ArrayList<>(p.getServicios()) : null)
                .reglas(copiaPlana(p.getReglas()))
                .latitud(p.getLatitud())
                .longitud(p.getLongitud())
                .distanciaMetros(p.getDistanciaMetros())
                .zonaId(p.getZonaId())
                .universidadId(p.getUniversidadId())
                .aprobadoPorAdmin(p.getAprobadoPorAdmin())
                .calificacion(p.getCalificacion())
                .numResenas(p.getNumResenas())
                .estado(p.getEstado())
                .imagenes(extraerUrlsImagenes(p))
                .arrendadorId(p.getArrendadorId())
                // Campos premium del card rediseñado
                .fechaCreacion(p.getFechaCreacion())
                .ultimaActualizacion(p.getFechaActualizacion())
                .vistas(p.getVistas() != null ? p.getVistas() : 0L)
                .badges(new ArrayList<>(BadgeCalculator.calcular(p, habitacionesLibres)));

        if (info != null) {
            b.arrendadorNombre(componerNombre(info))
             .arrendadorAvatar(info.getAvatar())
             .arrendadorVerificado(info.getVerificado())
             .tiempoRespuestaArrendador(info.getTiempoRespuestaPromedio());
        }
        return b;
    }

    /**
     * Enriquece un listado de propiedades con datos del arrendador haciendo
     * UNA SOLA llamada Feign bulk al servicio-usuarios (anti N+1).
     * Si la llamada falla o devuelve datos parciales, los campos faltantes
     * quedan en null — degradación silenciosa.
     */
    public List<PropiedadPublicoDTO> toPublicoBatch(List<Propiedad> propiedades) {
        if (propiedades == null || propiedades.isEmpty()) {
            return Collections.emptyList();
        }
        Map<Long, ArrendadorInfoDTO> infoPorId = cargarArrendadoresBulk(propiedades);
        Map<Long, Long> libresPorId = contarLibresBatch(propiedades);
        return propiedades.stream()
                .map(p -> toPublicoBuilder(p, infoPorId.get(p.getArrendadorId()),
                        libresPorId.get(p.getId())).build())
                .toList();
    }

    /**
     * Cuenta habitaciones LIBRE de una sola propiedad (para el badge ÚLTIMA PLAZA en el
     * detalle). Devuelve null si la propiedad no se gestiona por habitación.
     */
    private Long contarLibres(Propiedad p) {
        if (p == null || p.getId() == null || !Boolean.TRUE.equals(p.getGestionPorHabitacion())) {
            return null;
        }
        return habitacionRepository.countByPropiedadIdAndEstado(p.getId(), EstadoHabitacion.LIBRE);
    }

    /**
     * Cuenta habitaciones LIBRE para todas las propiedades gestionadas por habitación
     * del listado en UNA sola query (anti N+1). Las que no aparecen tienen 0 libres.
     */
    private Map<Long, Long> contarLibresBatch(List<Propiedad> propiedades) {
        List<Long> ids = propiedades.stream()
                .filter(p -> Boolean.TRUE.equals(p.getGestionPorHabitacion()))
                .map(Propiedad::getId)
                .filter(Objects::nonNull)
                .toList();
        if (ids.isEmpty()) return Collections.emptyMap();
        Map<Long, Long> map = new HashMap<>();
        for (Object[] fila : habitacionRepository.contarPorEstadoEnPropiedades(ids, EstadoHabitacion.LIBRE)) {
            map.put((Long) fila[0], (Long) fila[1]);
        }
        return map;
    }

    private Map<Long, ArrendadorInfoDTO> cargarArrendadoresBulk(List<Propiedad> propiedades) {
        List<Long> ids = propiedades.stream()
                .map(Propiedad::getArrendadorId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (ids.isEmpty()) return Collections.emptyMap();

        boolean autenticado = hayUsuarioAutenticado();
        try {
            List<ArrendadorInfoDTO> infos = autenticado
                    ? usuariosClient.obtenerArrendadoresBulk(ids)
                    : usuariosClient.obtenerArrendadoresBulkPublico(ids);
            if (infos == null) return Collections.emptyMap();
            Map<Long, ArrendadorInfoDTO> map = new HashMap<>(infos.size());
            for (ArrendadorInfoDTO i : infos) {
                if (i != null && i.getId() != null) {
                    map.put(i.getId(), i);
                }
            }
            log.debug("[BULK] Enriquecidos {}/{} arrendadores en una sola llamada Feign ({})",
                    map.size(), ids.size(), autenticado ? "privado" : "publico");
            return map;
        } catch (Exception e) {
            log.warn("[BULK] No se pudo enriquecer arrendadores ({} ids, {}): {}. Se devuelve listado sin enriquecer.",
                    ids.size(), autenticado ? "privado" : "publico", e.getMessage());
            return Collections.emptyMap();
        }
    }

    /**
     * Detecta si la request actual tiene un usuario autenticado.
     * Si no hay JWT en el SecurityContext (visitante anónimo), el caller
     * debe usar el endpoint público para evitar 403.
     */
    private boolean hayUsuarioAutenticado() {
        var auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        return auth != null
                && auth.isAuthenticated()
                && !(auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken);
    }

    @TimeLimiter(name = "obtenerArrendadorCB")
    @CircuitBreaker(name = "obtenerArrendadorCB", fallbackMethod = "fallbackObtenerArrendador")
    @Retry(name = "obtenerArrendadorCB")
    @Bulkhead(name = "obtenerArrendadorCB", type = Bulkhead.Type.SEMAPHORE)
    public CompletableFuture<ArrendadorInfoDTO> obtenerArrendadorResiliente(Long perfilId) {
        log.info("[Resilience4j] Llamando a servicio-usuarios para arrendador {}", perfilId);
        var attrs = RequestContextHolder.getRequestAttributes();
        return CompletableFuture.supplyAsync(() -> {
            RequestContextHolder.setRequestAttributes(attrs);
            try {
                return usuariosClient.obtenerArrendador(perfilId);
            } finally {
                RequestContextHolder.resetRequestAttributes();
            }
        });
    }

    @SuppressWarnings("unused")
    private CompletableFuture<ArrendadorInfoDTO> fallbackObtenerArrendador(Long perfilId, Throwable t) {
        log.error("[FALLBACK] obtenerArrendador({}) — {}: {}",
                perfilId, t.getClass().getSimpleName(), t.getMessage());
        ArrendadorInfoDTO defaultInfo = new ArrendadorInfoDTO();
        defaultInfo.setId(perfilId);
        defaultInfo.setNombre("Arrendador");
        defaultInfo.setApellido("(no disponible)");
        return CompletableFuture.completedFuture(defaultInfo);
    }

    public PropiedadCompletoDTO toCompleto(Propiedad p) {
        ArrendadorInfoDTO info = null;
        try {
            info = obtenerArrendadorResiliente(p.getArrendadorId()).join();
        } catch (Exception e) {
            log.warn("No se pudo obtener info del arrendador {}: {}", p.getArrendadorId(), e.getMessage());
        }

        PropiedadCompletoDTO.PropiedadCompletoDTOBuilder b = PropiedadCompletoDTO.builder()
                .id(p.getId())
                .titulo(p.getTitulo())
                .descripcion(p.getDescripcion())
                .precio(p.getPrecio())
                .precioAnterior(p.getPrecioAnterior())
                .videoUrl(p.getVideoUrl())
                .direccion(p.getDireccion())
                .tipoPropiedad(p.getTipoPropiedad())
                .periodoAlquiler(p.getPeriodoAlquiler())
                .area(p.getArea())
                .nroPiso(p.getNroPiso())
                .numDormitorios(p.getNumDormitorios())
                .numBanos(p.getNumBanos())
                .capacidadPersonas(p.getCapacidadPersonas())
                .tieneSala(p.getTieneSala())
                .tieneCocina(p.getTieneCocina())
                .amoblado(p.getAmoblado())
                .gestionPorHabitacion(p.getGestionPorHabitacion())
                .estaDisponible(p.getEstaDisponible())
                .disponibleDesde(p.getDisponibleDesde())
                .politicaCancelacion(p.getPoliticaCancelacion())
                .serviciosIncluidos(copiaPlana(p.getServiciosIncluidos()))
                .servicios(p.getServicios() != null ? new java.util.ArrayList<>(p.getServicios()) : null)
                .reglas(copiaPlana(p.getReglas()))
                .latitud(p.getLatitud())
                .longitud(p.getLongitud())
                .distanciaMetros(p.getDistanciaMetros())
                .aprobadoPorAdmin(p.getAprobadoPorAdmin())
                .calificacion(p.getCalificacion())
                .numResenas(p.getNumResenas())
                .estado(p.getEstado())
                .imagenes(extraerUrlsImagenes(p))
                .arrendadorId(p.getArrendadorId())
                // Campos premium del card rediseñado
                .fechaCreacion(p.getFechaCreacion())
                .ultimaActualizacion(p.getFechaActualizacion())
                .vistas(p.getVistas() != null ? p.getVistas() : 0L)
                .badges(new ArrayList<>(BadgeCalculator.calcular(p, contarLibres(p))));

        if (info != null) {
            b.arrendadorNombre(componerNombre(info))
             .arrendadorTelefono(info.getTelefono())
             .arrendadorCorreo(info.getCorreo())
             .arrendadorAvatar(info.getAvatar())
             .arrendadorVerificado(info.getVerificado())
             .tiempoRespuestaArrendador(info.getTiempoRespuestaPromedio());
        }
        return b.build();
    }

    public PropiedadAdminDTO toAdmin(Propiedad p) {
        ArrendadorInfoDTO info = null;
        try {
            info = obtenerArrendadorResiliente(p.getArrendadorId()).join();
        } catch (Exception e) {
            log.warn("No se pudo obtener info del arrendador {}: {}", p.getArrendadorId(), e.getMessage());
        }

        PropiedadAdminDTO.PropiedadAdminDTOBuilder b = PropiedadAdminDTO.builder()
                .id(p.getId())
                .titulo(p.getTitulo())
                .descripcion(p.getDescripcion())
                .precio(p.getPrecio())
                .direccion(p.getDireccion())
                .tipoPropiedad(p.getTipoPropiedad())
                .periodoAlquiler(p.getPeriodoAlquiler())
                .videoUrl(p.getVideoUrl())
                .area(p.getArea())
                .nroPiso(p.getNroPiso())
                .numDormitorios(p.getNumDormitorios())
                .numBanos(p.getNumBanos())
                .capacidadPersonas(p.getCapacidadPersonas())
                .tieneSala(p.getTieneSala())
                .tieneCocina(p.getTieneCocina())
                .amoblado(p.getAmoblado())
                .gestionPorHabitacion(p.getGestionPorHabitacion())
                .estaDisponible(p.getEstaDisponible())
                .disponibleDesde(p.getDisponibleDesde())
                .politicaCancelacion(p.getPoliticaCancelacion())
                .serviciosIncluidos(copiaPlana(p.getServiciosIncluidos()))
                .servicios(p.getServicios() != null ? new java.util.ArrayList<>(p.getServicios()) : null)
                .reglas(copiaPlana(p.getReglas()))
                .latitud(p.getLatitud())
                .longitud(p.getLongitud())
                .distanciaMetros(p.getDistanciaMetros())
                .aprobadoPorAdmin(p.getAprobadoPorAdmin())
                .calificacion(p.getCalificacion())
                .numResenas(p.getNumResenas())
                .estado(p.getEstado())
                .imagenes(extraerUrlsImagenes(p))
                .arrendadorId(p.getArrendadorId())
                .fechaCreacion(p.getFechaCreacion());

        if (info != null) {
            b.arrendadorNombre(componerNombre(info))
             .arrendadorTelefono(info.getTelefono())
             .arrendadorCorreo(info.getCorreo());
        }
        return b.build();
    }

    /**
     * Incremento asíncrono del contador de vistas. Se ejecuta en un hilo
     * separado (vía @EnableAsync en la app) para NO bloquear el GET del
     * detalle. La query es un UPDATE atómico, no carga ni guarda la entidad.
     * Si falla, se loguea y se ignora — la vista no se cuenta pero el GET
     * sigue respondiendo OK.
     *
     * TODO (futuro): debounce por (usuarioId, propiedadId, ventana) para evitar
     * inflar contadores con refresh; o mover a un evento Kafka consumido por
     * un job batch que agrega cada N segundos.
     */
    @Async
    public void incrementarVistasAsync(Long propiedadId) {
        if (propiedadId == null) return;
        try {
            int filas = propiedadRepository.incrementarVistas(propiedadId);
            if (filas == 0) {
                log.debug("[VISTAS] Propiedad {} no encontrada al incrementar vistas", propiedadId);
            }
        } catch (Exception e) {
            log.warn("[VISTAS] No se pudo incrementar vistas de propiedad {}: {}",
                    propiedadId, e.getMessage());
        }
    }

    /**
     * Copia una colección de Hibernate (el {@code PersistentBag} de un
     * {@code @ElementCollection}) a un {@link ArrayList} plano antes de meterla en
     * un DTO. Imprescindible para los DTOs que se cachean en Redis: si se asigna el
     * proxy de Hibernate directamente, {@code GenericJackson2JsonRedisSerializer}
     * escribe el {@code @class} del PersistentBag y al releer de la caché —ya sin
     * sesión— revienta con "failed to lazily initialize a collection - no Session".
     */
    private static List<String> copiaPlana(List<String> origen) {
        return (origen == null || origen.isEmpty())
                ? new ArrayList<>()
                : new ArrayList<>(origen);
    }

    private String componerNombre(ArrendadorInfoDTO info) {
        if (info == null) return null;
        String n = info.getNombre() != null ? info.getNombre() : "";
        String a = info.getApellido() != null ? " " + info.getApellido() : "";
        String full = (n + a).trim();
        return full.isEmpty() ? null : full;
    }

    private List<String> extraerUrlsImagenes(Propiedad p) {
        // Siempre ArrayList plano (no Collections.singletonList/emptyList): estos DTOs
        // se cachean en Redis y las listas inmutables del JDK tampoco hacen round-trip
        // limpio con el serializer por @class.
        if (p.getImagenes() == null || p.getImagenes().isEmpty()) {
            List<String> unica = new ArrayList<>();
            if (p.getImagenUrl() != null) unica.add(p.getImagenUrl());
            return unica;
        }
        return p.getImagenes().stream()
                .sorted((a, b) -> Integer.compare(
                        a.getOrden() != null ? a.getOrden() : 0,
                        b.getOrden() != null ? b.getOrden() : 0))
                .map(PropiedadImagen::getUrl)
                .collect(Collectors.toCollection(ArrayList::new));
    }
}
