package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.clients.MensajeriaClient;
import com.alquilaya.serviciopropiedades.dto.ActividadDTO;
import com.alquilaya.serviciopropiedades.dto.DashboardArrendadorDTO;
import com.alquilaya.serviciopropiedades.dto.IngresoMensualDTO;
import com.alquilaya.serviciopropiedades.dto.PuntoMensualDTO;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import com.alquilaya.serviciopropiedades.enums.TipoEvento;
import com.alquilaya.serviciopropiedades.repositories.EventoPropiedadRepository;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
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
    private final EventoPropiedadRepository eventoPropiedadRepository;
    private final MensajeriaClient mensajeriaClient;

    @Override
    public DashboardArrendadorDTO obtenerMetricasArrendador(Long arrendadorId) {
        // Excluye borradores: no cuentan como propiedades del arrendador en las métricas.
        List<Propiedad> propiedades = propiedadRepository
                .findByArrendadorIdAndEstadoNot(arrendadorId, EstadoPropiedad.BORRADOR);
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

        // Ítem 321: ocupación histórica retroactiva. No hay snapshot persistido del estado
        // mes a mes de cada propiedad, así que se reconstruye desde las reservas ya cerradas
        // — mismo enfoque que ingresosPorMes arriba (misma ventana de 7 meses, misma fuente
        // `reservas` ya cargada). Un mes cuenta como "ocupado" para una propiedad si existió
        // al menos una reserva PAGADA/FINALIZADA cuyo rango [fechaInicio,fechaFin] se cruza
        // con ese mes (no exige que la reserva se haya originado ese mes, a diferencia de
        // ingresosPorMes que sí agrupa por fecha de pago).
        // Limitación conocida (documentada, igual que tasaOcupacion arriba): el denominador
        // usa el conteo ACTUAL de propiedadesActivas — no existe historial de qué propiedades
        // estaban activas en cada mes pasado, así que se usa como proxy constante.
        List<Reserva> reservasCerradas = reservas.stream()
                .filter(r -> r.getEstado() == EstadoReserva.PAGADA || r.getEstado() == EstadoReserva.FINALIZADA)
                .toList();

        List<PuntoMensualDTO> ocupacionPorMes = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            YearMonth ym = mesActual.minusMonths(i);
            LocalDate inicioMes = ym.atDay(1);
            LocalDate finMes = ym.atEndOfMonth();

            long propiedadesOcupadasEnMes = reservasCerradas.stream()
                    .filter(r -> !r.getFechaInicio().isAfter(finMes) && !r.getFechaFin().isBefore(inicioMes))
                    .map(Reserva::getPropiedadId)
                    .distinct()
                    .count();

            double ocupacionMes = propiedadesActivas == 0
                    ? 0.0
                    : Math.round((propiedadesOcupadasEnMes * 1000.0 / propiedadesActivas)) / 10.0;

            ocupacionPorMes.add(PuntoMensualDTO.builder()
                    .mes(ym.format(MES_FMT))
                    .valor(ocupacionMes)
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

        // Vistas de los últimos 30 días across TODAS las propiedades del arrendador.
        // Suma las filas EventoPropiedad(tipo=VISTA) que registra incrementarVistasAsync en
        // cada visita al detalle, en UNA sola query agregada (COUNT + IN + >=). Si el
        // arrendador no tiene propiedades evitamos un IN () vacío devolviendo 0 directo.
        // Nota de correctitud: solo cuenta vistas ocurridas desde que se activó el tracking
        // de eventos; propiedades vistas antes no tienen filas históricas. Es correcto para
        // una métrica "últimos 30 días", que solo mira hacia adelante.
        List<Long> propiedadIds = propiedades.stream().map(Propiedad::getId).toList();
        long vistasUltimos30Dias = propiedadIds.isEmpty()
                ? 0L
                : eventoPropiedadRepository.countByPropiedadIdInAndTipoAndFechaCreacionAfter(
                        propiedadIds, TipoEvento.VISTA, LocalDateTime.now().minusDays(30));

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
                .ocupacionPorMes(ocupacionPorMes)
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
            case EXPIRADA -> "RESERVA_EXPIRADA";
        };
        String descripcion = switch (r.getEstado()) {
            case SOLICITADA -> "Nueva solicitud de reserva en " + titulo;
            case APROBADA -> "Reserva aprobada en " + titulo;
            case RECHAZADA -> "Reserva rechazada en " + titulo;
            case PAGADA -> "Pago recibido por " + titulo;
            case FINALIZADA -> "Reserva finalizada en " + titulo;
            case CANCELADA -> "Reserva cancelada en " + titulo;
            case EXPIRADA -> "Reserva expirada por falta de pago en " + titulo;
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
