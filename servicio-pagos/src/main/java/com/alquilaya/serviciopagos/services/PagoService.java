package com.alquilaya.serviciopagos.services;

import com.alquilaya.serviciopagos.clients.ReservasClient;
import com.alquilaya.serviciopagos.config.CurrentUser;
import com.alquilaya.serviciopagos.dto.CuotaPagoDTO;
import com.alquilaya.serviciopagos.dto.EstadoPagoResponse;
import com.alquilaya.serviciopagos.dto.PagoArrendadorHistorialDTO;
import com.alquilaya.serviciopagos.dto.PagoFallidoDTO;
import com.alquilaya.serviciopagos.dto.PagoHistorialDTO;
import com.alquilaya.serviciopagos.dto.ReservaDetalleDTO;
import com.alquilaya.serviciopagos.dto.ValidarCuponRequest;
import com.alquilaya.serviciopagos.dto.ValidarCuponResponse;
import com.alquilaya.serviciopagos.entities.Pago;
import com.alquilaya.serviciopagos.exceptions.ComprobanteAccesoDenegadoException;
import com.alquilaya.serviciopagos.exceptions.WebhookInvalidoException;
import com.alquilaya.serviciopagos.outbox.publisher.OutboxPublisher;
import com.alquilaya.serviciopagos.repositories.PagoRepository;
import com.mercadopago.client.common.IdentificationRequest;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.payment.PaymentCreateRequest;
import com.mercadopago.client.payment.PaymentPayerRequest;
import com.mercadopago.client.preference.PreferenceBackUrlsRequest;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.client.preference.PreferenceItemRequest;
import com.mercadopago.client.preference.PreferenceRequest;
import com.mercadopago.core.MPRequestOptions;
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
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
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
    /** Ítem 292: validación y contabilidad de usos de cupones. */
    private final CuponService cuponService;
    /** Opcional: si Redis está down/no configurado, hacemos fallback graceful. */
    private final StringRedisTemplate redisTemplate;
    /** Auto-referencia (vía proxy) para que @Transactional surta efecto en llamadas internas. */
    private final PagoService self;

    public PagoService(PagoRepository pagoRepository,
                       ReservasClient reservasClient,
                       com.alquilaya.serviciopagos.clients.GruposClient gruposClient,
                       OutboxPublisher outboxPublisher,
                       CuponService cuponService,
                       @Autowired(required = false) StringRedisTemplate redisTemplate,
                       @Lazy PagoService self) {
        this.pagoRepository = pagoRepository;
        this.reservasClient = reservasClient;
        this.gruposClient = gruposClient;
        this.outboxPublisher = outboxPublisher;
        this.cuponService = cuponService;
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

    /** Public key de Mercado Pago (ítem 276): segura de exponer al cliente, a diferencia del access token. */
    @Value("${mercadopago.public-key}")
    private String publicKey;

    /** Si true, la firma HMAC del webhook es OBLIGATORIA. Default true (prod). */
    @Value("${mercadopago.webhook.required-signature:true}")
    private boolean webhookSignatureRequired;

    /** Ventana de validez (segundos) del {@code ts} de la firma del webhook: se rechaza como firma
     *  inválida cualquier {@code ts} fuera de este margen respecto de "ahora", para mitigar un
     *  replay attack con una firma capturada previamente. Recomendación de Mercado Pago: 5 min. */
    @Value("${mercadopago.webhook.ts-window-seconds:300}")
    private long webhookTsWindowSeconds;

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

    /**
     * Resultado de validar una reserva individual (no grupal) para cobro y calcular sus montos.
     * Único punto de verdad del cálculo {@code montoArrendador + comisión = montoCobrado}, para que
     * el flujo Checkout Pro (ítem existente) y el flujo Bricks (ítem 276) NUNCA puedan divergir en
     * cuánto le cobran al estudiante.
     */
    private record ReservaParaPago(ReservaDetalleDTO reserva, BigDecimal montoArrendador,
                                   BigDecimal comision, BigDecimal montoCobrado) {}

    /**
     * Valida que {@code current} pueda pagar {@code reservaId} (dueño, no grupal, APROBADA, no
     * pagada ya) y calcula los montos exactos a cobrar. Lanza {@link IllegalStateException}/
     * {@link RuntimeException} con el mismo mensaje que antes tenía inline {@code crearPreferencia}
     * — comportamiento sin cambios, solo extraído para reutilizarlo desde el flujo Bricks.
     */
    private ReservaParaPago validarYCalcularMontoIndividual(Long reservaId, CurrentUser current) {
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

        return new ReservaParaPago(reserva, montoArrendador, comision, montoCobrado);
    }

    public String crearPreferencia(Long reservaId, CurrentUser current) {
        return crearPreferencia(reservaId, current, null);
    }

    /**
     * Ítem 292: igual que {@link #crearPreferencia(Long, CurrentUser)} pero aplicando un cupón de
     * descuento opcional. El descuento SOLO reduce {@code comision} (nunca {@code montoArrendador}
     * — ver {@link CuponService#validarYCalcular}), y el {@code montoCobrado} enviado a Mercado
     * Pago se recalcula con la comisión YA descontada, así lo que se le cobra al estudiante en la
     * tarjeta coincide exactamente con lo que se le mostró en el checkout.
     */
    public String crearPreferencia(Long reservaId, CurrentUser current, String cuponCodigo) {
        try {
            log.info("Iniciando creación de preferencia para Reserva ID: {}", reservaId);

            ReservaParaPago datos = validarYCalcularMontoIndividual(reservaId, current);
            ReservaDetalleDTO reserva = datos.reserva();
            BigDecimal montoArrendador = datos.montoArrendador();
            BigDecimal comision = datos.comision();
            BigDecimal montoCobrado = datos.montoCobrado();

            Long cuponIdAplicado = null;
            String cuponCodigoAplicado = null;
            BigDecimal montoDescuento = BigDecimal.ZERO;
            if (cuponCodigo != null && !cuponCodigo.isBlank()) {
                CuponService.ResultadoDescuento resultado =
                        cuponService.validarYCalcular(cuponCodigo, montoArrendador, comision);
                cuponIdAplicado = resultado.cupon().getId();
                cuponCodigoAplicado = resultado.cupon().getCodigo();
                montoDescuento = resultado.montoDescuento();
                comision = resultado.comisionFinal();
                montoCobrado = montoArrendador.add(comision).setScale(2, RoundingMode.HALF_UP);
                log.info("🎟️ Cupón {} aplicado a reserva {}: descuento=S/ {} comisión final=S/ {}",
                        cuponCodigoAplicado, reservaId, montoDescuento, comision);
            }

            // Validar campos críticos para Mercado Pago
            String nombrePagador = (reserva.getEstudianteNombre() != null && !reserva.getEstudianteNombre().isEmpty())
                    ? reserva.getEstudianteNombre() : "Estudiante AlquilaYa";
            String emailPagador = (reserva.getEstudianteCorreo() != null && !reserva.getEstudianteCorreo().isEmpty())
                    ? reserva.getEstudianteCorreo() : "estudiante@test.com";

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

            // Invalidar el/los PENDIENTE previo(s) y crear el nuevo Pago deben ser atómicos
            // (mismo commit) para no ampliar la ventana de la condición de carrera del webhook
            // (dos filas PENDIENTE simultáneas para la misma reserva). Se hace en una transacción
            // corta y SOLO de BD, vía el proxy (self) — la llamada HTTP a Mercado Pago ya terminó
            // arriba, así que no queda ninguna conexión de BD retenida durante la espera de red.
            self.guardarPreferenciaCreada(reservaId, preference.getId(), montoCobrado, comision,
                    montoArrendador, reserva.getEstudianteId(), reserva.getArrendadorId(),
                    cuponIdAplicado, cuponCodigoAplicado, montoDescuento);

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
     * Invalida el/los pago(s) PENDIENTE previo(s) de la reserva y crea el nuevo {@link Pago} en
     * una única transacción corta, solo de BD (sin llamadas de red dentro). Se invoca vía el proxy
     * ({@code self}) desde {@link #crearPreferencia} para que {@code @Transactional} surta efecto
     * (evita self-invocation) y para que la llamada HTTP a Mercado Pago —que ya se hizo antes de
     * invocar este método— no quede retenida dentro de una transacción de BD.
     */
    @Transactional
    public void guardarPreferenciaCreada(Long reservaId, String preferenciaId, BigDecimal montoCobrado,
                                         BigDecimal comision, BigDecimal montoArrendador,
                                         Long estudianteId, Long arrendadorId,
                                         Long cuponId, String cuponCodigo, BigDecimal montoDescuento) {
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
                .preferenciaId(preferenciaId)
                .monto(montoCobrado)
                .comision(comision)
                .montoArrendador(montoArrendador)
                .estudianteId(estudianteId)
                .arrendadorId(arrendadorId)
                .cuponId(cuponId)
                .cuponCodigo(cuponCodigo)
                .montoDescuento(montoDescuento != null && montoDescuento.signum() > 0 ? montoDescuento : null)
                .estado("PENDIENTE")
                .build();
        pagoRepository.save(pago);
    }

    /**
     * Ítem 292: preview de un cupón para una reserva concreta, ANTES de confirmar el pago. Usa el
     * MISMO cálculo ({@link CuponService#validarYCalcular}) que aplicará {@link #crearPreferencia}
     * si el estudiante sigue adelante, así lo que se le muestra en el checkout nunca diverge de lo
     * que termina cobrándose. Errores de validación del cupón (no existe, vencido, límite de usos,
     * monto mínimo) se devuelven como {@code valido=false} + mensaje en vez de propagarse como
     * error HTTP — es un preview, no una operación que deba fallar la petición.
     */
    @Transactional(readOnly = true)
    public ValidarCuponResponse validarCupon(ValidarCuponRequest request, CurrentUser current) {
        ReservaParaPago datos = validarYCalcularMontoIndividual(request.reservaId(), current);
        try {
            CuponService.ResultadoDescuento resultado = cuponService.validarYCalcular(
                    request.codigo(), datos.montoArrendador(), datos.comision());
            BigDecimal totalConDescuento = datos.montoArrendador()
                    .add(resultado.comisionFinal())
                    .setScale(2, RoundingMode.HALF_UP);
            return new ValidarCuponResponse(true, "Cupón válido",
                    resultado.montoDescuento(), resultado.comisionFinal(), totalConDescuento);
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return new ValidarCuponResponse(false, ex.getMessage(),
                    BigDecimal.ZERO, datos.comision(), datos.montoCobrado());
        }
    }

    // ------------------------------------------------------------------------------------
    // Ítem 276: Checkout Bricks (Payment Brick embebido, alternativa a Checkout Pro)
    // ------------------------------------------------------------------------------------

    /** Public key de Mercado Pago (segura de exponer al cliente, a diferencia del access token). */
    public String obtenerPublicKey() {
        return publicKey;
    }

    /**
     * Crea un {@link Payment} DIRECTO (sin redirect a Mercado Pago) a partir del token que el
     * Payment Brick tokenizó en el navegador. Reusa EXACTAMENTE la misma validación y cálculo de
     * montos que {@link #crearPreferencia} (vía {@link #validarYCalcularMontoIndividual}) para que
     * ambos caminos —Bricks y Checkout Pro— jamás puedan cobrar un monto distinto por la misma
     * reserva.
     *
     * <p>Deliberadamente SIN reintento automático (a diferencia de
     * {@link #crearPreferenciaResiliente}): reintentar una creación de Payment no-idempotente
     * podría duplicar el cobro si el primer intento sí llegó a procesarse en Mercado Pago pero la
     * respuesta se perdió en la red. Se protege en su lugar con un {@code X-Idempotency-Key} único
     * por intento; si falla, el estudiante reintenta manualmente desde la UI (mismo criterio que
     * Checkout Pro ante un pago rechazado).
     *
     * <p>Este método NO marca el {@link Pago} como PAGADO: {@link #procesarWebhook} sigue siendo la
     * única fuente de verdad para esa transición. El {@link Payment} que se crea aquí dispara el
     * MISMO webhook que uno creado vía Preference (Mercado Pago notifica cualquier Payment sin
     * importar cómo se originó), y {@link #aplicarCambioEstado} ya es agnóstico del origen — solo
     * mira {@code externalReference}/{@code status} — así que no hace falta tocarlo.
     */
    public Map<String, Object> procesarPagoDirectoBricks(Long reservaId, CurrentUser current,
                                                          Map<String, Object> formData) {
        ReservaParaPago datos = validarYCalcularMontoIndividual(reservaId, current);
        ReservaDetalleDTO reserva = datos.reserva();

        if (formData == null) {
            throw new IllegalStateException("Falta el formulario de pago del Brick");
        }
        String token = requireCampoBricks(formData, "token");
        String paymentMethodId = requireCampoBricks(formData, "payment_method_id");
        Integer installments = numeroCampoBricks(formData, "installments", 1);
        String issuerId = stringCampoBricks(formData, "issuer_id");

        @SuppressWarnings("unchecked")
        Map<String, Object> payerData = formData.get("payer") instanceof Map
                ? (Map<String, Object>) formData.get("payer") : Map.of();
        String emailPagador = stringCampoBricks(payerData, "email");
        if (emailPagador == null || emailPagador.isBlank()) {
            emailPagador = (reserva.getEstudianteCorreo() != null && !reserva.getEstudianteCorreo().isEmpty())
                    ? reserva.getEstudianteCorreo() : "estudiante@test.com";
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> identificationData = payerData.get("identification") instanceof Map
                ? (Map<String, Object>) payerData.get("identification") : null;

        PaymentPayerRequest.PaymentPayerRequestBuilder payerBuilder = PaymentPayerRequest.builder()
                .email(emailPagador);
        if (identificationData != null) {
            String idType = stringCampoBricks(identificationData, "type");
            String idNumber = stringCampoBricks(identificationData, "number");
            if (idType != null && !idType.isBlank() && idNumber != null && !idNumber.isBlank()) {
                payerBuilder.identification(IdentificationRequest.builder()
                        .type(idType).number(idNumber).build());
            }
        }

        // Igual que en crearPreferencia: invalida cualquier PENDIENTE previo de esta reserva y
        // crea el nuevo Pago ANTES de llamar a Mercado Pago, para que el webhook siempre tenga
        // con qué correlacionar (mismo criterio que guardarPreferenciaCreada).
        self.guardarPagoDirectoCreado(reservaId, datos.montoCobrado(), datos.comision(),
                datos.montoArrendador(), reserva.getEstudianteId(), reserva.getArrendadorId());

        PaymentCreateRequest request = PaymentCreateRequest.builder()
                .transactionAmount(datos.montoCobrado())
                .token(token)
                .description("Reserva AlquilaYa: "
                        + (reserva.getPropiedadTitulo() != null ? reserva.getPropiedadTitulo() : "Habitación"))
                .installments(installments)
                .paymentMethodId(paymentMethodId)
                .issuerId(issuerId)
                .payer(payerBuilder.build())
                .externalReference(reserva.getId().toString())
                .notificationUrl(notificationUrl)
                .binaryMode(false)
                .build();

        try {
            MPRequestOptions options = MPRequestOptions.builder()
                    .customHeaders(Map.of("X-Idempotency-Key", UUID.randomUUID().toString()))
                    .build();
            Payment payment = new PaymentClient().create(request, options);
            log.info("✅ Payment Bricks creado. reservaId={} paymentId={} status={}",
                    reservaId, payment.getId(), payment.getStatus());
            Map<String, Object> respuesta = new HashMap<>();
            respuesta.put("id", payment.getId());
            respuesta.put("status", payment.getStatus());
            respuesta.put("statusDetail", payment.getStatusDetail());
            return respuesta;
        } catch (com.mercadopago.exceptions.MPApiException apiEx) {
            log.error("❌ Mercado Pago rechazó el Payment Bricks (HTTP {}) reservaId={}: {}",
                    apiEx.getStatusCode(), reservaId, apiEx.getMessage());
            throw new IllegalStateException("Mercado Pago rechazó el pago: " + apiEx.getMessage());
        } catch (IllegalStateException ise) {
            throw ise;
        } catch (Exception e) {
            log.error("❌ Error creando Payment Bricks. reservaId={}: {}", reservaId, e.getMessage(), e);
            throw new IllegalStateException("No se pudo procesar el pago: " + e.getMessage());
        }
    }

    private static String requireCampoBricks(Map<String, Object> data, String campo) {
        String valor = stringCampoBricks(data, campo);
        if (valor == null || valor.isBlank()) {
            throw new IllegalStateException("Falta el campo '" + campo + "' del formulario de pago");
        }
        return valor;
    }

    private static String stringCampoBricks(Map<String, Object> data, String campo) {
        Object v = data.get(campo);
        return v != null ? v.toString() : null;
    }

    private static Integer numeroCampoBricks(Map<String, Object> data, String campo, int porDefecto) {
        Object v = data.get(campo);
        if (v instanceof Number n) return n.intValue();
        if (v instanceof String s && !s.isBlank()) {
            try {
                return Integer.parseInt(s);
            } catch (NumberFormatException ignored) {
                // cae al valor por defecto
            }
        }
        return porDefecto;
    }

    /**
     * Análogo a {@link #guardarPreferenciaCreada} pero para el flujo Bricks: no hay
     * {@code preferenciaId} (no se crea ninguna Preference en este camino), así que
     * {@link Pago#getPreferenciaId()} queda null — ya es una columna nullable.
     */
    @Transactional
    public void guardarPagoDirectoCreado(Long reservaId, BigDecimal montoCobrado, BigDecimal comision,
                                         BigDecimal montoArrendador, Long estudianteId, Long arrendadorId) {
        for (Pago previo : pagoRepository.findAllByReservaIdOrderByFechaCreacionDesc(reservaId)) {
            if ("PENDIENTE".equals(previo.getEstado())) {
                previo.setEstado("EXPIRADO");
                pagoRepository.save(previo);
            }
        }

        Pago pago = Pago.builder()
                .reservaId(reservaId)
                .monto(montoCobrado)
                .comision(comision)
                .montoArrendador(montoArrendador)
                .estudianteId(estudianteId)
                .arrendadorId(arrendadorId)
                .estado("PENDIENTE")
                .build();
        pagoRepository.save(pago);
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

            // Igual que en crearPreferencia: invalidar la(s) cuota(s) PENDIENTE previa(s) de este
            // miembro y crear el nuevo Pago en una única transacción corta de BD, después de que
            // la llamada HTTP a Mercado Pago ya terminó.
            self.guardarCuotaPreferenciaCreada(reservaId, estudianteId, preference.getId(), monto,
                    cuota.getGrupoId());

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

    /**
     * Análogo a {@link #guardarPreferenciaCreada} pero para el flujo de cuota grupal: invalida
     * la(s) fila(s) PENDIENTE previa(s) de ESTE miembro (no de toda la reserva) y crea la nueva,
     * en una única transacción corta y solo de BD. Invocado vía {@code self} desde
     * {@link #crearPreferenciaGrupo} después de que la llamada HTTP a Mercado Pago ya terminó.
     */
    @Transactional
    public void guardarCuotaPreferenciaCreada(Long reservaId, Long estudianteId, String preferenciaId,
                                              BigDecimal monto, Long grupoId) {
        for (Pago previo : pagoRepository.findAllByReservaIdOrderByFechaCreacionDesc(reservaId)) {
            if ("PENDIENTE".equals(previo.getEstado()) && estudianteId.equals(previo.getEstudianteId())) {
                previo.setEstado("EXPIRADO");
                pagoRepository.save(previo);
            }
        }

        Pago pago = Pago.builder()
                .reservaId(reservaId).preferenciaId(preferenciaId)
                .monto(monto).comision(BigDecimal.ZERO).montoArrendador(monto)
                .estudianteId(estudianteId).grupoId(grupoId)
                .estado("PENDIENTE").build();
        pagoRepository.save(pago);
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
        try {
            if (externalRef.contains(":")) {
                String[] parts = externalRef.split(":", 2);
                reservaId = Long.parseLong(parts[0]);
                estudianteIdGrupal = Long.parseLong(parts[1]);
            } else {
                reservaId = Long.parseLong(externalRef);
                estudianteIdGrupal = null;
            }
        } catch (NumberFormatException e) {
            throw new WebhookInvalidoException(
                    "Payment con externalReference mal formado (se esperaba \"reservaId\" o "
                            + "\"reservaId:estudianteId\" numéricos): " + externalRef);
        }

        Optional<Pago> existentePorPayment = pagoRepository.findByPaymentId(paymentIdStr);
        if (existentePorPayment.isPresent() && esEstadoTerminal(existentePorPayment.get().getEstado())) {
            log.info("↩️ Webhook ya aplicado (estado terminal {}). paymentId={}",
                    existentePorPayment.get().getEstado(), paymentIdStr);
            return;
        }

        // Pago objetivo: el ya asociado a este paymentId (caso pending→approved) o, en su defecto,
        // el PENDIENTE de esa reserva (grupal: el del miembro concreto; individual: el más reciente).
        //
        // LIMITACIÓN VERIFICADA (no correlacionamos por preferenciaId aquí): el recurso Payment que
        // devuelve PaymentClient().get(paymentId) (sdk-java 2.1.27) NO expone el preferenceId de
        // Checkout Pro. Sus únicos campos "de correlación" son externalReference (= reservaId, ya
        // usado arriba para resolver `reservaId`/`estudianteIdGrupal`) y metadata (Map vacío, porque
        // crearPreferencia/crearPreferenciaGrupo nunca llaman a PreferenceRequest.metadata(...) al
        // crear la preferencia). El campo payment.getOrder() solo trae el ID de la Merchant Order de
        // MP —un recurso distinto—, y resolver el preferenceId a partir de ahí exigiría otra llamada
        // (Merchant Orders API) que hoy no está implementada. Por eso Pago#preferenciaId y
        // PagoRepository#findByPreferenciaId quedan sin usar en este flujo hasta que se agregue
        // metadata a la preferencia (mejora futura, fuera del alcance de esta corrección puntual).
        // Mitigación existente: tanto crearPreferencia como crearPreferenciaGrupo ya EXPIRAN
        // cualquier PENDIENTE previo de la misma reserva/cuota al generar una preferencia nueva, así
        // que como mucho debería existir una sola fila PENDIENTE por reserva (individual) o por
        // reserva+estudiante (grupal) en el momento del webhook.
        Optional<Pago> pagoPorPendiente = existentePorPayment.isPresent()
                ? existentePorPayment
                : (estudianteIdGrupal != null
                        ? pagoRepository.findFirstByReservaIdAndEstudianteIdAndEstadoOrderByFechaCreacionDesc(
                                reservaId, estudianteIdGrupal, "PENDIENTE")
                        : pagoRepository.findFirstByReservaIdAndEstadoOrderByFechaCreacionDesc(
                                reservaId, "PENDIENTE"));

        if (pagoPorPendiente.isEmpty()) {
            // No hay ninguna fila (ni por paymentId ni PENDIENTE) con la que correlacionar este
            // webhook (pago duplicado, doble clic del estudiante, retry de MP, etc.). El dinero pudo
            // haberse cobrado igual: NO descartamos el evento en silencio (se perdería el rastro).
            // Lo persistimos como DISCREPANCIA para revisión manual, con el mismo patrón que ya usa
            // marcarDiscrepancia en manejarAprobado.
            registrarPagoSinCorrelacion(payment, paymentIdStr, reservaId, estudianteIdGrupal, status);
            return;
        }
        Pago pago = pagoPorPendiente.get();

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

        // Ítem 292: "uso" de un cupón = redención efectiva (pago confirmado), no mero intento.
        // Aislado en su propio try/catch: el pago YA quedó PAGADO arriba, así que una falla acá
        // (o el propio contador de usos) nunca debe poder revertir ni bloquear la confirmación.
        if (guardado.getCuponId() != null) {
            try {
                cuponService.incrementarUso(guardado.getCuponId());
            } catch (Exception e) {
                log.warn("No se pudo incrementar el uso del cupón {} para el pago {}: {}",
                        guardado.getCuponId(), guardado.getId(), e.getMessage());
            }
        }

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

    /**
     * Se invoca cuando el webhook de Mercado Pago no pudo correlacionarse con ningún {@link Pago}
     * existente: ni hay una fila con este paymentId, ni una PENDIENTE para la reserva (o cuota)
     * referenciada por externalReference. En vez de descartar el evento (perdiendo el rastro de un
     * cobro que ya pudo haberse hecho), creamos la fila aquí mismo y la marcamos DISCREPANCIA para
     * que un admin la revise manualmente.
     */
    private void registrarPagoSinCorrelacion(Payment payment, String paymentIdStr, Long reservaId,
                                             Long estudianteIdGrupal, String status) {
        BigDecimal monto = payment.getTransactionAmount() != null
                ? BigDecimal.valueOf(payment.getTransactionAmount().doubleValue())
                : null;
        Pago huerfano = Pago.builder()
                .reservaId(reservaId)
                .estudianteId(estudianteIdGrupal)
                .monto(monto)
                .build();
        log.error("🚨 Webhook sin pago correlacionable (ni por paymentId ni PENDIENTE). "
                        + "reservaId={} estudianteIdGrupal={} paymentId={} statusMp={}",
                reservaId, estudianteIdGrupal, paymentIdStr, status);
        marcarDiscrepancia(huerfano, paymentIdStr, reservaId,
                "SIN_PAGO_PENDIENTE_CORRELACIONABLE",
                "No existe Pago (por paymentId ni PENDIENTE) para correlacionar este webhook. statusMp=" + status);
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

        // Ventana de validez del ts (recomendación de Mercado Pago): descarta timestamps fuera de
        // rango para evitar que una firma capturada se reenvíe indefinidamente (replay attack).
        // Se trata igual que una firma inválida: mismo mensaje y mismo camino de rechazo.
        try {
            long tsEpochSeconds = Long.parseLong(ts);
            long deltaSegundos = Math.abs(Instant.now().getEpochSecond() - tsEpochSeconds);
            if (deltaSegundos > webhookTsWindowSeconds) {
                log.warn("Firma de webhook con ts fuera de ventana de validez (máx {}s, delta={}s). ts={}",
                        webhookTsWindowSeconds, deltaSegundos, ts);
                throw new WebhookInvalidoException("Firma de webhook inválida");
            }
        } catch (NumberFormatException e) {
            log.warn("Firma de webhook con ts no numérico: {}", ts);
            throw new WebhookInvalidoException("Firma de webhook inválida");
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

    /**
     * Ítem 370: mismo dato que {@link #consultarEstado}, pero SIN el chequeo anti-IDOR — para
     * la herramienta admin de reconciliación, que necesita ver el estado de CUALQUIER reserva
     * (no solo la propia). Solo se invoca detrás de {@code @PreAuthorize("hasRole('ADMIN')")}
     * en el controller.
     */
    @Transactional(readOnly = true)
    public EstadoPagoResponse consultarEstadoAdmin(Long reservaId) {
        EstadoPagoResponse sinPago = new EstadoPagoResponse("SIN_PAGO", null, null, null);
        return pagoRepository.findFirstByReservaIdOrderByFechaCreacionDesc(reservaId)
                .map(p -> new EstadoPagoResponse(
                        p.getEstado(),
                        p.getPaymentId(),
                        p.getMonto(),
                        p.getFechaPago() != null ? p.getFechaPago().toString() : null))
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

    // ------------------------------------------------------------------------------------
    // Ítem 279: historial de pagos del estudiante
    // ------------------------------------------------------------------------------------

    /**
     * Historial paginado de pagos del estudiante autenticado, más reciente primero. El título de
     * la propiedad se resuelve por fila vía el mismo {@link ReservasClient} que ya usa
     * {@code crearPreferencia} — si la llamada falla para alguna fila (servicio-propiedades caído,
     * reserva ya no existe), se omite el título y el resto del pago igual se devuelve.
     */
    @Transactional(readOnly = true)
    public Page<PagoHistorialDTO> listarMisPagos(CurrentUser current, Pageable pageable) {
        if (current == null || current.getPerfilId() == null) {
            throw new IllegalStateException("No se pudo identificar al estudiante");
        }
        return pagoRepository.findByEstudianteIdOrderByFechaCreacionDesc(current.getPerfilId(), pageable)
                .map(this::toHistorialDTO);
    }

    private PagoHistorialDTO toHistorialDTO(Pago pago) {
        String propiedadTitulo = null;
        try {
            ReservaDetalleDTO reserva = reservasClient.obtenerReserva(pago.getReservaId());
            propiedadTitulo = reserva != null ? reserva.getPropiedadTitulo() : null;
        } catch (Exception e) {
            log.warn("[Historial] No se pudo resolver el título de la propiedad para reserva {}: {}",
                    pago.getReservaId(), e.getMessage());
        }
        return new PagoHistorialDTO(
                pago.getId(),
                pago.getReservaId(),
                pago.getMonto(),
                pago.getComision(),
                pago.getEstado(),
                pago.getFechaPago(),
                pago.getFechaCreacion(),
                propiedadTitulo);
    }

    // ------------------------------------------------------------------------------------
    // Ítem 318: historial de pagos del arrendador (fechaPago real, self-service)
    // ------------------------------------------------------------------------------------

    /**
     * Historial COMPLETO de pagos PAGADOs del arrendador autenticado, más reciente primero por
     * {@code fechaPago} REAL (no {@code fechaInicio} de la reserva, que es lo que el frontend
     * usaba antes por no tener otra fuente). Anti-IDOR: siempre filtra por
     * {@code current.getPerfilId()}, nunca por un id que venga del cliente — mismo patrón que
     * {@link #listarMisPagos}. Sin paginar (como el resto de los listados self-service de este
     * servicio — {@code DesembolsoController#misDesembolsos}, {@code DepositoService#historialDelArrendador}):
     * el volumen esperado por arrendador es bajo y el frontend necesita la lista completa para
     * filtrar/agrupar client-side (ítems 319/320).
     */
    @Transactional(readOnly = true)
    public List<PagoArrendadorHistorialDTO> listarHistorialArrendador(CurrentUser current) {
        if (current == null || current.getPerfilId() == null) {
            throw new IllegalStateException("No se pudo identificar al arrendador");
        }
        return pagoRepository
                .findByArrendadorIdAndEstadoOrderByFechaPagoDesc(current.getPerfilId(), "PAGADO")
                .stream()
                .map(this::toHistorialArrendadorDTO)
                .toList();
    }

    private PagoArrendadorHistorialDTO toHistorialArrendadorDTO(Pago pago) {
        String propiedadTitulo = null;
        Long propiedadId = null;
        try {
            ReservaDetalleDTO reserva = reservasClient.obtenerReserva(pago.getReservaId());
            if (reserva != null) {
                propiedadTitulo = reserva.getPropiedadTitulo();
                propiedadId = reserva.getPropiedadId();
            }
        } catch (Exception e) {
            log.warn("[HistorialArrendador] No se pudo resolver el título de la propiedad para reserva {}: {}",
                    pago.getReservaId(), e.getMessage());
        }
        return new PagoArrendadorHistorialDTO(
                pago.getId(),
                pago.getReservaId(),
                pago.getMonto(),
                pago.getComision(),
                pago.getMontoArrendador(),
                pago.getEstado(),
                pago.getFechaPago(),
                pago.getFechaCreacion(),
                propiedadTitulo,
                propiedadId);
    }

    // ------------------------------------------------------------------------------------
    // Ítem 351: panel admin de pagos fallidos (fuente #4 de alerts/page.tsx en el frontend)
    // ------------------------------------------------------------------------------------

    private static final List<String> ESTADOS_FALLIDOS =
            List.of("RECHAZADO", "DISCREPANCIA", "PENDIENTE_REVISION");

    /**
     * Pagos en un estado que requiere atención manual del admin. Sin Feign a servicio-propiedades
     * (a diferencia de {@link #toHistorialDTO}/{@link #toHistorialArrendadorDTO}): el panel de
     * alertas solo necesita el conteo y datos mínimos de triage, no vale la pena esa latencia
     * extra por fila. Ordenado por más reciente primero.
     */
    @Transactional(readOnly = true)
    public List<PagoFallidoDTO> listarFallidosAdmin() {
        return pagoRepository.findByEstadoIn(ESTADOS_FALLIDOS).stream()
                .sorted(java.util.Comparator.comparing(Pago::getFechaCreacion,
                        java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder())))
                .map(p -> new PagoFallidoDTO(
                        p.getId(),
                        p.getReservaId(),
                        p.getEstudianteId(),
                        p.getArrendadorId(),
                        p.getMonto(),
                        p.getEstado(),
                        p.getFechaCreacion(),
                        p.getFechaPago()))
                .toList();
    }

    // ------------------------------------------------------------------------------------
    // Ítem 280: comprobante PDF del pago
    // ------------------------------------------------------------------------------------

    private static final DateTimeFormatter COMPROBANTE_FECHA_LARGA =
            DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy, HH:mm", new Locale("es", "PE"));

    /**
     * Genera el PDF del comprobante del pago PAGADO más reciente de la reserva. Valida que la
     * reserva pertenezca al estudiante autenticado (403 vía {@link ComprobanteAccesoDenegadoException})
     * antes de generar nada. El título de la propiedad y el nombre del estudiante se resuelven vía
     * el mismo {@link ReservasClient} usado en el resto del servicio; si la llamada falla, se usan
     * valores genéricos en vez de bloquear la descarga del comprobante.
     */
    public byte[] generarComprobantePdf(Long reservaId, CurrentUser current) {
        Pago pago = pagoRepository.findFirstByReservaIdAndEstadoOrderByFechaCreacionDesc(reservaId, "PAGADO")
                .orElseThrow(() -> new IllegalArgumentException(
                        "No hay un pago confirmado para la reserva " + reservaId));

        if (current == null || current.getPerfilId() == null
                || pago.getEstudianteId() == null
                || !current.getPerfilId().equals(pago.getEstudianteId())) {
            throw new ComprobanteAccesoDenegadoException(
                    "No puedes descargar el comprobante de un pago que no es tuyo");
        }

        String propiedadTitulo = "Habitación";
        String estudianteNombre = "Estudiante AlquilaYa";
        try {
            ReservaDetalleDTO reserva = reservasClient.obtenerReserva(reservaId);
            if (reserva != null) {
                if (reserva.getPropiedadTitulo() != null && !reserva.getPropiedadTitulo().isBlank()) {
                    propiedadTitulo = reserva.getPropiedadTitulo();
                }
                if (reserva.getEstudianteNombre() != null && !reserva.getEstudianteNombre().isBlank()) {
                    estudianteNombre = reserva.getEstudianteNombre();
                }
            }
        } catch (Exception e) {
            log.warn("[Comprobante] No se pudo obtener datos de la reserva {}: {}", reservaId, e.getMessage());
        }

        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            var fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            var font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            float margin = 55f;
            float y = page.getMediaBox().getHeight() - margin;
            float leading = 16f;

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                y = comprobanteTitulo(cs, fontBold, margin, y, "COMPROBANTE DE PAGO - AlquilaYa");
                y -= 10;
                y = comprobanteParrafo(cs, font, margin, y, leading, "Reserva No. " + reservaId
                        + "  -  Generado el " + LocalDateTime.now().format(COMPROBANTE_FECHA_LARGA));
                y -= 10;

                y = comprobanteSubtitulo(cs, fontBold, margin, y, "1. Datos del pago");
                y = comprobanteParrafo(cs, font, margin, y, leading,
                        "Numero de operacion (Mercado Pago): " + nvl(pago.getPaymentId()));
                y = comprobanteParrafo(cs, font, margin, y, leading,
                        "Fecha de pago: " + (pago.getFechaPago() != null
                                ? pago.getFechaPago().format(COMPROBANTE_FECHA_LARGA)
                                : "-"));
                y = comprobanteParrafo(cs, font, margin, y, leading, "Estado: " + pago.getEstado());
                y -= 6;

                y = comprobanteSubtitulo(cs, fontBold, margin, y, "2. Partes");
                y = comprobanteParrafo(cs, font, margin, y, leading, "Estudiante: " + estudianteNombre);
                y = comprobanteParrafo(cs, font, margin, y, leading, "Propiedad: " + propiedadTitulo);
                y -= 6;

                y = comprobanteSubtitulo(cs, fontBold, margin, y, "3. Montos");
                y = comprobanteParrafo(cs, font, margin, y, leading,
                        "Monto pagado: S/ " + nvl(pago.getMonto()));
                y = comprobanteParrafo(cs, font, margin, y, leading,
                        "Comision de plataforma: S/ " + nvl(pago.getComision()));
                y = comprobanteParrafo(cs, font, margin, y, leading,
                        "Monto para el arrendador: S/ " + nvl(pago.getMontoArrendador()));
                y -= 14;

                cs.setFont(font, 8);
                cs.beginText();
                cs.newLineAtOffset(margin, margin);
                cs.showText(comprobanteAsciiSeguro(
                        "Documento generado automaticamente por AlquilaYa a partir del pago registrado en Mercado Pago."));
                cs.endText();
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo generar el comprobante: " + e.getMessage(), e);
        }
    }

    private static String nvl(Object valor) {
        return valor == null ? "-" : valor.toString();
    }

    private static float comprobanteTitulo(PDPageContentStream cs, PDType1Font font, float x, float y, String texto) throws IOException {
        cs.setFont(font, 16);
        cs.beginText();
        cs.newLineAtOffset(x, y);
        cs.showText(comprobanteAsciiSeguro(texto));
        cs.endText();
        return y - 22;
    }

    private static float comprobanteSubtitulo(PDPageContentStream cs, PDType1Font font, float x, float y, String texto) throws IOException {
        cs.setFont(font, 12);
        cs.beginText();
        cs.newLineAtOffset(x, y);
        cs.showText(comprobanteAsciiSeguro(texto));
        cs.endText();
        return y - 18;
    }

    private static float comprobanteParrafo(PDPageContentStream cs, PDType1Font font, float x, float y, float leading, String texto) throws IOException {
        cs.setFont(font, 10.5f);
        cs.beginText();
        cs.newLineAtOffset(x, y);
        cs.showText(comprobanteAsciiSeguro(texto));
        cs.endText();
        return y - leading;
    }

    /** Mismo motivo que {@code ContratoService#asciiSeguro} (servicio-propiedades): los Standard14
     *  de PDFBox no garantizan tildes/eñes con {@code showText()}, así que se transliteran a ASCII. */
    private static String comprobanteAsciiSeguro(String texto) {
        if (texto == null) return "";
        String normalizado = Normalizer.normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalizado
                .replace('¿', '?').replace('¡', '!')
                .replace('—', '-').replace('–', '-')
                .replace('·', '-')
                .replace('º', 'o').replace('ª', 'a');
    }
}
