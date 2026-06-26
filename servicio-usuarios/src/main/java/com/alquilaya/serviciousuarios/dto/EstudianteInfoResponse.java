package com.alquilaya.serviciousuarios.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EstudianteInfoResponse {
    private Long id;
    private Long usuarioId;
    private String nombre;
    private String apellido;
    private String correo;
    private String telefono;
    private String fotoUrl;
    private java.time.LocalDate fechaNacimiento;
    private String universidad;
    private String codigoEstudiante;
    private String carrera;
    private Integer ciclo;
    /** true si todos los documentos requeridos del estudiante están APROBADOS. */
    private boolean verificado;

    // ===== Score agregado de reputación (#26) =====
    /** Score agregado 0–100. */
    private Integer score;
    /** Nivel derivado del score: BRONCE / PLATA / ORO / PLATINO. */
    private String nivelReputacion;
}
