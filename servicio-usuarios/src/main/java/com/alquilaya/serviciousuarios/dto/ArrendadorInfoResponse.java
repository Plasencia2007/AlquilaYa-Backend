package com.alquilaya.serviciousuarios.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ArrendadorInfoResponse {
    private Long id;
    private Long usuarioId;
    private String nombre;
    private String apellido;
    private String correo;
    private String telefono;
    private String nombreComercial;
    private Double calificacion;

    // ===== Campos premium (card rediseño) =====
    /** URL de la foto de perfil del arrendador (Usuario.fotoUrl). */
    private String avatar;
    /** Verificado = Usuario.estado == ACTIVE. */
    private Boolean verificado;
    /** Tiempo de respuesta promedio en minutos. Nullable mientras no haya métrica. */
    private Integer tiempoRespuestaPromedio;

    // ===== Score agregado de reputación (#26) =====
    /** Nº de reseñas recibidas (contexto del promedio bayesiano). */
    private Integer numResenas;
    /** Score agregado 0–100. */
    private Integer score;
    /** Nivel derivado del score: BRONCE / PLATA / ORO / PLATINO. */
    private String nivelReputacion;
}
