package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.dto.ReputacionResumen;
import com.alquilaya.serviciousuarios.entities.Arrendador;
import com.alquilaya.serviciousuarios.entities.Estudiante;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.EstadoUsuario;
import com.alquilaya.serviciousuarios.enums.NivelReputacion;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Motor del score agregado de reputación (#26). Combina varias señales en un único
 * número 0–100 + nivel. El cálculo es puro (sin estado): se invoca al exponer el perfil,
 * así el score siempre refleja las señales actuales sin necesidad de recalcular en cada
 * mutación.
 *
 * <h3>Pesos (Fase 1)</h3>
 * <b>Arrendador (100):</b> reseñas 55 · verificaciones 30 · antigüedad 15.<br>
 * <b>Estudiante (100):</b> verificaciones 60 · antigüedad 40 (no recibe reseñas).<br>
 * En Fase 2 se incorpora la señal de <i>actividad</i> (reservas completadas, % cancelaciones,
 * tiempo de respuesta) y se rebalancean los pesos.
 */
@Service
public class ReputacionService {

    // --- Promedio bayesiano de reseñas: evita el "5.0 con 1 reseña" ---
    /** Media a priori (nota "neutral" hacia la que tira con pocas reseñas). */
    private static final double PRIOR_MEDIA = 4.0;
    /** Peso de la media a priori (≈ nº de reseñas "fantasma"). */
    private static final double PRIOR_PESO = 5.0;

    /** Meses para alcanzar el máximo de antigüedad. */
    private static final double MESES_ANTIGUEDAD_TOPE = 12.0;

    // --- Tasa de cumplimiento (actividad): bayesiana para no castigar a quien tiene poco historial ---
    private static final double ACTIV_PRIOR_RATE = 0.7;
    private static final double ACTIV_PRIOR_PESO = 3.0;

    // Pesos arrendador (suman 100)
    private static final int W_ARR_RESENAS = 40;
    private static final int W_ARR_VERIF = 25;
    private static final int W_ARR_ANTIG = 10;
    private static final int W_ARR_ACTIV = 25;

    // Pesos estudiante (suman 100) — no recibe reseñas, la actividad ("buen inquilino") pesa más
    private static final int W_EST_VERIF = 40;
    private static final int W_EST_ANTIG = 20;
    private static final int W_EST_ACTIV = 40;

    public ReputacionResumen calcularArrendador(Arrendador a) {
        if (a == null) return new ReputacionResumen(0, NivelReputacion.BRONCE);
        Usuario u = a.getUsuario();

        double reviews = puntajeResenas(a.getCalificacion(), a.getNumResenas()) * W_ARR_RESENAS;
        double verif = puntajeVerificacionArrendador(u) * W_ARR_VERIF;
        double antig = puntajeAntiguedad(u) * W_ARR_ANTIG;
        double activ = puntajeActividad(a.getReservasCompletadas(), a.getReservasFallidas()) * W_ARR_ACTIV;

        return armar(reviews + verif + antig + activ);
    }

    public ReputacionResumen calcularEstudiante(Estudiante e) {
        if (e == null) return new ReputacionResumen(0, NivelReputacion.BRONCE);
        Usuario u = e.getUsuario();

        double verif = puntajeVerificacionEstudiante(u, e.isVerificado()) * W_EST_VERIF;
        double antig = puntajeAntiguedad(u) * W_EST_ANTIG;
        double activ = puntajeActividad(e.getReservasCompletadas(), e.getReservasFallidas()) * W_EST_ACTIV;

        return armar(verif + antig + activ);
    }

    // ===== Señales (cada una devuelve una fracción 0..1) =====

    /** Promedio bayesiano normalizado a 0..1. */
    private double puntajeResenas(Double calificacion, Integer numResenas) {
        double avg = calificacion != null ? calificacion : PRIOR_MEDIA;
        int n = numResenas != null ? Math.max(0, numResenas) : 0;
        double bayes = (PRIOR_PESO * PRIOR_MEDIA + avg * n) / (PRIOR_PESO + n);
        return clamp01(bayes / 5.0);
    }

    /** Email 8 + teléfono 8 + cuenta activa/identidad 14 (de 30) → 0..1. */
    private double puntajeVerificacionArrendador(Usuario u) {
        if (u == null) return 0;
        double pts = 0;
        if (u.isEmailVerificado()) pts += 8;
        if (u.isTelefonoVerificado()) pts += 8;
        if (u.getEstado() == EstadoUsuario.ACTIVE) pts += 14;
        return pts / 30.0;
    }

    /** Email 15 + teléfono 15 + identidad 30 (de 60) → 0..1. */
    private double puntajeVerificacionEstudiante(Usuario u, boolean identidadVerificada) {
        double pts = 0;
        if (u != null && u.isEmailVerificado()) pts += 15;
        if (u != null && u.isTelefonoVerificado()) pts += 15;
        if (identidadVerificada) pts += 30;
        return pts / 60.0;
    }

    /** Tasa de cumplimiento bayesiana: completadas / (completadas + fallidas), suavizada → 0..1. */
    private double puntajeActividad(Integer completadas, Integer fallidas) {
        int c = completadas != null ? Math.max(0, completadas) : 0;
        int f = fallidas != null ? Math.max(0, fallidas) : 0;
        double rate = (ACTIV_PRIOR_PESO * ACTIV_PRIOR_RATE + c) / (ACTIV_PRIOR_PESO + c + f);
        return clamp01(rate);
    }

    /** Antigüedad lineal hasta {@link #MESES_ANTIGUEDAD_TOPE} → 0..1. */
    private double puntajeAntiguedad(Usuario u) {
        if (u == null || u.getFechaCreacion() == null) return 0;
        long meses = ChronoUnit.MONTHS.between(u.getFechaCreacion(), LocalDateTime.now());
        return clamp01(meses / MESES_ANTIGUEDAD_TOPE);
    }

    private ReputacionResumen armar(double total) {
        int score = (int) Math.round(clamp(total, 0, 100));
        return new ReputacionResumen(score, NivelReputacion.fromScore(score));
    }

    private static double clamp01(double v) {
        return clamp(v, 0.0, 1.0);
    }

    private static double clamp(double v, double min, double max) {
        return Math.max(min, Math.min(max, v));
    }
}
