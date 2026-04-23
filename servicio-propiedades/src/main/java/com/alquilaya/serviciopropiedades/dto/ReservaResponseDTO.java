package com.alquilaya.serviciopropiedades.dto;

import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class ReservaResponseDTO {
    private Long id;
    private Long propiedadId;
    private Long estudianteId;
    private Long arrendadorId;
    private LocalDate fechaInicio;
    private LocalDate fechaFin;
    private BigDecimal montoTotal;
    /** Estado interno completo (SOLICITADA, APROBADA, RECHAZADA, PAGADA, FINALIZADA, CANCELADA). */
    private EstadoReserva estado;
    private String propiedadTitulo;
    private String estudianteNombre;
    private String estudianteCorreo;
    private String estadoFrontend;
    private String motivoRechazo;
    private LocalDateTime fechaCreacion;

    public static ReservaResponseDTO from(Reserva r) {
        return from(r, "", "", "");
    }

    public static ReservaResponseDTO from(Reserva r, String titulo) {
        return from(r, titulo, "", "");
    }

    public static ReservaResponseDTO from(Reserva r, String titulo, String estNombre, String estCorreo) {
        return ReservaResponseDTO.builder()
                .id(r.getId())
                .propiedadId(r.getPropiedadId())
                .propiedadTitulo(titulo)
                .estudianteId(r.getEstudianteId())
                .estudianteNombre(estNombre)
                .estudianteCorreo(estCorreo)
                .arrendadorId(r.getArrendadorId())
                .fechaInicio(r.getFechaInicio())
                .fechaFin(r.getFechaFin())
                .montoTotal(r.getMontoTotal())
                .estado(r.getEstado())
                .estadoFrontend(mapearEstadoFrontend(r.getEstado()))
                .motivoRechazo(r.getMotivoRechazo())
                .fechaCreacion(r.getFechaCreacion())
                .build();
    }

    private static String mapearEstadoFrontend(EstadoReserva e) {
        return switch (e) {
            case SOLICITADA -> "PENDIENTE";
            case APROBADA -> "APROBADO";
            case RECHAZADA -> "RECHAZADO";
            case PAGADA -> "PAGADO";
            case FINALIZADA -> "PAGADO";
            case CANCELADA -> "CANCELADO";
        };
    }
}
