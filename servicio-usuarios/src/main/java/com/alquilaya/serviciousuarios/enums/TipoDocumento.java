package com.alquilaya.serviciousuarios.enums;

import java.util.Arrays;
import java.util.List;

/**
 * Tipos de documento de verificación. Los marcados como {@code requerido}
 * son los que el estudiante debe tener APROBADOS para quedar verificado
 * (fuente única: la consumen el endpoint /tipos-requeridos y el recálculo
 * de verificación en DocumentoService).
 */
public enum TipoDocumento {
    DNI_FRONTAL("DNI Parte Frontal", "Foto del frente de tu DNI", true),
    DNI_REVERSO("DNI Parte Posterior", "Foto del reverso de tu DNI", true),
    CARNE_ESTUDIANTE("Carné de Estudiante", "Foto de tu carné universitario", false),
    RECIBO_LUZ("Recibo de Luz", "Recibo de servicios para validar domicilio", false);

    private final String titulo;
    private final String descripcion;
    private final boolean requerido;

    TipoDocumento(String titulo, String descripcion, boolean requerido) {
        this.titulo = titulo;
        this.descripcion = descripcion;
        this.requerido = requerido;
    }

    public String getTitulo() {
        return titulo;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public boolean isRequerido() {
        return requerido;
    }

    public static List<TipoDocumento> requeridos() {
        return Arrays.stream(values()).filter(TipoDocumento::isRequerido).toList();
    }
}
