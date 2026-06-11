package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.entities.ConfiguracionReserva;
import com.alquilaya.serviciopropiedades.repositories.ConfiguracionReservaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Fuente de verdad del plazo de expiración de reservas. El valor vive en BD
 * (editable desde el panel admin) y se siembra con el default de config-server
 * ({@code app.reserva.expiracion-horas}) la primera vez.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConfiguracionReservaService {

    /** Fila única de configuración. */
    public static final Long SINGLETON_ID = 1L;

    /** Límites de cordura para el valor editable (1h .. 30 días). */
    public static final int MIN_HORAS = 1;
    public static final int MAX_HORAS = 720;

    private final ConfiguracionReservaRepository repository;

    @Value("${app.reserva.expiracion-horas:24}")
    private int expiracionHorasDefault;

    /**
     * Horas de expiración vigentes. Si aún no hay fila, la crea con el default
     * de configuración y la devuelve.
     */
    @Transactional
    public int getExpiracionHoras() {
        return repository.findById(SINGLETON_ID)
                .map(ConfiguracionReserva::getExpiracionHoras)
                .orElseGet(this::sembrarPorDefecto);
    }

    /**
     * Actualiza el plazo. Aplica en caliente: el scheduler lo lee en su próxima
     * ejecución sin reiniciar el servicio.
     */
    @Transactional
    public int actualizarExpiracionHoras(int horas) {
        if (horas < MIN_HORAS || horas > MAX_HORAS) {
            throw new IllegalArgumentException(
                    "Las horas de expiración deben estar entre " + MIN_HORAS + " y " + MAX_HORAS);
        }
        ConfiguracionReserva config = repository.findById(SINGLETON_ID)
                .orElseGet(() -> ConfiguracionReserva.builder().id(SINGLETON_ID).build());
        config.setExpiracionHoras(horas);
        repository.save(config);
        log.info("[CONFIG] Plazo de expiración de reservas actualizado a {}h", horas);
        return horas;
    }

    private int sembrarPorDefecto() {
        int horas = expiracionHorasDefault > 0 ? expiracionHorasDefault : 24;
        repository.save(ConfiguracionReserva.builder()
                .id(SINGLETON_ID)
                .expiracionHoras(horas)
                .build());
        log.info("[CONFIG] Sembrada configuración de reserva con default {}h", horas);
        return horas;
    }
}
