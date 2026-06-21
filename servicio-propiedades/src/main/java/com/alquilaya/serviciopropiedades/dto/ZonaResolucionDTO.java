package com.alquilaya.serviciopropiedades.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Zona de cobertura activa recibida de servicio-catalogos (con su geometría) para resolver
 * en qué zona cae una propiedad al publicarla. {@code tipoLimite} viaja como String
 * ("CIRCULO" | "POLIGONO") para no acoplar un enum entre servicios.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZonaResolucionDTO {

    private Long id;
    private Long universidadId;
    private String universidadNombre;
    private String nombre;
    private Integer ordenPrioridad;
    private String tipoLimite;
    private Double latitud;
    private Double longitud;
    private Double radioKm;
    private String poligonoJson;

    // --- Comisión de plataforma para cuartos vendidos en esta zona. Ambas nullable. ---
    /** Porcentaje sobre el precio del cuarto (ej. 8.5 = 8.5%). */
    private Double comisionPorcentaje;
    /** Monto fijo por venta en soles (tiene prioridad sobre el porcentaje si está presente). */
    private java.math.BigDecimal comisionMonto;
}
