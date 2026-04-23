package com.alquilaya.serviciopropiedades.kafka;

import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PagoEventListener {

    private final ReservaRepository reservaRepository;

    @KafkaListener(topics = "pagos-topic", groupId = "propiedades-group")
    public void escucharPagos(String mensaje) {
        log.info("📥 Evento de pago recibido: {}", mensaje);
        
        if (mensaje.startsWith("PAGO_EXITOSO:")) {
            String reservaIdStr = mensaje.split(":")[1];
            Long reservaId = Long.parseLong(reservaIdStr);
            
            reservaRepository.findById(reservaId).ifPresent(reserva -> {
                log.info("✅ Actualizando estado de Reserva ID {} a PAGADA", reservaId);
                reserva.setEstado(EstadoReserva.PAGADA);
                reservaRepository.save(reserva);
            });
        }
    }
}
