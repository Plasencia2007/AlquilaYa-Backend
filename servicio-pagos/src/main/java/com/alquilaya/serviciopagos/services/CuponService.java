package com.alquilaya.serviciopagos.services;

import com.alquilaya.serviciopagos.dto.CrearCuponRequest;
import com.alquilaya.serviciopagos.entities.Cupon;
import com.alquilaya.serviciopagos.repositories.CuponRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Ítem 292: cupones de descuento. Ver {@link #validarYCalcular} para el diseño de por qué un
 * cupón solo puede descontar la comisión de plataforma, nunca el monto del arrendador.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CuponService {

    private static final List<String> TIPOS_VALIDOS = List.of("PORCENTAJE", "MONTO_FIJO", "COMISION_GRATIS");

    private final CuponRepository cuponRepository;

    /** Resultado de aplicar un cupón: cuánto se descuenta y en cuánto queda la comisión final. */
    public record ResultadoDescuento(Cupon cupon, BigDecimal montoDescuento, BigDecimal comisionFinal) {
    }

    /**
     * Valida un código de cupón contra una reserva concreta y calcula su descuento sobre
     * {@code comisionOriginal}.
     *
     * <p><b>Diseño deliberado:</b> un cupón SOLO puede descontar la comisión de plataforma —
     * jamás {@code montoArrendador}, que es lo que el arrendador ya tiene pactado recibir. El
     * descuento calculado siempre se acota a {@code [0, comisionOriginal]} antes de devolverlo,
     * así que ni un cupón mal configurado (100000% de descuento, por ejemplo) puede hacer que la
     * comisión final termine siendo negativa o que el cálculo "invada" el monto del arrendador.
     * En el peor caso, la comisión final es exactamente 0 (equivalente a COMISION_GRATIS).
     */
    @Transactional(readOnly = true)
    public ResultadoDescuento validarYCalcular(String codigo, BigDecimal montoArrendador, BigDecimal comisionOriginal) {
        if (codigo == null || codigo.isBlank()) {
            throw new IllegalArgumentException("Código de cupón vacío");
        }
        Cupon cupon = cuponRepository.findByCodigoIgnoreCase(codigo.trim())
                .orElseThrow(() -> new IllegalArgumentException("El cupón \"" + codigo + "\" no existe"));

        if (!Boolean.TRUE.equals(cupon.getActivo())) {
            throw new IllegalStateException("Este cupón ya no está activo");
        }
        LocalDateTime ahora = LocalDateTime.now();
        if (ahora.isBefore(cupon.getFechaInicio()) || ahora.isAfter(cupon.getFechaFin())) {
            throw new IllegalStateException("Este cupón no está vigente");
        }
        if (cupon.getUsosMaximos() != null
                && cupon.getUsosActuales() != null
                && cupon.getUsosActuales() >= cupon.getUsosMaximos()) {
            throw new IllegalStateException("Este cupón ya alcanzó su límite de usos");
        }
        BigDecimal comisionSegura = comisionOriginal != null ? comisionOriginal : BigDecimal.ZERO;
        BigDecimal montoCobradoOriginal = montoArrendador.add(comisionSegura);
        if (cupon.getMontoMinimo() != null && montoCobradoOriginal.compareTo(cupon.getMontoMinimo()) < 0) {
            throw new IllegalStateException(
                    "Este cupón requiere un monto mínimo de S/ " + cupon.getMontoMinimo().toPlainString());
        }

        BigDecimal descuento = switch (cupon.getTipoDescuento()) {
            case "COMISION_GRATIS" -> comisionSegura;
            case "PORCENTAJE" -> {
                BigDecimal valor = cupon.getValor() != null ? cupon.getValor() : BigDecimal.ZERO;
                yield comisionSegura.multiply(valor).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            }
            case "MONTO_FIJO" -> cupon.getValor() != null ? cupon.getValor() : BigDecimal.ZERO;
            default -> throw new IllegalStateException("Tipo de cupón desconocido: " + cupon.getTipoDescuento());
        };

        // Nunca negativo, nunca mayor que la comisión original — ver el javadoc de este método.
        descuento = descuento.max(BigDecimal.ZERO).min(comisionSegura).setScale(2, RoundingMode.HALF_UP);
        BigDecimal comisionFinal = comisionSegura.subtract(descuento).setScale(2, RoundingMode.HALF_UP);

        return new ResultadoDescuento(cupon, descuento, comisionFinal);
    }

    /**
     * Incrementa el contador de usos de un cupón. Se llama SOLO cuando un pago que usó este
     * cupón queda confirmado como PAGADO (no al crear la preferencia) — así "uso" significa
     * "redención efectiva", no "intento". Best-effort: si falla, se loguea y no interrumpe nada
     * (el caller ya confirmó el pago antes de llamar esto).
     */
    @Transactional
    public void incrementarUso(Long cuponId) {
        cuponRepository.findById(cuponId).ifPresent(c -> {
            c.setUsosActuales((c.getUsosActuales() == null ? 0 : c.getUsosActuales()) + 1);
            cuponRepository.save(c);
        });
    }

    @Transactional
    public Cupon crear(CrearCuponRequest req) {
        if (req.codigo() == null || req.codigo().isBlank()) {
            throw new IllegalArgumentException("El código es obligatorio");
        }
        if (cuponRepository.findByCodigoIgnoreCase(req.codigo().trim()).isPresent()) {
            throw new IllegalStateException("Ya existe un cupón con el código \"" + req.codigo() + "\"");
        }
        if (req.tipoDescuento() == null || !TIPOS_VALIDOS.contains(req.tipoDescuento())) {
            throw new IllegalArgumentException("tipoDescuento inválido: " + req.tipoDescuento());
        }
        if (!"COMISION_GRATIS".equals(req.tipoDescuento()) && (req.valor() == null || req.valor().signum() <= 0)) {
            throw new IllegalArgumentException("valor es obligatorio y debe ser positivo para " + req.tipoDescuento());
        }
        if ("PORCENTAJE".equals(req.tipoDescuento()) && req.valor().compareTo(new BigDecimal("100")) > 0) {
            throw new IllegalArgumentException("El porcentaje no puede ser mayor a 100");
        }
        if (req.fechaInicio() == null || req.fechaFin() == null || !req.fechaFin().isAfter(req.fechaInicio())) {
            throw new IllegalArgumentException("fechaFin debe ser posterior a fechaInicio");
        }
        if (req.usosMaximos() != null && req.usosMaximos() <= 0) {
            throw new IllegalArgumentException("usosMaximos debe ser positivo si se especifica");
        }

        Cupon cupon = Cupon.builder()
                .codigo(req.codigo().trim().toUpperCase())
                .tipoDescuento(req.tipoDescuento())
                .valor(req.valor())
                .fechaInicio(req.fechaInicio())
                .fechaFin(req.fechaFin())
                .usosMaximos(req.usosMaximos())
                .montoMinimo(req.montoMinimo())
                .activo(true)
                .build();
        Cupon guardado = cuponRepository.save(cupon);
        log.info("Cupón creado: {} ({})", guardado.getCodigo(), guardado.getTipoDescuento());
        return guardado;
    }

    @Transactional(readOnly = true)
    public List<Cupon> listar() {
        return cuponRepository.findAllByOrderByFechaCreacionDesc();
    }
}
