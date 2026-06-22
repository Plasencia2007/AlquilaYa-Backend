package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.dto.AnaliticaPropiedadDTO;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.enums.TipoEvento;
import com.alquilaya.serviciopropiedades.repositories.EventoPropiedadRepository;
import com.alquilaya.serviciopropiedades.repositories.FavoritoRepository;
import com.alquilaya.serviciopropiedades.repositories.PropiedadImagenRepository;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Analítica por propiedad para el arrendador (#51–#55): vistas por ventana, embudo de
 * conversión, precio vs zona, sugerencias de mejora y alerta de inactividad.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnaliticaPropiedadService {

    private static final int DIAS_VENTANA = 30;
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE;

    private final EventoPropiedadRepository eventoRepository;
    private final FavoritoRepository favoritoRepository;
    private final ReservaRepository reservaRepository;
    private final PropiedadRepository propiedadRepository;
    private final PropiedadImagenRepository imagenRepository;

    @Transactional(readOnly = true)
    public AnaliticaPropiedadDTO calcular(Propiedad p) {
        Long id = p.getId();
        LocalDateTime ahora = LocalDateTime.now();

        // ---- #51 vistas por día (serie de 30 días, rellenando ceros) ----
        List<AnaliticaPropiedadDTO.PuntoSerie> serie = serieVistas(id, ahora);
        long vistas7 = eventoRepository.countByPropiedadIdAndTipoAndFechaCreacionAfter(
                id, TipoEvento.VISTA, ahora.minusDays(7));
        long vistas30 = eventoRepository.countByPropiedadIdAndTipoAndFechaCreacionAfter(
                id, TipoEvento.VISTA, ahora.minusDays(30));
        // Total histórico: el contador denormalizado de la propiedad (eventos solo desde que existe la tabla).
        long vistasTotal = p.getVistas() != null ? p.getVistas() : 0L;

        // ---- #52 embudo ----
        long contactos = eventoRepository.countByPropiedadIdAndTipo(id, TipoEvento.CONTACTO);
        long favoritos = favoritoRepository.countByPropiedadId(id);
        long reservas = reservaRepository.countByPropiedadId(id);
        AnaliticaPropiedadDTO.Embudo embudo =
                new AnaliticaPropiedadDTO.Embudo(vistasTotal, favoritos, contactos, reservas);

        // ---- #53 precio vs zona ----
        AnaliticaPropiedadDTO.PrecioZona precioVsZona = precioVsZona(p);

        // ---- #55 alerta sin reservas ----
        Reserva ultima = reservaRepository.findFirstByPropiedadIdOrderByFechaCreacionDesc(id);
        Long diasUltimaReserva = null;
        boolean alertaSinReservas;
        if (ultima != null && ultima.getFechaCreacion() != null) {
            diasUltimaReserva = ChronoUnit.DAYS.between(ultima.getFechaCreacion(), ahora);
            alertaSinReservas = diasUltimaReserva > 30;
        } else {
            // Nunca tuvo reservas: alerta solo si lleva publicada más de 30 días.
            LocalDateTime desde = p.getFechaCreacion() != null ? p.getFechaCreacion() : ahora;
            alertaSinReservas = ChronoUnit.DAYS.between(desde, ahora) > 30;
        }

        // ---- #54 sugerencias ----
        List<String> sugerencias = sugerencias(p, precioVsZona, vistas30, favoritos, alertaSinReservas, diasUltimaReserva);

        return new AnaliticaPropiedadDTO(
                serie, vistas7, vistas30, vistasTotal, embudo, precioVsZona,
                sugerencias, diasUltimaReserva, alertaSinReservas);
    }

    private List<AnaliticaPropiedadDTO.PuntoSerie> serieVistas(Long id, LocalDateTime ahora) {
        LocalDateTime desde = ahora.minusDays(DIAS_VENTANA - 1).toLocalDate().atStartOfDay();
        List<Object[]> filas = eventoRepository.conteoPorDia(id, TipoEvento.VISTA, desde);

        Map<String, Long> porDia = new HashMap<>();
        for (Object[] f : filas) {
            LocalDate dia = aLocalDate(f[0]);
            if (dia == null) continue;
            long total = f[1] == null ? 0 : ((Number) f[1]).longValue();
            porDia.put(dia.format(ISO), total);
        }

        List<AnaliticaPropiedadDTO.PuntoSerie> serie = new ArrayList<>(DIAS_VENTANA);
        LocalDate hoy = ahora.toLocalDate();
        for (int i = DIAS_VENTANA - 1; i >= 0; i--) {
            String iso = hoy.minusDays(i).format(ISO);
            serie.add(new AnaliticaPropiedadDTO.PuntoSerie(iso, porDia.getOrDefault(iso, 0L)));
        }
        return serie;
    }

    private AnaliticaPropiedadDTO.PrecioZona precioVsZona(Propiedad p) {
        if (p.getPrecio() == null) return null;
        List<Object[]> stats = propiedadRepository.estadisticasPrecio(
                p.getZonaId(), p.getUniversidadId(), p.getTipoPropiedad());
        if (stats == null || stats.isEmpty() || stats.get(0)[1] == null) return null;
        Object[] r = stats.get(0);
        BigDecimal min = aBigDecimal(r[0]);
        BigDecimal avg = aBigDecimal(r[1]);
        BigDecimal max = aBigDecimal(r[2]);
        long cantidad = r[3] == null ? 0 : ((Number) r[3]).longValue();
        if (avg == null || avg.signum() <= 0) return null;

        BigDecimal precio = p.getPrecio();
        String posicion;
        if (precio.compareTo(avg.multiply(BigDecimal.valueOf(0.9))) < 0) {
            posicion = "BAJO";
        } else if (precio.compareTo(avg.multiply(BigDecimal.valueOf(1.1))) > 0) {
            posicion = "ALTO";
        } else {
            posicion = "PROMEDIO";
        }
        return new AnaliticaPropiedadDTO.PrecioZona(
                precio,
                avg.setScale(2, RoundingMode.HALF_UP),
                min != null ? min.setScale(2, RoundingMode.HALF_UP) : null,
                max != null ? max.setScale(2, RoundingMode.HALF_UP) : null,
                cantidad, posicion);
    }

    private List<String> sugerencias(Propiedad p,
                                     AnaliticaPropiedadDTO.PrecioZona precioVsZona,
                                     long vistas30, long favoritos,
                                     boolean alertaSinReservas, Long diasUltimaReserva) {
        List<String> s = new ArrayList<>();

        long fotos = imagenRepository.findByPropiedadIdOrderByOrdenAsc(p.getId()).size();
        if (fotos < 3) {
            s.add("Agrega más fotos: los avisos con 3 o más imágenes reciben mucho más interés.");
        }
        if (p.getVideoUrl() == null || p.getVideoUrl().isBlank()) {
            s.add("Sube un video del espacio para destacar entre los demás avisos.");
        }
        String desc = p.getDescripcion();
        if (desc == null || desc.trim().length() < 120) {
            s.add("Amplía la descripción: menciona cercanía al campus, servicios incluidos y reglas.");
        }
        if (precioVsZona != null && "ALTO".equals(precioVsZona.posicion())) {
            s.add("Tu precio está por encima del promedio de la zona; considera ajustarlo para competir.");
        }
        if (vistas30 >= 20 && favoritos == 0) {
            s.add("Recibes visitas pero nadie guarda el aviso: revisa las fotos de portada y el precio.");
        }
        if (alertaSinReservas) {
            s.add(diasUltimaReserva != null
                    ? "Llevas " + diasUltimaReserva + " días sin reservas: prueba una rebaja temporal o mejora las fotos."
                    : "Aún no recibes reservas: una rebaja o mejores fotos pueden ayudarte a arrancar.");
        }
        return s;
    }

    private static LocalDate aLocalDate(Object o) {
        if (o == null) return null;
        if (o instanceof LocalDate ld) return ld;
        if (o instanceof java.sql.Date d) return d.toLocalDate();
        try {
            return LocalDate.parse(o.toString());
        } catch (Exception e) {
            return null;
        }
    }

    private static BigDecimal aBigDecimal(Object o) {
        if (o == null) return null;
        if (o instanceof BigDecimal b) return b;
        if (o instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return null;
    }
}
