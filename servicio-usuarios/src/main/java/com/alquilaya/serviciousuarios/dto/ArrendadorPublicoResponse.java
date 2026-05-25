package com.alquilaya.serviciousuarios.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Versión PÚBLICA (sin PII) de {@link ArrendadorInfoResponse}.
 * Se devuelve a callers anónimos (visitantes sin login) para enriquecer
 * cards de propiedades en el listado público.
 *
 * Excluye intencionalmente: correo, telefono.
 */
@Data
@Builder
public class ArrendadorPublicoResponse {
    private Long id;
    private Long usuarioId;
    private String nombre;
    private String apellido;
    private String nombreComercial;
    private Double calificacion;
    private String avatar;
    private Boolean verificado;
    private Integer tiempoRespuestaPromedio;
}
