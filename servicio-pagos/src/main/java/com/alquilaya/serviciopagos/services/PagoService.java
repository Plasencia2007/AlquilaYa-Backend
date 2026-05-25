package com.alquilaya.serviciopagos.services;

import com.alquilaya.serviciopagos.clients.ReservasClient;
import com.alquilaya.serviciopagos.dto.ReservaDetalleDTO;
import com.alquilaya.serviciopagos.entities.Pago;
import com.alquilaya.serviciopagos.exceptions.WebhookInvalidoException;
import com.alquilaya.serviciopagos.outbox.publisher.OutboxPublisher;
import com.alquilaya.serviciopagos.repositories.PagoRepository;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.preference.PreferenceBackUrlsRequest;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.client.preference.PreferenceItemRequest;
import com.mercadopago.client.preference.PreferenceRequest;
import com.mercadopago.resources.payment.Payment;
import com.mercadopago.resources.preference.Preference;
import io.github.resilience4j.bulkhead.BulkheadFullException;
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
public class PagoService {

    private final PagoRepository pagoRepository;
    private final ReservasClient reservasClient;
    private final OutboxPublisher outboxPublisher;
    /** Opcional: si Redis está down/no configurado, hacemos fallback graceful. */
    private final StringRedisTemplate redisTemplate;

    public PagoService(PagoRepository pagoRepository,
                       ReservasClient reservasClient,
                       OutboxPublisher outboxPublisher,
                       @Autowired(required = false) StringRedisTemplate redisTemplate) {
        this.pagoRepository = pagoRepository;
        this.reservasClient = reservasClient;
        this.outboxPublisher = outboxPublisher;
        this.redisTemplate = redisTemplate;
    }

    @Value("${mercadopago.back-urls.success}")
    private String urlSuccess;

    @Value("${mercadopago.back-urls.failure}")
    private String urlFailure;

    @Value("${mercadopago.back-urls.pending}")
    private String urlPending;

    @Value("${mercadopago.notification-url}")
    private String notificationUrl;

    @Value("${mercadopago.webhook-secret:}")
    private String webhookSecret;

    /** Si true, la firma HMAC del webhook es OBLIGATORIA. Default true (prod). */
    @Value("${mercadopago.webhook.required-signature:true}")
    private boolean webhookSignatureRequired;

    private static final String REDIS_LOCK_PREFIX = "pagos:webhook:lock:";
    private static final Duration REDIS_LOCK_TTL = Duration.ofSeconds(30);

    @TimeLimiter(name = "obtenerReservaCB")
    @CircuitBreaker(name = "obtenerReservaCB", fallbackMethod = "fallbackObtenerReserva")
    @Retry(name = "obtenerReservaCB")
    @Bulkhead(name = "obtenerReservaCB", type = Bulkhead.Type.SEMAPHORE)
    public CompletableFuture<ReservaDetalleDTO> obtenerReservaResiliente(Long reservaId) {
        log.info("[Resilience4j] Llamando a servicio-propiedades para reserva {}", reservaId);
        var attrs = org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
        return CompletableFuture.supplyAsync(() -> {
            org.springframework.web.context.request.RequestContextHolder.setRequestAttributes(attrs);
            try {
                return reservasClient.obtenerReserva(reservaId);
            } finally {
                org.springframework.web.context.request.RequestContextHolder.resetRequestAttributes();
            }
        });
    }

    @SuppressWarnings("unused")
    private CompletableFuture<ReservaDetalleDTO> fallbackObtenerReserva(Long reservaId, Throwable t) {
        log.error("[FALLBACK] obtenerReserva({}) — {}: {}",
                reservaId, t.getClass().getSimpleName(), t.getMessage());
        throw new IllegalStateException(
                "Servicio de reservas temporalmente no disponible. Causa: " + t.getClass().getSimpleName());
    }

