package com.alquilaya.serviciopagos.services;

import com.alquilaya.serviciopagos.entities.Desembolso;
import com.alquilaya.serviciopagos.entities.Pago;
import com.alquilaya.serviciopagos.repositories.DesembolsoRepository;
import com.alquilaya.serviciopagos.repositories.PagoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * G1: payout al arrendador. Hoy el arrendador nunca cobraba — {@code montoArrendador} se
 * calculaba pero no se desembolsaba nunca a nadie.
 *
 * <p><b>V1 admin-mediado, NO automatizado con MercadoPago:</b> este servicio lleva el LIBRO
 * de lo que se le debe a cada arrendador (agregando pagos PAGADO no cubiertos aún) y el flujo
 * para que un admin genere el desembolso, haga la transferencia por el medio que use hoy la
 * operación (banco, Yape/Plin, etc.) y lo marque procesado con la referencia. Deliberadamente
 * NO se integra la API de Marketplace/Payouts de MercadoPago: eso requiere que cada arrendador
 * conecte su propia cuenta MP vía OAuth (onboarding que no existe) y mueve dinero real — no es
 * algo para automatizar sin que el dueño del negocio lo autorice y pruebe con sus credenciales
 * reales. Este v1 es honesto, seguro y ya resuelve el problema real: visibilidad + trazabilidad
 * de lo que se debe, en vez de que el arrendador simplemente nunca cobre y nadie lo note.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DesembolsoService {

    private final PagoRepository pagoRepository;
    private final DesembolsoRepository desembolsoRepository;

    /** Saldo pendiente de TODOS los arrendadores con algo por cobrar (para el panel admin). */
    @Transactional(readOnly = true)
    public Map<Long, BigDecimal> resumenPendiente() {
        return pagoRepository.resumenPendientePorArrendador().stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],
                        row -> (BigDecimal) row[1]));
    }

    /**
     * Genera (crea) el desembolso PENDIENTE de un arrendador por su saldo actual, y marca los
     * pagos incluidos para que no se cuenten dos veces en un futuro desembolso.
     */
    @Transactional
    public Desembolso generar(Long arrendadorId) {
        List<Pago> pendientes = pagoRepository.findByArrendadorIdAndEstadoAndDesembolsoIdIsNull(arrendadorId, "PAGADO");
        if (pendientes.isEmpty()) {
            throw new IllegalStateException("El arrendador " + arrendadorId + " no tiene saldo pendiente de desembolso");
        }
        BigDecimal total = pendientes.stream()
                .map(Pago::getMontoArrendador)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (total.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("El saldo pendiente del arrendador " + arrendadorId + " es cero");
        }

        Desembolso desembolso = desembolsoRepository.save(Desembolso.builder()
                .arrendadorId(arrendadorId)
                .montoTotal(total)
                .estado("PENDIENTE")
                .build());

        pagoRepository.marcarCubiertosPorDesembolso(
                pendientes.stream().map(Pago::getId).toList(), desembolso.getId());

        log.info("💰 [Desembolso] Generado #{} para arrendador {} por S/ {} ({} pagos)",
                desembolso.getId(), arrendadorId, total, pendientes.size());
        return desembolso;
    }

    /** El admin confirma que ya hizo la transferencia (fuera de esta app) y anota la referencia. */
    @Transactional
    public Desembolso marcarProcesado(Long desembolsoId, String metodoPago, String referencia, Long adminUserId) {
        Desembolso d = obtener(desembolsoId);
        if ("PROCESADO".equals(d.getEstado())) {
            return d; // idempotente
        }
        if (!"PENDIENTE".equals(d.getEstado())) {
            throw new IllegalStateException("Sólo un desembolso PENDIENTE puede marcarse procesado (estado actual: " + d.getEstado() + ")");
        }
        d.setEstado("PROCESADO");
        d.setMetodoPago(metodoPago);
        d.setReferencia(referencia);
        d.setProcesadoPor(adminUserId);
        d.setFechaProcesado(LocalDateTime.now());
        log.info("✅ [Desembolso] #{} marcado PROCESADO por admin {} (S/ {})", desembolsoId, adminUserId, d.getMontoTotal());
        return desembolsoRepository.save(d);
    }

    /** El intento de pago falló (cuenta bancaria mala, etc.) — libera los pagos para reintentar. */
    @Transactional
    public Desembolso marcarFallido(Long desembolsoId, String motivo) {
        Desembolso d = obtener(desembolsoId);
        if ("FALLIDO".equals(d.getEstado())) {
            return d; // idempotente
        }
        if (!"PENDIENTE".equals(d.getEstado())) {
            throw new IllegalStateException("Sólo un desembolso PENDIENTE puede marcarse fallido (estado actual: " + d.getEstado() + ")");
        }
        d.setEstado("FALLIDO");
        d.setMotivoFallo(motivo);
        // Libera los pagos cubiertos: vuelven a aparecer como saldo pendiente para un próximo intento.
        pagoRepository.liberarDesembolso(desembolsoId);
        log.warn("⚠️ [Desembolso] #{} marcado FALLIDO ({}): pagos liberados para reintentar", desembolsoId, motivo);
        return desembolsoRepository.save(d);
    }

    @Transactional(readOnly = true)
    public List<Desembolso> historialDelArrendador(Long arrendadorId) {
        return desembolsoRepository.findByArrendadorIdOrderByFechaCreacionDesc(arrendadorId);
    }

    @Transactional(readOnly = true)
    public Desembolso obtener(Long id) {
        return desembolsoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Desembolso no encontrado: " + id));
    }
}
