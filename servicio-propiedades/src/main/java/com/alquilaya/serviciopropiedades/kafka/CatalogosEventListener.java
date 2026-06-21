package com.alquilaya.serviciopropiedades.kafka;

import com.alquilaya.serviciopropiedades.services.CampusProvider;
import com.alquilaya.serviciopropiedades.services.ZonaProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Consume avisos de cambio de catálogo ({@code catalogos-topic}) e invalida los caches en memoria
 * de zonas y campus, para que una edición en el admin se refleje al instante sin esperar el TTL.
 *
 * La invalidación es idempotente y best-effort: si el evento se pierde, el TTL de los providers
 * (5 min) termina recogiendo el cambio igual.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CatalogosEventListener {

    public static final String TOPIC = "catalogos-topic";

    private final ZonaProvider zonaProvider;
    private final CampusProvider campusProvider;

    @KafkaListener(topics = TOPIC, groupId = "propiedades-group")
    public void escuchar(String evento) {
        log.info("[CATALOGOS] Evento '{}' recibido → invalidando caches de zonas y campus", evento);
        zonaProvider.invalidate();
        campusProvider.invalidate();
    }
}
