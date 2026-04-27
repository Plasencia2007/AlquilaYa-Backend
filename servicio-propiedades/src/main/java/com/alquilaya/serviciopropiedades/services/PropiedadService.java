package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.clients.UsuariosClient;
import com.alquilaya.serviciopropiedades.dto.ArrendadorInfoDTO;
import com.alquilaya.serviciopropiedades.dto.PropiedadCompletoDTO;
import com.alquilaya.serviciopropiedades.dto.PropiedadPublicoDTO;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.entities.PropiedadImagen;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class PropiedadService {

    private final PropiedadRepository propiedadRepository;
    private final DistanciaService distanciaService;
    private final UsuariosClient usuariosClient;

    public List<Propiedad> buscar(BigDecimal precioMin, BigDecimal precioMax, String tipo,
                                   String periodo, Boolean disponible, Integer distanciaMax,
                                   List<String> servicios) {
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
        return propiedadRepository.buscar(precioMin, precioMax, tipo, periodo, disponible, distanciaMax, filtroServicios);
    }

    public void calcularYSetearDistancia(Propiedad p) {
        if (p.getLatitud() != null && p.getLongitud() != null) {
            p.setDistanciaMetros(distanciaService.distanciaAUpeuMetros(p.getLatitud(), p.getLongitud()));
        }
    }

    public PropiedadPublicoDTO toPublico(Propiedad p) {
        return PropiedadPublicoDTO.builder()
                .id(p.getId())
                .titulo(p.getTitulo())
                .descripcion(p.getDescripcion())
                .precio(p.getPrecio())
                .direccion(p.getDireccion())
                .tipoPropiedad(p.getTipoPropiedad())
                .periodoAlquiler(p.getPeriodoAlquiler())
                .area(p.getArea())
                .nroPiso(p.getNroPiso())
                .estaDisponible(p.getEstaDisponible())
                .disponibleDesde(p.getDisponibleDesde())
                .serviciosIncluidos(p.getServiciosIncluidos())
                .reglas(p.getReglas())
                .latitud(p.getLatitud())
                .longitud(p.getLongitud())
                .distanciaMetros(p.getDistanciaMetros())
                .aprobadoPorAdmin(p.getAprobadoPorAdmin())
                .calificacion(p.getCalificacion())
                .numResenas(p.getNumResenas())
                .estado(p.getEstado())
                .imagenes(extraerUrlsImagenes(p))
                .build();
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
                .direccion(p.getDireccion())
                .tipoPropiedad(p.getTipoPropiedad())
                .periodoAlquiler(p.getPeriodoAlquiler())
                .area(p.getArea())
                .nroPiso(p.getNroPiso())
                .estaDisponible(p.getEstaDisponible())
                .disponibleDesde(p.getDisponibleDesde())
                .serviciosIncluidos(p.getServiciosIncluidos())
                .reglas(p.getReglas())
                .latitud(p.getLatitud())
                .longitud(p.getLongitud())
                .distanciaMetros(p.getDistanciaMetros())
                .aprobadoPorAdmin(p.getAprobadoPorAdmin())
                .calificacion(p.getCalificacion())
                .numResenas(p.getNumResenas())
                .estado(p.getEstado())
                .imagenes(extraerUrlsImagenes(p))
                .arrendadorId(p.getArrendadorId());

        if (info != null) {
            b.arrendadorNombre((info.getNombre() != null ? info.getNombre() : "") +
                    (info.getApellido() != null ? " " + info.getApellido() : ""))
             .arrendadorTelefono(info.getTelefono())
             .arrendadorCorreo(info.getCorreo());
        }
        return b.build();
    }

    private List<String> extraerUrlsImagenes(Propiedad p) {
        if (p.getImagenes() == null || p.getImagenes().isEmpty()) {
            return p.getImagenUrl() != null ? Collections.singletonList(p.getImagenUrl()) : Collections.emptyList();
        }
        return p.getImagenes().stream()
                .sorted((a, b) -> Integer.compare(
                        a.getOrden() != null ? a.getOrden() : 0,
                        b.getOrden() != null ? b.getOrden() : 0))
                .map(PropiedadImagen::getUrl)
                .toList();
    }
}
