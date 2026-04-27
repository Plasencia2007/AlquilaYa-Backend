package com.alquilaya.serviciopagos.services;

import com.alquilaya.serviciopagos.clients.ReservasClient;
import com.alquilaya.serviciopagos.dto.ReservaDetalleDTO;
import com.alquilaya.serviciopagos.entities.Pago;
import com.alquilaya.serviciopagos.exceptions.WebhookInvalidoException;
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
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.kafka.core.KafkaTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class PagoService {

    private final PagoRepository pagoRepository;
    private final ReservasClient reservasClient;
    private final KafkaTemplate<String, String> kafkaTemplate;

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

            PreferenceClient client = new PreferenceClient();
            Preference preference = client.create(preferenceRequest);

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
            // Excepciones de Resilience4j: que las maneje GlobalExceptionHandler
            throw e;
        } catch (java.util.concurrent.CompletionException e) {
            // CompletableFuture.join() envuelve excepciones; desempaquetar para que el handler las atrape
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

        // 1. Validar firma HMAC (si hay secret configurado)
        verificarFirma(xSignature, xRequestId, dataIdQuery != null ? dataIdQuery : paymentIdStr);

        // 2. Idempotencia: si ya procesamos este paymentId, salir silenciosamente.
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

        if (!"approved".equals(payment.getStatus())) {
            log.info("Pago no aprobado (status={}), se ignora. paymentId={}", payment.getStatus(), paymentIdStr);
            return;
        }

        String reservaIdStr = payment.getExternalReference();
        if (reservaIdStr == null) {
            throw new WebhookInvalidoException("Payment sin externalReference");
        }
        Long reservaId = Long.parseLong(reservaIdStr);

        Pago pagoPendiente = pagoRepository
                .findFirstByReservaIdAndEstadoOrderByFechaCreacionDesc(reservaId, "PENDIENTE")
                .orElseThrow(() -> new WebhookInvalidoException(
                        "No existe pago PENDIENTE para la reserva " + reservaId));

        // 4. Validar que el monto pagado coincide con el esperado (tolerancia de 0.01 PEN por redondeo).
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
        pagoRepository.save(pagoPendiente);

        log.info("💰 Pago confirmado. reservaId={} paymentId={} monto={}",
                reservaId, paymentIdStr, montoReal);
        kafkaTemplate.send("pagos-topic", "PAGO_EXITOSO:" + reservaIdStr);
    }

    /**
     * Verifica la firma HMAC-SHA256 del webhook según el formato de Mercado Pago.
     * Header "x-signature" tiene forma "ts=<epoch>,v1=<sha256hex>". El manifest es:
     *   id:{data.id};request-id:{x-request-id};ts:{ts};
     * Si no hay secret configurado, se omite la validación (solo para desarrollo).
     */
    private void verificarFirma(String xSignature, String xRequestId, String dataId) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.warn("⚠️ MP_WEBHOOK_SECRET vacío: firma del webhook NO validada (OK en dev, NO en prod)");
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

    public void simularPagoExitoso(Long reservaId) {
        log.info("🧪 SIMULACIÓN: Disparando pago exitoso para Reserva ID: {}", reservaId);

        pagoRepository.findFirstByReservaIdAndEstadoOrderByFechaCreacionDesc(reservaId, "PENDIENTE").ifPresent(p -> {
            p.setEstado("PAGADO");
            p.setPaymentId("SIM-123456");
            p.setFechaPago(LocalDateTime.now());
            pagoRepository.save(p);
        });

        kafkaTemplate.send("pagos-topic", "PAGO_EXITOSO:" + reservaId);
        log.info("✅ Evento PAGO_EXITOSO enviado a Kafka para Reserva ID: {}", reservaId);
    }
}
