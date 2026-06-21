package com.alquilaya.serviciopagos.services;

import com.alquilaya.serviciopagos.dto.ResumenFinancieroDTO;
import com.alquilaya.serviciopagos.entities.Pago;
import com.alquilaya.serviciopagos.repositories.PagoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Calcula el resumen financiero de plataforma (ingreso por comisiones, monto cobrado y pagado a
 * arrendadores) sobre los pagos PAGADOS. Para volúmenes moderados se agrega en memoria; si crece,
 * conviene mover a una consulta agregada en BD.
 */
@Service
@RequiredArgsConstructor
public class ResumenFinancieroService {

    private static final DateTimeFormatter MES = DateTimeFormatter.ofPattern("yyyy-MM");

    private final PagoRepository pagoRepository;

    @Transactional(readOnly = true)
    public ResumenFinancieroDTO calcular() {
        List<Pago> pagados = pagoRepository.findByEstado("PAGADO");

        BigDecimal totalCobrado = BigDecimal.ZERO;
        BigDecimal totalComision = BigDecimal.ZERO;
        BigDecimal totalArrendador = BigDecimal.ZERO;
        Map<String, ResumenFinancieroDTO.FilaMes> porMes = new LinkedHashMap<>();

        for (Pago p : pagados) {
            BigDecimal monto = nz(p.getMonto());
            BigDecimal comision = nz(p.getComision());
            // Compat con pagos previos a la feature de comisión: si no hay desglose, el arrendador
            // recibió el monto íntegro.
            BigDecimal arrendador = p.getMontoArrendador() != null
                    ? p.getMontoArrendador()
                    : monto.subtract(comision);

            totalCobrado = totalCobrado.add(monto);
            totalComision = totalComision.add(comision);
            totalArrendador = totalArrendador.add(arrendador);

            String mes = (p.getFechaPago() != null ? p.getFechaPago() : p.getFechaCreacion()) != null
                    ? (p.getFechaPago() != null ? p.getFechaPago() : p.getFechaCreacion()).format(MES)
                    : "sin-fecha";
            ResumenFinancieroDTO.FilaMes fila = porMes.computeIfAbsent(mes, m ->
                    ResumenFinancieroDTO.FilaMes.builder()
                            .mes(m)
                            .cobrado(BigDecimal.ZERO)
                            .comision(BigDecimal.ZERO)
                            .arrendador(BigDecimal.ZERO)
                            .numPagos(0)
                            .build());
            fila.setCobrado(fila.getCobrado().add(monto));
            fila.setComision(fila.getComision().add(comision));
            fila.setArrendador(fila.getArrendador().add(arrendador));
            fila.setNumPagos(fila.getNumPagos() + 1);
        }

        List<ResumenFinancieroDTO.FilaMes> filas = new ArrayList<>(porMes.values());
        filas.sort(Comparator.comparing(ResumenFinancieroDTO.FilaMes::getMes));

        return ResumenFinancieroDTO.builder()
                .totalCobrado(totalCobrado)
                .totalComision(totalComision)
                .totalArrendador(totalArrendador)
                .numPagos(pagados.size())
                .porMes(filas)
                .build();
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
