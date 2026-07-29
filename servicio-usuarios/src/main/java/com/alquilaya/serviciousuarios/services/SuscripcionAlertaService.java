package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.dto.CrearSuscripcionAlertaRequest;
import com.alquilaya.serviciousuarios.dto.PropiedadAprobadaEventDTO;
import com.alquilaya.serviciousuarios.entities.SuscripcionAlerta;
import com.alquilaya.serviciousuarios.repositories.EnvioAlertaRepository;
import com.alquilaya.serviciousuarios.repositories.SuscripcionAlertaRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Lógica de las suscripciones anónimas a alertas de nuevas propiedades (#99/#492).
 *
 * <h3>Decisiones de diseño</h3>
 * <ul>
 *   <li><b>Idempotencia del alta:</b> re-suscribir el mismo correo con los mismos filtros no
 *       duplica filas ni falla (ver {@link #crear}). Nunca se revela al llamante si el correo
 *       ya estaba suscrito (anti-enumeración).</li>
 *   <li><b>Double opt-in:</b> el alta nace {@code confirmada = false}; solo recibe alertas tras
 *       confirmar el enlace por correo. Evita que un tercero suscriba a una víctima a spam.</li>
 *   <li><b>Anti-abuso por correo:</b> además del {@code RateLimitFilter} por IP, se limita el
 *       nº de correos de confirmación por dirección usando Redis (mismo mecanismo que
 *       {@code OtpRateLimitService}/{@code EmailRateLimitService}). Degradación grácil si Redis
 *       no responde.</li>
 * </ul>
 */
@Slf4j
@Service
public class SuscripcionAlertaService {

    /** Máximo de correos de confirmación por dirección dentro de la ventana. */
    private static final int MAX_CONFIRMACIONES = 5;
    private static final long CONFIRMACIONES_TTL_SECONDS = 3600; // 1 hora
    private static final String CONFIRM_RATE_PREFIX = "usuarios:alerta-sub:count:";

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final SuscripcionAlertaRepository repository;
    private final EnvioAlertaRepository envioAlertaRepository;
    private final EmailService emailService;
    private final StringRedisTemplate redisTemplate;

    @Autowired
    public SuscripcionAlertaService(SuscripcionAlertaRepository repository,
                                    EnvioAlertaRepository envioAlertaRepository,
                                    EmailService emailService,
                                    @Nullable StringRedisTemplate redisTemplate) {
        this.repository = repository;
        this.envioAlertaRepository = envioAlertaRepository;
        this.emailService = emailService;
        this.redisTemplate = redisTemplate;
    }

    // ---------------------------------------------------------------------
    // Alta (double opt-in, idempotente)
    // ---------------------------------------------------------------------

    /**
     * Da de alta (o reactiva) una suscripción y envía el correo de confirmación. Es idempotente
     * y no lanza aunque el correo ya estuviera suscrito. No devuelve nada que revele el estado
     * previo del correo.
     */
    @Transactional
    public void crear(CrearSuscripcionAlertaRequest req) {
        String correo = normalizar(req.getCorreo());

        Optional<SuscripcionAlerta> existente = repository.findByCorreoIgnoreCase(correo).stream()
                .filter(s -> mismosFiltros(s, req))
                .findFirst();

        if (existente.isPresent()) {
            SuscripcionAlerta s = existente.get();
            if (s.isActivo() && s.isConfirmada()) {
                // Ya suscrito y confirmado: nada que hacer (idempotente, sin reenviar correo).
                log.debug("[Alerta] Suscripción ya activa y confirmada; no-op");
                return;
            }
            // Pendiente de confirmar o dada de baja previamente → reactivar y reenviar confirmación.
            s.setActivo(true);
            s.setConfirmada(false);
            s.setFechaConfirmacion(null);
            s.setTokenConfirmacion(nuevoToken());
            if (s.getTokenBaja() == null) s.setTokenBaja(nuevoToken());
            repository.save(s);
            enviarConfirmacionConLimite(s);
            return;
        }

        SuscripcionAlerta nueva = SuscripcionAlerta.builder()
                .correo(correo)
                .zonaId(req.getZonaId())
                .universidadId(req.getUniversidadId())
                .precioMax(req.getPrecioMax())
                .tipoPropiedad(normalizarTipo(req.getTipoPropiedad()))
                .dormitoriosMin(req.getDormitoriosMin())
                .capacidadMin(req.getCapacidadMin())
                .servicios(normalizarServicios(req.getServicios()))
                .confirmada(false)
                .activo(true)
                .tokenConfirmacion(nuevoToken())
                .tokenBaja(nuevoToken())
                .fechaCreacion(LocalDateTime.now())
                .build();
        repository.save(nueva);
        enviarConfirmacionConLimite(nueva);
    }

    /** Confirma el alta (double opt-in). Idempotente; no revela si el token existía. */
    @Transactional
    public void confirmar(String token) {
        if (token == null || token.isBlank()) return;
        repository.findByTokenConfirmacion(token).ifPresent(s -> {
            if (!s.isConfirmada() || !s.isActivo()) {
                s.setConfirmada(true);
                s.setActivo(true);
                s.setFechaConfirmacion(LocalDateTime.now());
                repository.save(s);
                log.info("[Alerta] Suscripción {} confirmada", s.getId());
            }
        });
    }

    /** Da de baja una suscripción por su token. Idempotente; no revela si el token existía. */
    @Transactional
    public void darDeBaja(String token) {
        if (token == null || token.isBlank()) return;
        repository.findByTokenBaja(token).ifPresent(s -> {
            if (s.isActivo()) {
                s.setActivo(false);
                repository.save(s);
                log.info("[Alerta] Suscripción {} dada de baja", s.getId());
            }
        });
    }

    // ---------------------------------------------------------------------
    // Notificación ante propiedad aprobada
    // ---------------------------------------------------------------------

    /**
     * Busca las suscripciones que encajan con la propiedad recién aprobada y <b>encola</b> una
     * alerta PENDIENTE por cada una (tabla {@code envios_alerta}). NO envía el correo aquí: el
     * envío real, con reintentos y backoff, lo hace {@code EnvioAlertaScheduler} drenando la
     * cola. Así una caída puntual de SMTP ya no pierde alertas silenciosamente (antes el envío
     * era best-effort y el evento quedaba marcado como procesado sin reintento).
     *
     * <p><b>Idempotencia:</b> el encolado usa {@code INSERT ... ON CONFLICT DO NOTHING} sobre el
     * UNIQUE {@code (propiedadId, suscripcionId)}; un evento Kafka reentregado no duplica filas
     * ni correos. Se corre en la transacción del listener (encolado transaccional y rápido).</p>
     *
     * @return número de alertas efectivamente encoladas (excluye duplicados ya presentes).
     */
    @Transactional
    public int notificarPropiedadAprobada(PropiedadAprobadaEventDTO ev) {
        // La query resuelve los criterios escalares (zona, universidad, precio, tipo, dormitorios,
        // capacidad) y trae ya cargada la colección `servicios` (LEFT JOIN FETCH).
        List<SuscripcionAlerta> candidatas =
                repository.findCoincidencias(ev.zonaId(), ev.universidadId(), ev.precio(),
                        ev.tipoPropiedad(), ev.dormitorios(), ev.capacidad());

        // Filtro de `servicios` (subset ⊆) en Java sobre las colecciones ya cargadas: una
        // suscripción encaja si TODOS los servicios que pide están en los de la propiedad. Vacío en
        // la suscripción = no filtra. Si la propiedad no trae servicios pero la suscripción exige
        // alguno, no encaja (conservador, igual que el resto de criterios ausentes).
        Set<String> serviciosPropiedad = normalizarServicios(ev.servicios());
        List<SuscripcionAlerta> coincidencias = candidatas.stream()
                .filter(s -> serviciosCubiertos(serviciosPropiedad, s.getServicios()))
                .toList();

        if (coincidencias.isEmpty()) {
            log.debug("[Alerta] Propiedad {} aprobada: sin suscripciones coincidentes", ev.propiedadId());
            return 0;
        }
        LocalDateTime ahora = LocalDateTime.now();
        int encoladas = 0;
        for (SuscripcionAlerta s : coincidencias) {
            // ON CONFLICT DO NOTHING → 1 si insertó, 0 si el par ya estaba encolado (idempotente).
            int inserted = envioAlertaRepository.encolarPendiente(
                    ev.propiedadId(),
                    s.getId(),
                    s.getCorreo(),
                    ev.titulo(),
                    ev.precio(),
                    ev.ubicacion(),
                    ev.tipoPropiedad(),
                    s.getTokenBaja(),
                    ahora);
            encoladas += inserted;
        }
        log.info("[Alerta] Propiedad {} aprobada: {} alertas encoladas de {} coincidencias",
                ev.propiedadId(), encoladas, coincidencias.size());
        return encoladas;
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private void enviarConfirmacionConLimite(SuscripcionAlerta s) {
        if (!permiteEnviarConfirmacion(s.getCorreo())) {
            log.warn("[Alerta] Límite de correos de confirmación alcanzado para el correo; se omite el envío");
            return;
        }
        try {
            emailService.enviarConfirmacionSuscripcion(s.getCorreo(), s.getTokenConfirmacion(), s.getTokenBaja());
        } catch (Exception e) {
            log.error("[Alerta] Error enviando confirmación de suscripción: {}", e.getMessage());
        }
    }

    /**
     * Rate limit por CORREO de los correos de confirmación (defensa en profundidad junto al
     * límite por IP del {@code RateLimitFilter}). Degradación grácil: si Redis no responde,
     * permite el envío.
     */
    private boolean permiteEnviarConfirmacion(String correo) {
        if (redisTemplate == null) return true;
        try {
            String key = CONFIRM_RATE_PREFIX + correo;
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1L) {
                redisTemplate.expire(key, CONFIRMACIONES_TTL_SECONDS, TimeUnit.SECONDS);
            }
            return count == null || count <= MAX_CONFIRMACIONES;
        } catch (Exception e) {
            log.warn("[Alerta] Redis no disponible al limitar confirmaciones: {}", e.getMessage());
            return true;
        }
    }

    private static String normalizar(String correo) {
        return correo == null ? null : correo.trim().toLowerCase();
    }

    private static boolean mismosFiltros(SuscripcionAlerta s, CrearSuscripcionAlertaRequest req) {
        return Objects.equals(s.getZonaId(), req.getZonaId())
                && Objects.equals(s.getUniversidadId(), req.getUniversidadId())
                && Objects.equals(s.getPrecioMax(), req.getPrecioMax())
                && Objects.equals(normalizarTipo(s.getTipoPropiedad()), normalizarTipo(req.getTipoPropiedad()))
                && Objects.equals(s.getDormitoriosMin(), req.getDormitoriosMin())
                && Objects.equals(s.getCapacidadMin(), req.getCapacidadMin())
                && normalizarServicios(s.getServicios()).equals(normalizarServicios(req.getServicios()));
    }

    /** Trim del tipo; cadena vacía → {@code null} (equivale a "no filtra por tipo"). */
    private static String normalizarTipo(String tipo) {
        if (tipo == null) return null;
        String t = tipo.trim();
        return t.isEmpty() ? null : t;
    }

    /** Colección de servicios a {@code Set} no nulo (null/vacío → set vacío = "no filtra"). */
    private static Set<String> normalizarServicios(Collection<String> servicios) {
        if (servicios == null || servicios.isEmpty()) return new HashSet<>();
        Set<String> out = new HashSet<>(servicios.size());
        for (String s : servicios) {
            if (s != null && !s.isBlank()) out.add(s.trim());
        }
        return out;
    }

    /**
     * ¿La propiedad ofrece TODOS los servicios que exige la suscripción (subset ⊆)?
     * Suscripción sin servicios = no filtra (true). Si exige alguno y la propiedad no lo trae, false.
     */
    private static boolean serviciosCubiertos(Set<String> serviciosPropiedad, Set<String> serviciosSuscripcion) {
        Set<String> requeridos = normalizarServicios(serviciosSuscripcion);
        if (requeridos.isEmpty()) return true;
        return serviciosPropiedad.containsAll(requeridos);
    }

    /** Token URL-safe de 256 bits generado con {@link SecureRandom} (impredecible, no secuencial). */
    private static String nuevoToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