    @TimeLimiter(name = "crearPreferenciaCB")
    @CircuitBreaker(name = "crearPreferenciaCB", fallbackMethod = "fallbackCrearPreferencia")
    @Retry(name = "crearPreferenciaCB")
    @Bulkhead(name = "crearPreferenciaCB", type = Bulkhead.Type.SEMAPHORE)
    @RateLimiter(name = "crearPreferenciaCB", fallbackMethod = "fallbackCrearPreferencia")
    public CompletableFuture<Preference> crearPreferenciaResiliente(PreferenceRequest preferenceRequest) {
        log.info("[Resilience4j] Llamando a Mercado Pago para crear preferencia externa");
        return CompletableFuture.supplyAsync(() -> {
            try {
                PreferenceClient client = new PreferenceClient();
                return client.create(preferenceRequest);
            } catch (Exception e) {
                throw new RuntimeException("Error contactando a Mercado Pago: " + e.getMessage(), e);
            }
        });
    }

    @SuppressWarnings("unused")
    private CompletableFuture<Preference> fallbackCrearPreferencia(PreferenceRequest preferenceRequest, Throwable t) {
        log.error("[FALLBACK] crearPreferencia — {}: {}", t.getClass().getSimpleName(), t.getMessage());
        throw new IllegalStateException("El servicio de pagos externos (Mercado Pago) no está disponible temporalmente.");
    }

    public String crearPreferencia(Long reservaId) {
        try {
            log.info("Iniciando creación de preferencia para Reserva ID: {}", reservaId);

            var pagoExistente = pagoRepository.findFirstByReservaIdAndEstadoOrderByFechaCreacionDesc(reservaId, "PAGADO");
            if (pagoExistente.isPresent()) {
                throw new RuntimeException("La reserva " + reservaId + " ya fue pagada");
            }

            ReservaDetalleDTO reserva = obtenerReservaResiliente(reservaId).join();

            // Validar campos críticos para Mercado Pago
            String nombrePagador = (reserva.getEstudianteNombre() != null && !reserva.getEstudianteNombre().isEmpty())
                    ? reserva.getEstudianteNombre() : "Estudiante AlquilaYa";
            String emailPagador = (reserva.getEstudianteCorreo() != null && !reserva.getEstudianteCorreo().isEmpty())
                    ? reserva.getEstudianteCorreo() : "estudiante@test.com";

            PreferenceItemRequest itemRequest = PreferenceItemRequest.builder()
                    .id(reserva.getId().toString())
                    .title("Reserva AlquilaYa: " + (reserva.getPropiedadTitulo() != null ? reserva.getPropiedadTitulo() : "Habitación"))
                    .quantity(1)
                    .unitPrice(reserva.getMontoTotal())
                    .currencyId("PEN")
                    .build();

            List<PreferenceItemRequest> items = new ArrayList<>();
            items.add(itemRequest);

            PreferenceBackUrlsRequest backUrls = PreferenceBackUrlsRequest.builder()
                    .success(urlSuccess)
                    .failure(urlFailure)
                    .pending(urlPending)
                    .build();

            // Configurar el pagador (Payer) con datos validados
            com.mercadopago.client.preference.PreferencePayerRequest payer = com.mercadopago.client.preference.PreferencePayerRequest.builder()
                    .name(nombrePagador)
                    .email(emailPagador)
                    .build();

            PreferenceRequest preferenceRequest = PreferenceRequest.builder()
                    .items(items)
                    .payer(payer)
                    .backUrls(backUrls)
                    .notificationUrl(notificationUrl)
                    .externalReference(reserva.getId().toString())
                    .expires(true)
                    .expirationDateTo(OffsetDateTime.now().plusDays(2))
                    .build();

            Preference preference = crearPreferenciaResiliente(preferenceRequest).join();

            Pago pago = Pago.builder()
                    .reservaId(reservaId)
                    .preferenciaId(preference.getId())
                    .monto(reserva.getMontoTotal())
                    .estado("PENDIENTE")
                    .build();
            pagoRepository.save(pago);

            log.info("✅ Preferencia creada exitosamente: {}", preference.getId());
            return preference.getInitPoint();

        } catch (IllegalStateException | CallNotPermittedException | BulkheadFullException e) {
            throw e;
        } catch (java.util.concurrent.CompletionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            if (cause instanceof IllegalStateException ise) throw ise;
            if (cause instanceof CallNotPermittedException cne) throw cne;
            if (cause instanceof BulkheadFullException bfe) throw bfe;
            if (cause instanceof java.util.concurrent.TimeoutException) {
                throw new RuntimeException("Timeout consultando reserva: " + cause.getMessage());
            }
            log.error("❌ Error FATAL creando preferencia de Mercado Pago: {}", cause.getMessage(), cause);
            throw new RuntimeException("No se pudo generar el link de pago: " + cause.getMessage());
        } catch (Exception e) {
            log.error("❌ Error FATAL creando preferencia de Mercado Pago: {}", e.getMessage(), e);
            throw new RuntimeException("No se pudo generar el link de pago: " + e.getMessage());
        }
    }

