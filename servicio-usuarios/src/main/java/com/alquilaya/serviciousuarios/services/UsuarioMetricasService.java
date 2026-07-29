package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.dto.RegistroSemanalDTO;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

/**
 * Ítem 386: métricas de crecimiento de usuarios para el panel admin (dashboard de métricas,
 * {@code metrics/page.tsx}). Hoy solo tiene el agregado semanal; es el lugar natural para
 * cualquier otra métrica de {@code Usuario} que se agregue después.
 */
@Service
@RequiredArgsConstructor
public class UsuarioMetricasService {

    private final UsuarioRepository usuarioRepository;

    /** Conteo de registros por semana dentro de {@code [desde, hasta)}. */
    @Transactional(readOnly = true)
    public List<RegistroSemanalDTO> registrosPorSemana(LocalDateTime desde, LocalDateTime hasta) {
        return usuarioRepository.registrosPorSemana(desde, hasta).stream()
                .map(UsuarioMetricasService::toDTO)
                .toList();
    }

    private static RegistroSemanalDTO toDTO(Object[] fila) {
        Object semanaRaw = fila[0];
        Object totalRaw = fila[1];
        java.time.LocalDate semana = switch (semanaRaw) {
            case Timestamp ts -> ts.toLocalDateTime().toLocalDate();
            case Instant instant -> instant.atZone(ZoneId.systemDefault()).toLocalDate();
            case LocalDateTime ldt -> ldt.toLocalDate();
            case java.time.LocalDate ld -> ld;
            case null, default -> null;
        };
        Long total = totalRaw instanceof Number n ? n.longValue() : 0L;
        return new RegistroSemanalDTO(semana, total);
    }
}
