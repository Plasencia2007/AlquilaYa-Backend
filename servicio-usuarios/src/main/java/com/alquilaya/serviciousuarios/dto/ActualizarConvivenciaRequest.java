package com.alquilaya.serviciousuarios.dto;

import lombok.Data;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

/** Edición del perfil de convivencia del propio estudiante (#38 Fase 0). */
@Data
public class ActualizarConvivenciaRequest {
    private String bio;
    private String instagram;

    private String fuma;
    private String horario;
    private String orden;
    private String ruido;
    private String sociabilidad;
    private String mascotas;
    private String invitados;

    private String genero;
    private String comparteCon;
    private Integer presupuestoMin;
    private Integer presupuestoMax;
    private LocalDate fechaMudanza;
    private Integer numCompaneros;
    private Boolean buscaCompaneros;

    private Set<String> intereses = new HashSet<>();
    private Set<String> zonasPreferidas = new HashSet<>();
}
