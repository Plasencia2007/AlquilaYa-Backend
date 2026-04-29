package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.clients.MensajeriaClient;
import com.alquilaya.serviciopropiedades.dto.ActividadDTO;
import com.alquilaya.serviciopropiedades.dto.DashboardArrendadorDTO;
import com.alquilaya.serviciopropiedades.dto.IngresoMensualDTO;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private static final DateTimeFormatter MES_FMT = DateTimeFormatter.ofPattern("yyyy-MM");
    private static final EnumSet<EstadoReserva> ESTADOS_OCUPACION =
            EnumSet.of(EstadoReserva.APROBADA, EstadoReserva.PAGADA);

    private final PropiedadRepository propiedadRepository;
    private final ReservaRepository reservaRepository;
    private final MensajeriaClient mensajeriaClient;

    @Override
    public DashboardArrendadorDTO obtenerMetricasArrendador(Long arrendadorId) {
        List<Propiedad> propiedades = propiedadRepository.findByArrendadorId(arrendadorId);
        List<Reserva> reservas = reservaRepository.findByArrendadorIdOrderByFechaCreacionDesc(arrendadorId);

        long totalPropiedades = propiedades.size();
        long propiedadesActivas = propiedades.stream()
                .filter(p -> p.getEstado() == EstadoPropiedad.APROBADO
                        && Boolean.TRUE.equals(p.getEstaDisponible()))
                .count();

        Set<Long> propiedadesOcupadas = reservas.stream()
                .filter(r -> ESTADOS_OCUPACION.contains(r.getEstado()))
                .map(Reserva::getPropiedadId)
                .collect(Collectors.toSet());

        double tasaOcupacion = propiedadesActivas == 0
                ? 0.0
                : Math.round((propiedadesOcupadas.size() * 1000.0 / propiedadesActivas)) / 10.0;

        YearMonth mesActual = YearMonth.now();
        YearMonth mesAnterior = mesActual.minusMonths(1);

        Map<YearMonth, BigDecimal> ingresosPorYM = new HashMap<>();
        for (Reserva r : reservas) {
            if (r.getEstado() != EstadoReserva.PAGADA && r.getEstado() != EstadoReserva.FINALIZADA) continue;
            LocalDateTime fechaPago = r.getFechaActualizacion() != null ? r.getFechaActualizacion() : r.getFechaCreacion();
            if (fechaPago == null) continue;
            YearMonth ym = YearMonth.from(fechaPago);
            ingresosPorYM.merge(ym, r.getMontoTotal() != null ? r.getMontoTotal() : BigDecimal.ZERO, BigDecimal::add);
        }

        BigDecimal ingresosMesActual = ingresosPorYM.getOrDefault(mesActual, BigDecimal.ZERO);
        BigDecimal ingresosMesAnterior = ingresosPorYM.getOrDefault(mesAnterior, BigDecimal.ZERO);

        List<IngresoMensualDTO> ingresosPorMes = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            YearMonth ym = mesActual.minusMonths(i);
            ingresosPorMes.add(IngresoMensualDTO.builder()
                    .mes(ym.format(MES_FMT))
                    .monto(ingresosPorYM.getOrDefault(ym, BigDecimal.ZERO))
                    .build());
        }

        long reservasPendientes = reservas.stream()
                .filter(r -> r.getEstado() == EstadoReserva.SOLICITADA).count();
        long reservasActivas = reservas.stream()
                .filter(r -> r.getEstado() == EstadoReserva.APROBADA || r.getEstado() == EstadoReserva.PAGADA)
                .count();

        Map<Long, String> titulosPropiedad = propiedades.stream()
                .collect(Collectors.toMap(Propiedad::getId, Propiedad::getTitulo, (a, b) -> a));

        List<ActividadDTO> actividad = reservas.stream()
                .sorted(Comparator.comparing(
                        (Reserva r) -> r.getFechaActualizacion() != null ? r.getFechaActualizacion() : r.getFechaCreacion(),
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(10)
                .map(r -> mapearActividad(r, titulosPropiedad))
                .collect(Collectors.toList());

        long mensajesSinLeer = 0L;
        try {
            Map<String, Long> resp = mensajeriaClient.contarNoLeidas();
            if (resp != null && resp.get("count") != null) {
                mensajesSinLeer = resp.get("count");
            }
        } catch (Exception e) {
            log.warn("No se pudo obtener mensajes sin leer para arrendador {}: {}", arrendadorId, e.getMessage());
        }

        // TODO: vistasUltimos30Dias requiere una tabla de vistas/eventos por propiedad que aún
        // no existe en este servicio. Devolvemos 0 hasta que se implemente el tracking.
        long vistasUltimos30Dias = 0L;

        return DashboardArrendadorDTO.builder()
                .ingresosMesActual(ingresosMesActual)
                .ingresosMesAnterior(ingresosMesAnterior)
                .tasaOcupacion(tasaOcupacion)
                .totalPropiedades(totalPropiedades)
                .propiedadesActivas(propiedadesActivas)
                .vistasUltimos30Dias(vistasUltimos30Dias)
                .mensajesSinLeer(mensajesSinLeer)
                .reservasPendientes(reservasPendientes)
                .reservasActivas(reservasActivas)
                .actividadReciente(actividad)
                .ingresosPorMes(ingresosPorMes)
                .build();
    }

    private ActividadDTO mapearActividad(Reserva r, Map<Long, String> titulos) {
        String titulo = titulos.getOrDefault(r.getPropiedadId(), "Propiedad " + r.getPropiedadId());
        String tipo = switch (r.getEstado()) {
            case SOLICITADA -> "RESERVA_NUEVA";
            case APROBADA -> "RESERVA_APROBADA";
            case RECHAZADA -> "RESERVA_RECHAZADA";
            case PAGADA -> "RESERVA_PAGADA";
            case FINALIZADA -> "RESERVA_FINALIZADA";
            case CANCELADA -> "RESERVA_CANCELADA";
        };
        String descripcion = switch (r.getEstado()) {
            case SOLICITADA -> "Nueva solicitud de reserva en " + titulo;
            case APROBADA -> "Reserva aprobada en " + titulo;
            case RECHAZADA -> "Reserva rechazada en " + titulo;
            case PAGADA -> "Pago recibido por " + titulo;
            case FINALIZADA -> "Reserva finalizada en " + titulo;
            case CANCELADA -> "Reserva cancelada en " + titulo;
        };
        LocalDateTime fecha = r.getFechaActualizacion() != null ? r.getFechaActualizacion() : r.getFechaCreacion();
        return ActividadDTO.builder()
                .tipo(tipo)
                .descripcion(descripcion)
                .fecha(fecha)
                .referenciaId(String.valueOf(r.getId()))
                .build();
    }
}
