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
}
