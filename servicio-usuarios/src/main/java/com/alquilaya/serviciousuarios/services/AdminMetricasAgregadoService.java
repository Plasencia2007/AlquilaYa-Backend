package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.clients.PagosClient;
import com.alquilaya.serviciousuarios.clients.PropiedadPendienteDTO;
import com.alquilaya.serviciousuarios.clients.PropiedadesAdminClient;
import com.alquilaya.serviciousuarios.clients.ResumenFinancieroDTO;
import com.alquilaya.serviciousuarios.dto.MetricasAgregadoDTO;
import com.alquilaya.serviciousuarios.enums.Rol;
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Ítem 354: arma el response agregado de {@code GET /api/v1/usuarios/admin/metricas}, que
 * reemplaza las 6 llamadas client-side que antes hacía {@code metrics/page.tsx} vía
 * {@code Promise.allSettled}.
 *
 * <p><b>Resiliencia:</b> las dos secciones que dependen de otro microservicio
 * ({@link #obtenerResumenFinancieroResiliente()} → servicio-pagos,
 * {@link #obtenerPropiedadesPendientesResiliente()} → servicio-propiedades) siguen EXACTAMENTE
 * el patrón de {@code PagoService#obtenerReservaResiliente} en servicio-pagos:
 * {@code @TimeLimiter + @CircuitBreaker(fallbackMethod=...) + @Retry + @Bulkhead(SEMAPHORE)}
 * sobre un método que devuelve {@code CompletableFuture}. A diferencia de ese caso (donde el
 * fallback relanza una excepción porque un pago sin datos de la reserva no puede continuar),
 * acá el {@code fallbackMethod} devuelve un future YA RESUELTO en {@code null} — el mismo
 * espíritu que el {@code Promise.allSettled} que este endpoint reemplaza: si pagos o
 * propiedades están caídos (circuito abierto, timeout, lo que sea), esa sección del response
 * agregado queda {@code null}/vacía, pero el resto (usuarios por rol, registros por semana,
 * ambos 100% locales) sigue presente y el endpoint NUNCA responde 500 completo por eso.
 */
@Slf4j
@Service
public class AdminMetricasAgregadoService {

    private final PagosClient pagosClient;
    private final PropiedadesAdminClient propiedadesAdminClient;
    private final UsuarioService usuarioService;
    private final UsuarioMetricasService usuarioMetricasService;
    /**
     * Auto-referencia vía proxy (mismo idiom que {@code PagoService#self}): las anotaciones de
     * Resilience4j (@TimeLimiter/@CircuitBreaker/@Retry/@Bulkhead) son AOP de Spring — si
     * {@link #obtenerMetricasAgregadas()} llamara a {@link #obtenerResumenFinancieroResiliente()}
     * por {@code this.} directamente (auto-invocación), la llamada NUNCA pasaría por el proxy y
     * esas anotaciones quedarían inertes (el circuito nunca se abriría, el timeout no aplicaría).
     * Por eso se invocan vía {@code self} más abajo.
     */
    private final AdminMetricasAgregadoService self;

    public AdminMetricasAgregadoService(PagosClient pagosClient,
                                        PropiedadesAdminClient propiedadesAdminClient,
                                        UsuarioService usuarioService,
                                        UsuarioMetricasService usuarioMetricasService,
                                        @Lazy @Autowired AdminMetricasAgregadoService self) {
        this.pagosClient = pagosClient;
        this.propiedadesAdminClient = propiedadesAdminClient;
        this.usuarioService = usuarioService;
        this.usuarioMetricasService = usuarioMetricasService;
        this.self = self;
    }

    @Transactional(readOnly = true)
    public MetricasAgregadoDTO obtenerMetricasAgregadas() {
        // Se disparan primero (en paralelo, async, vía `self` para que el proxy de Resilience4j
        // SÍ intercepte — ver el Javadoc de `self`) las dos llamadas remotas resilientes, y
        // MIENTRAS TANTO se resuelve en el hilo actual todo lo local (sin red, rápido) — así el
        // tiempo total no es la suma de las 4 fuentes sino, en la práctica, el máximo entre
        // {resumen financiero, propiedades pendientes} y el trabajo local.
        CompletableFuture<ResumenFinancieroDTO> resumenFuture = self.obtenerResumenFinancieroResiliente();
        CompletableFuture<List<PropiedadPendienteDTO>> pendientesFuture = self.obtenerPropiedadesPendientesResiliente();

        long estudiantes = usuarioService.listarPorRol(Rol.ESTUDIANTE).size();
        long arrendadores = usuarioService.listarPorRol(Rol.ARRENDADOR).size();
        long admins = usuarioService.listarPorRol(Rol.ADMIN).size();

        // Mismos defaults que AdminMetricasController#registrosPorSemana: últimas 12 semanas
        // hasta hoy.
        LocalDate hastaFecha = LocalDate.now();
        LocalDate desdeFecha = hastaFecha.minusWeeks(12);
        var registros = usuarioMetricasService.registrosPorSemana(
                desdeFecha.atStartOfDay(), hastaFecha.plusDays(1).atStartOfDay());

        ResumenFinancieroDTO resumen = joinOrNull(resumenFuture, "resumen financiero (servicio-pagos)");
        List<PropiedadPendienteDTO> pendientes = joinOrNull(pendientesFuture, "propiedades pendientes (servicio-propiedades)");

        return new MetricasAgregadoDTO(
                resumen,
                pendientes != null ? (long) pendientes.size() : null,
                estudiantes,
                arrendadores,
                admins,
                registros);
    }

    @TimeLimiter(name = "pagosResumenCB")
    @CircuitBreaker(name = "pagosResumenCB", fallbackMethod = "fallbackResumenFinanciero")
    @Retry(name = "pagosResumenCB")
    @Bulkhead(name = "pagosResumenCB", type = Bulkhead.Type.SEMAPHORE)
    public CompletableFuture<ResumenFinancieroDTO> obtenerResumenFinancieroResiliente() {
        log.info("[Resilience4j] Llamando a servicio-pagos para el resumen financiero agregado");
        // El Authorization del admin viaje al hilo async (FeignConfig#requestInterceptor lee
        // RequestContextHolder) — mismo patrón que PagoService#obtenerReservaResiliente.
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        return CompletableFuture.supplyAsync(() -> {
            RequestContextHolder.setRequestAttributes(attrs);
            try {
                return pagosClient.obtenerResumenFinanciero();
            } finally {
                RequestContextHolder.resetRequestAttributes();
            }
        });
    }

    @SuppressWarnings("unused")
    private CompletableFuture<ResumenFinancieroDTO> fallbackResumenFinanciero(Throwable t) {
        log.error("[FALLBACK] resumenFinanciero (métricas agregadas) — {}: {}",
                t.getClass().getSimpleName(), t.getMessage());
        return CompletableFuture.completedFuture(null);
    }

    @TimeLimiter(name = "propiedadesPendientesCB")
    @CircuitBreaker(name = "propiedadesPendientesCB", fallbackMethod = "fallbackPropiedadesPendientes")
    @Retry(name = "propiedadesPendientesCB")
    @Bulkhead(name = "propiedadesPendientesCB", type = Bulkhead.Type.SEMAPHORE)
    public CompletableFuture<List<PropiedadPendienteDTO>> obtenerPropiedadesPendientesResiliente() {
        log.info("[Resilience4j] Llamando a servicio-propiedades por propiedades pendientes (métricas agregadas)");
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        return CompletableFuture.supplyAsync(() -> {
            RequestContextHolder.setRequestAttributes(attrs);
            try {
                return propiedadesAdminClient.listarPendientes();
            } finally {
                RequestContextHolder.resetRequestAttributes();
            }
        });
    }

    @SuppressWarnings("unused")
    private CompletableFuture<List<PropiedadPendienteDTO>> fallbackPropiedadesPendientes(Throwable t) {
        log.error("[FALLBACK] propiedadesPendientes (métricas agregadas) — {}: {}",
                t.getClass().getSimpleName(), t.getMessage());
        return CompletableFuture.completedFuture(null);
    }

    /**
     * Espera el resultado de una llamada ya protegida por Circuit Breaker/Retry/Bulkhead/
     * TimeLimiter (ver métodos de arriba, cuyos {@code fallbackMethod} ya devuelven un future
     * resuelto en {@code null}). Defensa en profundidad extra: si aun así {@code .join()}
     * lanzara (p.ej. el propio fallback fallara), se captura acá para que esta sección del
     * response quede {@code null} en vez de tumbar el endpoint agregado completo.
     */
    private static <T> T joinOrNull(CompletableFuture<T> future, String etiqueta) {
        try {
            return future.join();
        } catch (Exception e) {
            log.error("[Métricas agregadas] Fallo obteniendo {}: {}", etiqueta, e.getMessage());
            return null;
        }
    }
}
