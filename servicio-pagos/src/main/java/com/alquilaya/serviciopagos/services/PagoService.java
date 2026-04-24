package com.alquilaya.serviciopagos.services;

import com.alquilaya.serviciopagos.clients.ReservasClient;
import com.alquilaya.serviciopagos.dto.ReservaDetalleDTO;
import com.alquilaya.serviciopagos.entities.Pago;
import com.alquilaya.serviciopagos.repositories.PagoRepository;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.preference.PreferenceBackUrlsRequest;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.client.preference.PreferenceItemRequest;
import com.mercadopago.client.preference.PreferenceRequest;
import com.mercadopago.resources.payment.Payment;
import com.mercadopago.resources.preference.Preference;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.kafka.core.KafkaTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

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

    public String crearPreferencia(Long reservaId) {
        try {
            log.info("Iniciando creación de preferencia para Reserva ID: {}", reservaId);

            var pagoExistente = pagoRepository.findFirstByReservaIdAndEstadoOrderByFechaCreacionDesc(reservaId, "PAGADO");
            if (pagoExistente.isPresent()) {
                throw new RuntimeException("La reserva " + reservaId + " ya fue pagada");
            }

            ReservaDetalleDTO reserva = reservasClient.obtenerReserva(reservaId);
            
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

        } catch (Exception e) {
            log.error("❌ Error FATAL creando preferencia de Mercado Pago: {}", e.getMessage(), e);
            throw new RuntimeException("No se pudo generar el link de pago: " + e.getMessage());
        }
    }

    public void procesarWebhook(Map<String, Object> notification) {
        try {
            String type = (String) notification.get("type");
            if ("payment".equals(type)) {
                Map<String, Object> data = (Map<String, Object>) notification.get("data");
                Long paymentId = Long.parseLong(data.get("id").toString());
                
                PaymentClient client = new PaymentClient();
                Payment payment = client.get(paymentId);
                
                if ("approved".equals(payment.getStatus())) {
                    String reservaIdStr = payment.getExternalReference();
                    Long reservaId = Long.parseLong(reservaIdStr);
                    log.info("💰 Pago APROBADO para Reserva ID: {}. PaymentId: {}", reservaIdStr, paymentId);

                    var pagoPendiente = pagoRepository.findFirstByReservaIdAndEstadoOrderByFechaCreacionDesc(reservaId, "PENDIENTE");
                    if (pagoPendiente.isEmpty()) {
                        log.info("↩️ Webhook ignorado: la reserva {} no tiene pago PENDIENTE (ya procesado o duplicado)", reservaId);
                        return;
                    }

                    Pago p = pagoPendiente.get();
                    p.setEstado("PAGADO");
                    p.setPaymentId(paymentId.toString());
                    p.setFechaPago(LocalDateTime.now());
                    pagoRepository.save(p);

                    kafkaTemplate.send("pagos-topic", "PAGO_EXITOSO:" + reservaIdStr);
                }
            }
        } catch (Exception e) {
            log.error("Error procesando Webhook de Mercado Pago: {}", e.getMessage());
        }
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
