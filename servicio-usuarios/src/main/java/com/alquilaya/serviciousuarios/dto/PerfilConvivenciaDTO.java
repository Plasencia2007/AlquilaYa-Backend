package com.alquilaya.serviciousuarios.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.Set;

/**
 * Tarjeta de roommate (#38 Fase 0): perfil de convivencia + señales de confianza
 * (verificación + reputación #26 + % de completitud).
 */
@Data
@Builder
public class PerfilConvivenciaDTO {
    private Long estudianteId;
    private Long usuarioId;

    // Identidad + confianza
    private String nombre;
    private String apellido;
    private String avatar;
    private String universidad;
    private String carrera;
    private Integer ciclo;
    private boolean verificado;
    private Integer score;            // reputación #26
    private String nivelReputacion;   // BRONCE/PLATA/ORO/PLATINO
    private int completitud;          // % del perfil de convivencia completado

    // Sobre mí
    private String bio;
    private String instagram;

    // Hábitos
    private String fuma;
    private String horario;
    private String orden;
    private String ruido;
    private String sociabilidad;
    private String mascotas;
    private String invitados;

    // Preferencias
    private String genero;
    private String comparteCon;
    private Integer presupuestoMin;
    private Integer presupuestoMax;
    private LocalDate fechaMudanza;
    private Integer numCompaneros;
    private boolean buscaCompaneros;

    private Set<String> intereses;
    private Set<String> zonasPreferidas;
}