    @Transactional
    public void procesarWebhook(String xSignature, String xRequestId, String dataIdQuery,
                                Map<String, Object> notification) {
        String type = (String) notification.get("type");
        if (!"payment".equals(type)) {
            log.debug("Webhook ignorado: type={}", type);
            return;
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) notification.get("data");
        if (data == null || data.get("id") == null) {
            throw new WebhookInvalidoException("Payload sin data.id");
        }
        String paymentIdStr = data.get("id").toString();

        // 1. Validar firma HMAC (obligatoria en prod).
        verificarFirma(xSignature, xRequestId, dataIdQuery != null ? dataIdQuery : paymentIdStr);

        // 2. Lock distribuido en Redis para idempotencia atómica.
        //    Si otro proceso ya tiene el lock o el pago ya fue procesado → salir 200 OK.
        String lockKey = REDIS_LOCK_PREFIX + paymentIdStr;
        String lockValue = UUID.randomUUID().toString();
        boolean lockAcquired = adquirirLockRedis(lockKey, lockValue);
        boolean redisDisponible = (lockAcquired || redisTemplate != null);

        if (redisTemplate != null && !lockAcquired) {
            // Lock detentado por otro proceso → idempotente, no procesamos.
            log.info("🔒 Webhook concurrente detectado para paymentId={} (lock no adquirido). Ignorando.", paymentIdStr);
            return;
        }

        try {
            // Fallback graceful o doble-check post-lock: si el pago ya está procesado, salir.
            if (pagoRepository.findByPaymentId(paymentIdStr).isPresent()) {
                log.info("↩️ Webhook duplicado ignorado. paymentId={}", paymentIdStr);
                return;
            }

            // 3. Consultar el pago real contra la API de Mercado Pago (source of truth).
            Payment payment;
            try {
                payment = new PaymentClient().get(Long.parseLong(paymentIdStr));
            } catch (Exception e) {
                log.error("No se pudo consultar el Payment {} en Mercado Pago: {}", paymentIdStr, e.getMessage());
                throw new WebhookInvalidoException("No se pudo verificar el pago con Mercado Pago");
            }

            String status = payment.getStatus();
            String reservaIdStr = payment.getExternalReference();
            if (reservaIdStr == null) {
                throw new WebhookInvalidoException("Payment sin externalReference");
            }
            Long reservaId = Long.parseLong(reservaIdStr);

            Pago pagoPendiente = pagoRepository
                    .findFirstByReservaIdAndEstadoOrderByFechaCreacionDesc(reservaId, "PENDIENTE")
                    .orElseThrow(() -> new WebhookInvalidoException(
                            "No existe pago PENDIENTE para la reserva " + reservaId));

            switch (status == null ? "" : status) {
                case "approved" -> manejarAprobado(pagoPendiente, payment, paymentIdStr, reservaId, reservaIdStr);
                case "rejected" -> manejarRechazado(pagoPendiente, paymentIdStr, reservaId, reservaIdStr);
                case "pending", "in_process", "in_mediation" ->
                        manejarPendiente(pagoPendiente, paymentIdStr, reservaId, status);
                default -> log.info(
                        "Pago con estado no manejado (status={}), se ignora. paymentId={}", status, paymentIdStr);
            }

        } finally {
            // 4. Liberar lock (solo si lo adquirimos).
            if (lockAcquired) {
                liberarLockRedis(lockKey, lockValue);
            }
            // Suprimir warning de variable no usada (mantener intención del check redisDisponible)
            if (!redisDisponible) {
                log.trace("Redis no disponible en este flujo");
            }
        }
    }

