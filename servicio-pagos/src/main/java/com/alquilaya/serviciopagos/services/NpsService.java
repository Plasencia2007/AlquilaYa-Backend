package com.alquilaya.serviciopagos.services;

import com.alquilaya.serviciopagos.dto.NpsRequestDTO;
import com.alquilaya.serviciopagos.entities.NpsRespuesta;
import com.alquilaya.serviciopagos.repositories.NpsRespuestaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Item 298: encuesta NPS post-transacción. Cualquier usuario autenticado registra la suya. */
@Service
@RequiredArgsConstructor
public class NpsService {

    private final NpsRespuestaRepository npsRespuestaRepository;

    @Transactional
    public NpsRespuesta registrar(NpsRequestDTO dto) {
        if (dto == null || dto.reservaId() == null) {
            throw new IllegalArgumentException("reservaId es obligatorio");
        }
        if (dto.score() == null || dto.score() < 0 || dto.score() > 10) {
            throw new IllegalArgumentException("score debe estar entre 0 y 10");
        }
        NpsRespuesta respuesta = NpsRespuesta.builder()
                .reservaId(dto.reservaId())
                .score(dto.score())
                .comentario(dto.comentario())
                .build();
        return npsRespuestaRepository.save(respuesta);
    }
}
