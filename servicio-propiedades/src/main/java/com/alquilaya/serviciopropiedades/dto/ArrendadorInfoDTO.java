package com.alquilaya.serviciopropiedades.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ArrendadorInfoDTO {
    private Long id;
    private Long usuarioId;
    private String nombre;
    private String apellido;
    private String correo;
    private String telefono;
    private String nombreComercial;
    private Double calificacion;

    // ===== Campos premium (card rediseño) =====
    /** URL de la foto de perfil del arrendador. */
    private String avatar;
    /** Verificado = usuario en estado ACTIVE (telefono validado + admin OK). */
    private Boolean verificado;
    /** Tiempo de respuesta promedio (minutos). Nullable mientras no haya métrica. */
    private Integer tiempoRespuestaPromedio;

    // ===== Score agregado de reputación (#26) =====
    private Integer numResenas;
    private Integer score;
    private String nivelReputacion;
}