    private void manejarAprobado(Pago pagoPendiente, Payment payment, String paymentIdStr,
                                 Long reservaId, String reservaIdStr) {
        // Validar que el monto pagado coincide con el esperado (tolerancia de 0.01 PEN).
        BigDecimal montoEsperado = pagoPendiente.getMonto();
        BigDecimal montoReal = payment.getTransactionAmount() != null
                ? BigDecimal.valueOf(payment.getTransactionAmount().doubleValue())
                : BigDecimal.ZERO;
        if (montoEsperado.setScale(2, RoundingMode.HALF_UP)
                .subtract(montoReal.setScale(2, RoundingMode.HALF_UP))
                .abs()
                .compareTo(new BigDecimal("0.01")) > 0) {
            log.error("Monto pagado ({}) no coincide con el esperado ({}) para reserva {}. PaymentId={}",
                    montoReal, montoEsperado, reservaId, paymentIdStr);
            throw new WebhookInvalidoException("Monto pagado no coincide con el esperado");
        }

        pagoPendiente.setEstado("PAGADO");
        pagoPendiente.setPaymentId(paymentIdStr);
        pagoPendiente.setFechaPago(LocalDateTime.now());
        Pago guardado = pagoRepository.save(pagoPendiente);

        log.info("💰 Pago confirmado. reservaId={} paymentId={} monto={}",
                reservaId, paymentIdStr, montoReal);

        Map<String, Object> payload = new HashMap<>();
        payload.put("pagoId", guardado.getId());
        payload.put("reservaId", reservaId);
        payload.put("monto", guardado.getMonto());
        payload.put("moneda", "PEN");
        payload.put("paymentId", paymentIdStr);
        payload.put("fechaPago", guardado.getFechaPago() != null
                ? guardado.getFechaPago().toInstant(ZoneOffset.UTC).toString()
                : null);
        outboxPublisher.publicar(
                "pagos-topic",
                "PAGO_EXITOSO",
                "Pago",
                guardado.getId().toString(),
                payload,
                MDC.get("correlationId"));
    }

    private void manejarRechazado(Pago pagoPendiente, String paymentIdStr,
                                  Long reservaId, String reservaIdStr) {
        pagoPendiente.setEstado("RECHAZADO");
        pagoPendiente.setPaymentId(paymentIdStr);
        pagoPendiente.setFechaPago(LocalDateTime.now());
        Pago guardado = pagoRepository.save(pagoPendiente);
        log.warn("❌ Pago RECHAZADO. reservaId={} paymentId={}", reservaId, paymentIdStr);
        // Emitir evento para que propiedades libere el slot. NO enviamos PAGO_EXITOSO.
        Map<String, Object> payload = new HashMap<>();
        payload.put("pagoId", guardado.getId());
        payload.put("reservaId", reservaId);
        payload.put("monto", guardado.getMonto());
        payload.put("moneda", "PEN");
        payload.put("paymentId", paymentIdStr);
        payload.put("motivo", "REJECTED_BY_MP");
        outboxPublisher.publicar(
                "pagos-topic",
                "PAGO_FALLIDO",
                "Pago",
                guardado.getId().toString(),
                payload,
                MDC.get("correlationId"));
    }

    private void manejarPendiente(Pago pagoPendiente, String paymentIdStr,
                                  Long reservaId, String status) {
        pagoPendiente.setEstado("PENDIENTE_REVISION");
        pagoPendiente.setPaymentId(paymentIdStr);
        Pago guardado = pagoRepository.save(pagoPendiente);
        log.info("⏳ Pago en estado pendiente de revisión ({}). reservaId={} paymentId={}",
                status, reservaId, paymentIdStr);
        // Ola 2: emitir PAGO_EN_REVISION para que mensajería notifique al estudiante.
        Map<String, Object> payload = new HashMap<>();
        payload.put("pagoId", guardado.getId());
        payload.put("reservaId", reservaId);
        payload.put("estadoMp", status);
        outboxPublisher.publicar(
                "pagos-topic",
                "PAGO_EN_REVISION",
                "Pago",
                guardado.getId().toString(),
                payload,
                MDC.get("correlationId"));
    }

    /**
     * Intenta adquirir un lock con SET NX EX en Redis.
     * Retorna true si el lock fue adquirido por nosotros.
     * Si Redis no está disponible, retorna false y deja que el flujo continúe
     * con el check no-atómico tradicional (graceful degradation).
     */
    private boolean adquirirLockRedis(String key, String value) {
        if (redisTemplate == null) {
            log.warn("⚠️ Redis no configurado: idempotencia degradada al check de BD (no atómico).");
            return false;
        }
        try {
            Boolean ok = redisTemplate.opsForValue().setIfAbsent(key, value, REDIS_LOCK_TTL);
            return Boolean.TRUE.equals(ok);
        } catch (Exception e) {
            log.warn("⚠️ Redis no disponible al adquirir lock '{}': {}. Fallback a check de BD.",
                    key, e.getMessage());
            return false;
        }
    }

