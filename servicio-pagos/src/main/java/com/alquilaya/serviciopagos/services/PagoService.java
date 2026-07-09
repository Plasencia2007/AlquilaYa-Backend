package com.alquilaya.serviciopagos.services;

import com.alquilaya.serviciopagos.clients.ReservasClient;
import com.alquilaya.serviciopagos.config.CurrentUser;
import com.alquilaya.serviciopagos.dto.CuotaPagoDTO;
import com.alquilaya.serviciopagos.dto.EstadoPagoResponse;
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
import org.springframework.context.annotation.Lazy;
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
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
public class PagoService {

    private final PagoRepository pagoRepository;
    private final ReservasClient reservasClient;
    private final com.alquilaya.serviciopagos.clients.GruposClient gruposClient;
    private final OutboxPublisher outboxPublisher;
    /** Opcional: si Redis está down/no configurado, hacemos fallback graceful. */
    private final StringRedisTemplate redisTemplate;
    /** Auto-referencia (vía proxy) para que @Transactional surta efecto en llamadas internas. */
    private final PagoService self;

    public PagoService(PagoRepository pagoRepository,
                       ReservasClient reservasClient,
                       com.alquilaya.serviciopagos.clients.GruposClient gruposClient,
                       OutboxPublisher outboxPublisher,
                       @Autowired(required = false) StringRedisTemplate redisTemplate,
                       @Lazy PagoService self) {
        this.pagoRepository = pagoRepository;
        this.reservasClient = reservasClient;
        this.gruposClient = gruposClient;
        this.outboxPublisher = outboxPublisher;
        this.redisTemplate = redisTemplate;
        this.self = self;
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

    /** Monto mínimo cobrable. Por debajo, Mercado Pago rechaza el pago ("No pudimos procesar"). */
    @Value("${mercadopago.monto-minimo:5.00}")
    private BigDecimal montoMinimo;

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
            } catch (com.mercadopago.exceptions.MPApiException apiEx) {
                int code = apiEx.getStatusCode();
                // 4xx = datos/negocio inválidos: NO tiene sentido reintentar (crear
                // preferencia no es idempotente). IllegalStateException está en
                // ignoreExceptions del Retry/CircuitBreaker → no reintenta ni abre el circuito.
                if (code >= 400 && code < 500) {
                    throw new IllegalStateException(
                            "Mercado Pago rechazó la preferencia (HTTP " + code + "): " + apiEx.getMessage());
                }
                // 5xx = error transitorio del lado de MP → se permite reintento.
                throw new RuntimeException(
                        "Error transitorio de Mercado Pago (HTTP " + code + "): " + apiEx.getMessage(), apiEx);
            } catch (Exception e) {
                // Errores de transporte/conexión (MPException, IOException) → transitorios, reintentar.
                throw new RuntimeException("Error contactando a Mercado Pago: " + e.getMessage(), e);
            }
        });
    }

    @SuppressWarnings("unused")
    private CompletableFuture<Preference> fallbackCrearPreferencia(PreferenceRequest preferenceRequest, Throwable t) {
        // Si es un error de negocio (p.ej. MP rechazó la preferencia por datos), propagarlo
        // tal cual en vez de enmascararlo como "servicio no disponible".
        Throwable cause = (t instanceof java.util.concurrent.CompletionException && t.getCause() != null)
                ? t.getCause() : t;
        if (cause instanceof IllegalStateException ise) {
            throw ise;
        }
        log.error("[FALLBACK] crearPreferencia — {}: {}", t.getClass().getSimpleName(), t.getMessage());
        throw new IllegalStateException("El servicio de pagos externos (Mercado Pago) no está disponible temporalmente.");
    }

    public String crearPreferencia(Long reservaId, CurrentUser current) {
        try {
            log.info("Iniciando creación de preferencia para Reserva ID: {}", reservaId);

            var pagoExistente = pagoRepository.findFirstByReservaIdAndEstadoOrderByFechaCreacionDesc(reservaId, "PAGADO");
            if (pagoExistente.isPresent()) {
                throw new RuntimeException("La reserva " + reservaId + " ya fue pagada");
            }

            ReservaDetalleDTO reserva = obtenerReservaResiliente(reservaId).join();

            // Defensa anti-IDOR: solo el estudiante dueño puede generar el link de pago.
            if (current == null || current.getPerfilId() == null
                    || reserva.getEstudianteId() == null
                    || !current.getPerfilId().equals(reserva.getEstudianteId())) {
                throw new IllegalStateException("No puedes pagar una reserva que no es tuya");
            }

            // Las reservas grupales (#38 Fase 2) se pagan por cuotas → usar crearPreferenciaGrupo.
            if (reserva.getGrupoId() != null) {
                throw new IllegalStateException(
                        "Esta reserva es grupal: cada miembro paga su cuota (pago dividido).");
            }

            // Solo se puede pagar una reserva APROBADA por el arrendador. Antes de aprobar
            // (SOLICITADA) o en cualquier otro estado (CANCELADA/RECHAZADA/EXPIRADA/PAGADA) NO
            // se genera el link: evita capturar dinero sobre una reserva que no va a avanzar
            // (y que la saga no reconciliaría, dejando el pago sin reembolso).
            if (!"APROBADA".equalsIgnoreCase(reserva.getEstado())) {
                throw new IllegalStateException(
                        "Solo puedes pagar una reserva aprobada por el arrendador. Estado actual: "
                                + reserva.getEstado());
            }

            // Validar campos críticos para Mercado Pago
            String nombrePagador = (reserva.getEstudianteNombre() != null && !reserva.getEstudianteNombre().isEmpty())
                    ? reserva.getEstudianteNombre() : "Estudiante AlquilaYa";
            String emailPagador = (reserva.getEstudianteCorreo() != null && !reserva.getEstudianteCorreo().isEmpty())
                    ? reserva.getEstudianteCorreo() : "estudiante@test.com";

            // El estudiante paga el precio del cuarto + la comisión de plataforma (modelo
            // "comisión sumada al estudiante"). El arrendador recibe el montoTotal íntegro.
            BigDecimal montoArrendador = reserva.getMontoTotal();
            BigDecimal comision = reserva.getComision() != null
                    ? reserva.getComision().setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            BigDecimal montoCobrado = montoArrendador.add(comision).setScale(2, RoundingMode.HALF_UP);

            // Guard de monto mínimo: por debajo, MP rechaza el pago con un error genérico
            // ("No pudimos procesar tu pago"). Mejor cortar acá con un mensaje claro.
            if (montoCobrado.compareTo(montoMinimo) < 0) {
                throw new IllegalStateException(
                        "El monto mínimo de pago es S/ " + montoMinimo.toPlainString()
                                + ". Esta reserva (S/ " + montoCobrado.toPlainString() + ") no puede pagarse en línea.");
            }

            List<PreferenceItemRequest> items = new ArrayList<>();
            items.add(PreferenceItemRequest.builder()
                    .id(reserva.getId().toString())
                    .title("Reserva AlquilaYa: " + (reserva.getPropiedadTitulo() != null ? reserva.getPropiedadTitulo() : "Habitación"))
                    .quantity(1)
                    .unitPrice(montoArrendador)
                    .currencyId("PEN")
                    .build());
            if (comision.signum() > 0) {
                items.add(PreferenceItemRequest.builder()
                        .id("comision-" + reserva.getId())
                        .title("Comisión de servicio AlquilaYa")
                        .quantity(1)
                        .unitPrice(comision)
                        .currencyId("PEN")
                        .build());
            }

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
                    // OJO: NO usar auto_return con back_urls.success en localhost → MP responde
                    // HTTP 400 al crear la preferencia. Además, con el flujo de pestaña nueva +
                    // polling el retorno automático no es necesario. Si en prod quieres que la
                    // pestaña de MP regrese sola, pon back_urls.success a un dominio https público
                    // y reactiva .autoReturn("approved").
                    .notificationUrl(notificationUrl)
                    .externalReference(reserva.getId().toString())
                    .expires(true)
                    .expirationDateTo(OffsetDateTime.now().plusDays(2))
                    .build();

            Preference preference = crearPreferenciaResiliente(preferenceRequest).join();

            // Invalida pagos PENDIENTE previos de esta reserva: el estudiante pudo generar
            // varios links de pago, y no queremos acumular filas huérfanas ni preferencias
            // vivas en paralelo. El webhook siempre operará sobre el más reciente.
            for (Pago previo : pagoRepository.findAllByReservaIdOrderByFechaCreacionDesc(reservaId)) {
                if ("PENDIENTE".equals(previo.getEstado())) {
                    previo.setEstado("EXPIRADO");
                    pagoRepository.save(previo);
                }
            }

            Pago pago = Pago.builder()
                    .reservaId(reservaId)
                    .preferenciaId(preference.getId())
                    .monto(montoCobrado)
                    .comision(comision)
                    .montoArrendador(montoArrendador)
                    .estudianteId(reserva.getEstudianteId())
                    .arrendadorId(reserva.getArrendadorId())
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

    /**
     * Pago dividido (#38 Fase 2): el miembro paga SU cuota de una reserva grupal. La preferencia
     * usa {@code externalReference = "reservaId:estudianteId"} para que el webhook identifique la
     * cuota; el flujo individual (externalReference = reservaId) queda intacto.
     */
    public String crearPreferenciaGrupo(Long reservaId, CurrentUser current) {
        try {
            if (current == null || current.getPerfilId() == null) {
                throw new IllegalStateException("No se pudo identificar al estudiante");
            }
            // Cuota del miembro actual (propiedades lo resuelve por el JWT propagado).
            CuotaPagoDTO cuota = gruposClient.miCuota(reservaId);
            if (cuota == null || cuota.getMonto() == null) {
                throw new IllegalStateException("No tienes una cuota en esta reserva grupal");
            }
            if (cuota.getEstudianteId() != null && !current.getPerfilId().equals(cuota.getEstudianteId())) {
                throw new IllegalStateException("Esta cuota no es tuya");
            }
            if ("PAGADO".equalsIgnoreCase(cuota.getEstado())) {
                throw new IllegalStateException("Ya pagaste tu cuota de este grupo");
            }
            BigDecimal monto = cuota.getMonto().setScale(2, RoundingMode.HALF_UP);
            if (monto.compareTo(montoMinimo) < 0) {
                throw new IllegalStateException("El monto mínimo de pago es S/ " + montoMinimo.toPlainString()
                        + ". Tu cuota (S/ " + monto.toPlainString() + ") no puede pagarse en línea.");
            }

            Long estudianteId = current.getPerfilId();
            String nombrePagador = (cuota.getEstudianteNombre() != null && !cuota.getEstudianteNombre().isEmpty())
                    ? cuota.getEstudianteNombre() : "Estudiante AlquilaYa";
            String emailPagador = (cuota.getEstudianteCorreo() != null && !cuota.getEstudianteCorreo().isEmpty())
                    ? cuota.getEstudianteCorreo() : "estudiante@test.com";

            List<PreferenceItemRequest> items = new ArrayList<>();
            items.add(PreferenceItemRequest.builder()
                    .id("cuota-" + reservaId + "-" + estudianteId)
                    .title("Tu parte · " + (cuota.getPropiedadTitulo() != null ? cuota.getPropiedadTitulo() : "Reserva grupal AlquilaYa"))
                    .quantity(1).unitPrice(monto).currencyId("PEN").build());

            PreferenceBackUrlsRequest backUrls = PreferenceBackUrlsRequest.builder()
                    .success(urlSuccess).failure(urlFailure).pending(urlPending).build();
            com.mercadopago.client.preference.PreferencePayerRequest payer =
                    com.mercadopago.client.preference.PreferencePayerRequest.builder()
                            .name(nombrePagador).email(emailPagador).build();

            PreferenceRequest preferenceRequest = PreferenceRequest.builder()
                    .items(items).payer(payer).backUrls(backUrls)
                    .notificationUrl(notificationUrl)
                    .externalReference(reservaId + ":" + estudianteId)
                    .expires(true).expirationDateTo(OffsetDateTime.now().plusDays(2))
                    .build();

            Preference preference = crearPreferenciaResiliente(preferenceRequest).join();

            // Invalida cuotas-pago PENDIENTE previas de ESTE miembro en esta reserva.
            for (Pago previo : pagoRepository.findAllByReservaIdOrderByFechaCreacionDesc(reservaId)) {
                if ("PENDIENTE".equals(previo.getEstado()) && estudianteId.equals(previo.getEstudianteId())) {
                    previo.setEstado("EXPIRADO");
                    pagoRepository.save(previo);
                }
            }

            Pago pago = Pago.builder()
                    .reservaId(reservaId).preferenciaId(preference.getId())
                    .monto(monto).comision(BigDecimal.ZERO).montoArrendador(monto)
                    .estudianteId(estudianteId).grupoId(cuota.getGrupoId())
                    .estado("PENDIENTE").build();
            pagoRepository.save(pago);

            log.info("✅ Preferencia de cuota creada: reserva={} estudiante={} monto={}", reservaId, estudianteId, monto);
            return preference.getInitPoint();

        } catch (IllegalStateException | CallNotPermittedException | BulkheadFullException e) {
            throw e;
        } catch (java.util.concurrent.CompletionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            if (cause instanceof IllegalStateException ise) throw ise;
            log.error("❌ Error creando preferencia de cuota: {}", cause.getMessage(), cause);
            throw new RuntimeException("No se pudo generar el link de pago de tu cuota: " + cause.getMessage());
        } catch (Exception e) {
            log.error("❌ Error creando preferencia de cuota: {}", e.getMessage(), e);
            throw new RuntimeException("No se pudo generar el link de pago de tu cuota: " + e.getMessage());
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

        // 1. Validar firma HMAC (obligatoria en prod).
        verificarFirma(xSignature, xRequestId, dataIdQuery != null ? dataIdQuery : paymentIdStr);

        // 2. Lock distribuido en Redis para idempotencia atómica.
        //    Si otro proceso ya tiene el lock → salir 200 OK (idempotente).
        String lockKey = REDIS_LOCK_PREFIX + paymentIdStr;
        String lockValue = UUID.randomUUID().toString();
        // Tri-estado: TRUE = lock adquirido; FALSE = Redis respondió y el lock lo tiene OTRO
        // proceso (duplicado real); null = Redis no disponible/erró → degradar a idempotencia por BD.
        Boolean lockResult = adquirirLockRedis(lockKey, lockValue);
        boolean lockAcquired = Boolean.TRUE.equals(lockResult);

        if (Boolean.FALSE.equals(lockResult)) {
            // Duplicado concurrente real: otro proceso tiene el lock. Idempotente, no procesamos.
            log.info("🔒 Webhook concurrente para paymentId={} (lock detentado por otro). Ignorando.", paymentIdStr);
            return;
        }
        // lockResult == null → Redis caído: NO descartamos el webhook (bug histórico: se perdían
        // pagos). Seguimos con la idempotencia por BD (esEstadoTerminal + @Version + unique payment_id).

        try {
            // 3. Consultar el pago real contra Mercado Pago (source of truth) FUERA de la
            //    transacción de BD: la llamada HTTP no debe retener una conexión del pool.
            Payment payment;
            try {
                payment = new PaymentClient().get(Long.parseLong(paymentIdStr));
            } catch (Exception e) {
                log.error("No se pudo consultar el Payment {} en Mercado Pago: {}", paymentIdStr, e.getMessage());
                throw new WebhookInvalidoException("No se pudo verificar el pago con Mercado Pago");
            }

            // 4. Aplicar el cambio de estado en una transacción corta. Se invoca vía proxy
            //    (self) para que @Transactional aplique de verdad (evita self-invocation).
            self.aplicarCambioEstado(payment, paymentIdStr);

        } finally {
            // 5. Liberar lock (solo si lo adquirimos).
            if (lockAcquired) {
                liberarLockRedis(lockKey, lockValue);
            }
        }
    }

    /**
     * Aplica el estado del pago de Mercado Pago a la BD en una transacción corta.
     *
     * <p>Idempotencia por ESTADO TERMINAL (no por mera existencia del paymentId): un pago
     * 'pending' que luego se aprueba reusa el mismo paymentId, así que debe poder
     * reprocesarse para llegar a PAGADO. Solo se ignora cuando ya está en un estado terminal.
     */
    @Transactional
    public void aplicarCambioEstado(Payment payment, String paymentIdStr) {
        String status = payment.getStatus();
        String externalRef = payment.getExternalReference();
        if (externalRef == null) {
            throw new WebhookInvalidoException("Payment sin externalReference");
        }
        // Single-pagador: externalReference = reservaId (sin cambios).
        // Grupal (#38 Fase 2): "reservaId:estudianteId" → identifica la cuota del miembro.
        final Long reservaId;
        final Long estudianteIdGrupal;
        if (externalRef.contains(":")) {
            String[] parts = externalRef.split(":", 2);
            reservaId = Long.parseLong(parts[0]);
            estudianteIdGrupal = Long.parseLong(parts[1]);
        } else {
            reservaId = Long.parseLong(externalRef);
            estudianteIdGrupal = null;
        }

        Optional<Pago> existentePorPayment = pagoRepository.findByPaymentId(paymentIdStr);
        if (existentePorPayment.isPresent() && esEstadoTerminal(existentePorPayment.get().getEstado())) {
            log.info("↩️ Webhook ya aplicado (estado terminal {}). paymentId={}",
                    existentePorPayment.get().getEstado(), paymentIdStr);
            return;
        }

        // Pago objetivo: el ya asociado a este paymentId (caso pending→approved) o, en su defecto,
        // el PENDIENTE de esa reserva (grupal: el del miembro concreto; individual: el más reciente).
        Pago pago = existentePorPayment.orElseGet(() -> {
            if (estudianteIdGrupal != null) {
                return pagoRepository
                        .findFirstByReservaIdAndEstudianteIdAndEstadoOrderByFechaCreacionDesc(
                                reservaId, estudianteIdGrupal, "PENDIENTE")
                        .orElseThrow(() -> new WebhookInvalidoException(
                                "No existe cuota PENDIENTE para reserva " + reservaId + " / estudiante " + estudianteIdGrupal));
            }
            return pagoRepository
                    .findFirstByReservaIdAndEstadoOrderByFechaCreacionDesc(reservaId, "PENDIENTE")
                    .orElseThrow(() -> new WebhookInvalidoException(
                            "No existe pago PENDIENTE para la reserva " + reservaId));
        });

        String reservaIdStr = String.valueOf(reservaId);
        switch (status == null ? "" : status) {
            case "approved" -> manejarAprobado(pago, payment, paymentIdStr, reservaId, reservaIdStr);
            case "rejected" -> manejarRechazado(pago, paymentIdStr, reservaId, reservaIdStr);
            case "pending", "in_process", "in_mediation" ->
                    manejarPendiente(pago, paymentIdStr, reservaId, status);
            default -> log.info(
                    "Pago con estado no manejado (status={}), se ignora. paymentId={}", status, paymentIdStr);
        }
    }

    /** Estados desde los que NO se reprocesa un webhook (pago ya resuelto). */
    private static boolean esEstadoTerminal(String estado) {
        return "PAGADO".equals(estado) || "RECHAZADO".equals(estado) || "DISCREPANCIA".equals(estado);
    }

    private void manejarAprobado(Pago pagoPendiente, Payment payment, String paymentIdStr,
                                 Long reservaId, String reservaIdStr) {
        // Validar la moneda (defensa en profundidad: solo aceptamos PEN).
        String moneda = payment.getCurrencyId();
        if (moneda != null && !"PEN".equalsIgnoreCase(moneda)) {
            log.error("Moneda inesperada ({}) en pago aprobado para reserva {}. PaymentId={}",
                    moneda, reservaId, paymentIdStr);
            marcarDiscrepancia(pagoPendiente, paymentIdStr, reservaId,
                    "MONEDA_INESPERADA", "moneda=" + moneda);
            return;
        }

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
            // El estudiante YA pagó: no podemos descartar el webhook con un 400 y olvidarlo
            // (quedaría plata atascada sin rastro). Persistimos la discrepancia para revisión
            // manual y emitimos una alerta. Respondemos 200 para que MP no reintente en vano.
            marcarDiscrepancia(pagoPendiente, paymentIdStr, reservaId,
                    "MONTO_NO_COINCIDE", "esperado=" + montoEsperado + " real=" + montoReal);
            return;
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
        payload.put("estudianteId", guardado.getEstudianteId());
        payload.put("grupoId", guardado.getGrupoId());
        payload.put("monto", guardado.getMonto());
        payload.put("comision", guardado.getComision());
        payload.put("montoArrendador", guardado.getMontoArrendador());
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
     * Marca un pago como DISCREPANCIA (estado terminal que requiere revisión manual) y emite
     * una alerta. Se usa cuando MP confirma un pago aprobado pero algo no cuadra (monto o
     * moneda): el estudiante ya pagó, así que no podemos descartar el webhook sin dejar rastro.
     */
    private void marcarDiscrepancia(Pago pago, String paymentIdStr, Long reservaId,
                                    String motivo, String detalle) {
        pago.setEstado("DISCREPANCIA");
        pago.setPaymentId(paymentIdStr);
        pago.setFechaPago(LocalDateTime.now());
        Pago guardado = pagoRepository.save(pago);
        log.error("🚨 DISCREPANCIA de pago. reservaId={} paymentId={} motivo={} ({})",
                reservaId, paymentIdStr, motivo, detalle);

        Map<String, Object> payload = new HashMap<>();
        payload.put("pagoId", guardado.getId());
        payload.put("reservaId", reservaId);
        payload.put("monto", guardado.getMonto());
        payload.put("moneda", "PEN");
        payload.put("paymentId", paymentIdStr);
        payload.put("motivo", motivo);
        payload.put("detalle", detalle);
        outboxPublisher.publicar(
                "pagos-topic",
                "PAGO_DISCREPANCIA",
                "Pago",
                guardado.getId().toString(),
                payload,
                MDC.get("correlationId"));
    }

    // ------------------------------------------------------------------------------------
    // Reconciliación con Mercado Pago (G5)
    // ------------------------------------------------------------------------------------

    /** Resultado de reconciliar un pago concreto contra la verdad de Mercado Pago. */
    public enum ResultadoReconciliacion {
        /** MP aprobado y validado → PAGADO + PAGO_EXITOSO. */
        CONFIRMADO,
        /** MP rechazado/cancelado → RECHAZADO + PAGO_FALLIDO. */
        RECHAZADO,
        /** MP reembolsado → REEMBOLSADO + REFUND_COMPLETADO. */
        REEMBOLSADO,
        /** MP aprobado pero monto/moneda no cuadra → DISCREPANCIA + PAGO_DISCREPANCIA. */
        DISCREPANCIA,
        /** MP sigue en curso (pending/in_process/...): se reintenta en la próxima corrida. */
        SIN_CAMBIO,
        /** El pago ya no está en un estado reconciliable (webhook lo resolvió antes) o no existe. */
        NO_APLICA
    }

    /**
     * Reconciliación (G5): aplica el estado real de un {@link Payment} de Mercado Pago a un pago
     * local que quedó en {@code PENDIENTE_REVISION} o {@code DISCREPANCIA}.
     *
     * <p>Reusa EXACTAMENTE los mismos emisores del webhook ({@link #manejarAprobado} /
     * {@link #manejarRechazado}) y el outbox, así que emite los mismos eventos
     * ({@code PAGO_EXITOSO} / {@code PAGO_FALLIDO} / {@code PAGO_DISCREPANCIA}). Añade el caso
     * {@code refunded} → {@code REEMBOLSADO} (evento {@code REFUND_COMPLETADO}) que el webhook no
     * cubría.
     *
     * <p><b>Idempotente:</b> re-lee el pago dentro de la transacción y solo actúa si sigue en un
     * estado reconciliable; si el webhook ya lo llevó a un estado terminal, devuelve
     * {@link ResultadoReconciliacion#NO_APLICA} sin re-emitir. A diferencia del webhook, NO
     * re-emite {@code PAGO_EN_REVISION} mientras MP siga pendiente (evita spamear al estudiante).
     */
    @Transactional
    public ResultadoReconciliacion reconciliarPago(Long pagoId, Payment payment) {
        Pago pago = pagoRepository.findById(pagoId).orElse(null);
        if (pago == null) {
            return ResultadoReconciliacion.NO_APLICA;
        }
        String estadoLocal = pago.getEstado();
        // Solo pagos en revisión o con discrepancia. Si entre la lectura del batch y ahora el
        // webhook ya lo resolvió (PAGADO/RECHAZADO/REEMBOLSADO/...), NO re-emitimos.
        if (!"PENDIENTE_REVISION".equals(estadoLocal) && !"DISCREPANCIA".equals(estadoLocal)) {
            return ResultadoReconciliacion.NO_APLICA;
        }

        String paymentIdStr = pago.getPaymentId();
        Long reservaId = pago.getReservaId();
        String reservaIdStr = String.valueOf(reservaId);
        String status = payment.getStatus() == null ? "" : payment.getStatus();

        switch (status) {
            case "approved" -> {
                if ("DISCREPANCIA".equals(estadoLocal)) {
                    // MP sigue reportando approved con los mismos datos: una discrepancia de
                    // monto/moneda no se resuelve re-consultando. Queda para revisión manual.
                    log.info("Reconciliación: pago {} en DISCREPANCIA sigue 'approved' en MP; sin cambio. paymentId={}",
                            pagoId, paymentIdStr);
                    return ResultadoReconciliacion.SIN_CAMBIO;
                }
                // PENDIENTE_REVISION + approved → misma validación monto/moneda y emisión del webhook.
                manejarAprobado(pago, payment, paymentIdStr, reservaId, reservaIdStr);
                return "PAGADO".equals(pago.getEstado())
                        ? ResultadoReconciliacion.CONFIRMADO
                        : ResultadoReconciliacion.DISCREPANCIA;
            }
            case "rejected", "cancelled" -> {
                manejarRechazado(pago, paymentIdStr, reservaId, reservaIdStr);
                return ResultadoReconciliacion.RECHAZADO;
            }
            case "refunded", "charged_back" -> {
                manejarReembolsadoReconciliacion(pago, paymentIdStr, reservaId);
                return ResultadoReconciliacion.REEMBOLSADO;
            }
            case "pending", "in_process", "in_mediation", "authorized" -> {
                // Sigue en curso en MP: se reintenta en la próxima corrida. No re-emitimos
                // PAGO_EN_REVISION para no notificar al estudiante en cada ciclo.
                return ResultadoReconciliacion.SIN_CAMBIO;
            }
            default -> {
                log.info("Reconciliación: status MP no reconciliable ({}). pagoId={} paymentId={}",
                        status, pagoId, paymentIdStr);
                return ResultadoReconciliacion.SIN_CAMBIO;
            }
        }
    }

    /**
     * Reconciliación (G5): un pago cuyo {@code paymentId} es null o no numérico no puede
     * consultarse contra MP. Lo marcamos {@code DISCREPANCIA} (estado de revisión manual del
     * sistema) reusando la misma emisión del webhook. Idempotente: si ya está en DISCREPANCIA
     * (o en un estado terminal distinto) no hace nada.
     */
    @Transactional
    public void marcarParaRevisionManual(Long pagoId, String motivo) {
        Pago pago = pagoRepository.findById(pagoId).orElse(null);
        if (pago == null) {
            return;
        }
        // Solo transicionamos desde PENDIENTE_REVISION; DISCREPANCIA ya está marcado (no re-emitir),
        // y los estados terminales no se tocan.
        if (!"PENDIENTE_REVISION".equals(pago.getEstado())) {
            return;
        }
        marcarDiscrepancia(pago, pago.getPaymentId(), pago.getReservaId(),
                "PAYMENT_ID_INVALIDO", motivo);
    }

    /**
     * MP reportó el pago como reembolsado (fuera de nuestro flujo de refund): dejamos el pago
     * en {@code REEMBOLSADO} y emitimos {@code REFUND_COMPLETADO} por el mismo outbox que usa
     * el flujo de reembolsos (RefundService).
     */
    private void manejarReembolsadoReconciliacion(Pago pago, String paymentIdStr, Long reservaId) {
        pago.setEstado("REEMBOLSADO");
        Pago guardado = pagoRepository.save(pago);
        log.info("↩️ Reconciliación: pago REEMBOLSADO según Mercado Pago. reservaId={} paymentId={}",
                reservaId, paymentIdStr);

        Map<String, Object> payload = new HashMap<>();
        payload.put("reservaId", reservaId);
        payload.put("pagoId", guardado.getId());
        payload.put("paymentId", paymentIdStr);
        payload.put("montoReembolsado", guardado.getMonto());
        payload.put("motivo", "RECONCILIACION_MP");
        outboxPublisher.publicar(
                "pagos-topic",
                "REFUND_COMPLETADO",
                "Pago",
                guardado.getId().toString(),
                payload,
                MDC.get("correlationId"));
    }

    /**
     * Intenta adquirir un lock con SET NX EX en Redis. Tri-estado:
     * <ul>
     *   <li>{@code TRUE}  → lock adquirido por nosotros.</li>
     *   <li>{@code FALSE} → Redis respondió y el lock lo tiene OTRO proceso (duplicado real).</li>
     *   <li>{@code null}  → Redis no configurado o erró → degradación: el caller debe SEGUIR
     *       procesando con la idempotencia por BD, NO descartar el webhook.</li>
     * </ul>
     */
    private Boolean adquirirLockRedis(String key, String value) {
        if (redisTemplate == null) {
            log.warn("⚠️ Redis no configurado: idempotencia degradada al check de BD (no atómico).");
            return null;
        }
        try {
            Boolean ok = redisTemplate.opsForValue().setIfAbsent(key, value, REDIS_LOCK_TTL);
            return Boolean.TRUE.equals(ok);
        } catch (Exception e) {
            log.warn("⚠️ Redis no disponible al adquirir lock '{}': {}. Fallback a check de BD (no se descarta el webhook).",
                    key, e.getMessage());
            return null;
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

    /**
     * Estado del último pago de una reserva. Usado por el frontend para hacer polling
     * mientras el usuario paga en Mercado Pago en otra pestaña.
     */
    @Transactional(readOnly = true)
    public EstadoPagoResponse consultarEstado(Long reservaId, CurrentUser current) {
        EstadoPagoResponse sinPago = new EstadoPagoResponse("SIN_PAGO", null, null, null);
        return pagoRepository.findFirstByReservaIdOrderByFechaCreacionDesc(reservaId)
                .map(p -> {
                    // Anti-IDOR: solo el estudiante dueño ve el estado. Los pagos legacy sin
                    // estudianteId (anteriores a este campo) no se bloquean.
                    if (p.getEstudianteId() != null
                            && (current == null || !p.getEstudianteId().equals(current.getPerfilId()))) {
                        return sinPago;
                    }
                    return new EstadoPagoResponse(
                            p.getEstado(),
                            p.getPaymentId(),
                            p.getMonto(),
                            p.getFechaPago() != null ? p.getFechaPago().toString() : null);
                })
                .orElse(sinPago);
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
        payload.put("comision", guardado.getComision());
        payload.put("montoArrendador", guardado.getMontoArrendador());
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
