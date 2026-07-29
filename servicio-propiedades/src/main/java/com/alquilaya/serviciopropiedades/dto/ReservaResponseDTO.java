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
    /** Habitación reservada (si la propiedad se gestiona por habitaciones). Null si es completa. */
    private Long habitacionId;
    private Long estudianteId;
    private Long arrendadorId;
    private LocalDate fechaInicio;
    private LocalDate fechaFin;
    private BigDecimal montoTotal;
    /**
     * Comisión de plataforma para esta venta, según la zona de la propiedad. El estudiante paga
     * {@code montoTotal + comision}; el arrendador recibe {@code montoTotal} íntegro. Puede ser 0.
     */
    private BigDecimal comision;
    /** Estado interno completo (SOLICITADA, APROBADA, RECHAZADA, PAGADA, FINALIZADA, CANCELADA). */
    private EstadoReserva estado;
    private String propiedadTitulo;
    private String estudianteNombre;
    private String estudianteCorreo;
    private String estudianteTelefono;
    private String estudianteUniversidad;
    private String estudianteCarrera;
    private Boolean estudianteVerificado;
    /** Score agregado de reputación del estudiante 0–100 (#26). */
    private Integer estudianteScore;
    /** Nivel del estudiante: BRONCE/PLATA/ORO/PLATINO (#26). */
    private String estudianteNivelReputacion;
    private String estadoFrontend;
    private String motivoRechazo;
    private String motivoCancelacion;
    private LocalDateTime fechaCreacion;
    /** Si la reserva es grupal (#38 Fase 2): el pago es dividido por cuotas. Null = individual. */
    private Long grupoId;
    /** Firma electrónica del contrato (G4, ítem 237) — null si esa parte aún no firmó. */
    private LocalDateTime firmaEstudianteAt;
    private LocalDateTime firmaArrendadorAt;
    /**
     * Momento en que una reserva APROBADA expira si no se paga (ítem 238). Solo se calcula
     * para {@code estado == APROBADA} (el controller lo setea aparte, ver
     * {@code ReservaController#toResponseDTO} — necesita {@code ConfiguracionReservaService},
     * que no es visible desde este DTO estático). Null en cualquier otro estado.
     */
    private LocalDateTime fechaExpiracion;

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
                .habitacionId(r.getHabitacionId())
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
                .motivoCancelacion(r.getMotivoCancelacion())
                .fechaCreacion(r.getFechaCreacion())
                .grupoId(r.getGrupoId())
                .firmaEstudianteAt(r.getFirmaEstudianteAt())
                .firmaArrendadorAt(r.getFirmaArrendadorAt())
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
            case EXPIRADA -> "EXPIRADO";
        };
    }
}