    private void liberarLockRedis(String key, String expectedValue) {
        if (redisTemplate == null) return;
        try {
            // Borra solo si el valor coincide (evita borrar lock de otro proceso si nos pasamos del TTL).
            String current = redisTemplate.opsForValue().get(key);
            if (expectedValue.equals(current)) {
                redisTemplate.delete(key);
            }
        } catch (Exception e) {
            log.warn("⚠️ Error liberando lock Redis '{}': {}", key, e.getMessage());
        }
    }

    /**
     * Verifica la firma HMAC-SHA256 del webhook según el formato de Mercado Pago.
     * Header "x-signature" tiene forma "ts=<epoch>,v1=<sha256hex>". El manifest es:
     *   id:{data.id};request-id:{x-request-id};ts:{ts};
     *
     * Comportamiento según {@code mercadopago.webhook.required-signature}:
     *  - true  (default/prod): si el secret está vacío o la firma no matchea → 4xx.
     *  - false (dev/local):   si el secret está vacío, se omite (warning).
     */
    private void verificarFirma(String xSignature, String xRequestId, String dataId) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            if (webhookSignatureRequired) {
                log.error("MP_WEBHOOK_SECRET vacío y la firma es OBLIGATORIA. Rechazando webhook.");
                throw new WebhookInvalidoException(
                        "Firma de webhook obligatoria pero secret no configurado");
            }
            log.warn("⚠️ MP_WEBHOOK_SECRET vacío: firma NO validada (perfil dev/local).");
            return;
        }
        if (xSignature == null || xSignature.isBlank()) {
            throw new WebhookInvalidoException("Falta header x-signature");
        }

        String ts = null, v1 = null;
        for (String part : xSignature.split(",")) {
            String[] kv = part.trim().split("=", 2);
            if (kv.length != 2) continue;
            if ("ts".equals(kv[0])) ts = kv[1];
            else if ("v1".equals(kv[0])) v1 = kv[1];
        }
        if (ts == null || v1 == null) {
            throw new WebhookInvalidoException("x-signature mal formado");
        }

        String manifest = "id:" + dataId + ";request-id:" + xRequestId + ";ts:" + ts + ";";
        String esperado;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            esperado = HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new WebhookInvalidoException("Error calculando firma: " + e.getMessage());
        }

        if (!constantTimeEquals(esperado, v1)) {
            log.warn("Firma de webhook inválida. esperado={} recibido={}", esperado, v1);
            throw new WebhookInvalidoException("Firma de webhook inválida");
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) return false;
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }

    @Transactional
    public void simularPagoExitoso(Long reservaId) {
        log.info("🧪 SIMULACIÓN: Disparando pago exitoso para Reserva ID: {}", reservaId);

        Pago guardado = pagoRepository.findFirstByReservaIdAndEstadoOrderByFechaCreacionDesc(reservaId, "PENDIENTE")
                .map(p -> {
                    p.setEstado("PAGADO");
                    p.setPaymentId("SIM-" + reservaId + "-" + System.currentTimeMillis());
                    p.setFechaPago(LocalDateTime.now());
                    return pagoRepository.save(p);
                })
                .orElse(null);

        if (guardado == null) {
            log.warn("simularPagoExitoso: no se encontró pago PENDIENTE para reservaId={}", reservaId);
            return;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("pagoId", guardado.getId());
        payload.put("reservaId", reservaId);
        payload.put("monto", guardado.getMonto());
        payload.put("moneda", "PEN");
        payload.put("paymentId", guardado.getPaymentId());
        payload.put("fechaPago", guardado.getFechaPago() != null
                ? guardado.getFechaPago().toInstant(ZoneOffset.UTC).toString()
                : null);
        outboxPublisher.publicar(
                "pagos-topic",
                "PAGO_EXITOSO",
                "Pago",
                guardado.getId().toString(),
                payload,
                MDC.get("correlationId"));
        log.info("✅ Evento PAGO_EXITOSO encolado en outbox para Reserva ID: {}", reservaId);
    }
}
