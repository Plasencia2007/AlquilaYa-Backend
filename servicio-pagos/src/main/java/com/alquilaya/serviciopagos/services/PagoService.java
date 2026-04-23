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

    public String crearPreferencia(Long reservaId) {
        try {
            ReservaDetalleDTO reserva = reservasClient.obtenerReserva(reservaId);
            
            PreferenceItemRequest itemRequest = PreferenceItemRequest.builder()
                    .id(reserva.getId().toString())
                    .title("Reserva AlquilaYa: " + reserva.getPropiedadTitulo())
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

            // Configurar el pagador (Payer) con datos del estudiante
            com.mercadopago.client.preference.PreferencePayerRequest payer = com.mercadopago.client.preference.PreferencePayerRequest.builder()
                    .name(reserva.getEstudianteNombre())
                    .email(reserva.getEstudianteCorreo())
                    .build();

            PreferenceRequest preferenceRequest = PreferenceRequest.builder()
                    .items(items)
                    .payer(payer)
                    .backUrls(backUrls)
                    // URL de notificación (Webhook) - En producción debe ser una URL real
                    .notificationUrl("https://webhook.site/tu-id-temporal/api/v1/pagos/webhook") 
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

            return preference.getInitPoint();

        } catch (Exception e) {
            log.error("Error creando preferencia de Mercado Pago: {}", e.getMessage());
            throw new RuntimeException("No se pudo generar el link de pago");
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
                    log.info("💰 Pago APROBADO para Reserva ID: {}. PaymentId: {}", reservaIdStr, paymentId);
                    
                    pagoRepository.findByReservaId(Long.parseLong(reservaIdStr)).ifPresent(p -> {
                        p.setEstado("PAGADO");
                        p.setPaymentId(paymentId.toString());
                        p.setFechaPago(LocalDateTime.now());
                        pagoRepository.save(p);
                    });
                    
                    kafkaTemplate.send("pagos-topic", "PAGO_EXITOSO:" + reservaIdStr);
                }
            }
        } catch (Exception e) {
            log.error("Error procesando Webhook de Mercado Pago: {}", e.getMessage());
        }
    }
}
