package com.alquilaya.servicio_catalogos.dto;

import com.alquilaya.servicio_catalogos.enums.TipoLimite;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Vista INTERNA y plana de una zona de cobertura ACTIVA (de una universidad activa), con su
 * geometría Y la comisión de plataforma, que consume servicio-propiedades (vía el endpoint interno
 * protegido por cabecera) para resolver en qué zona cae una propiedad al publicarla y calcular la
 * comisión de cada venta. Incluye el nombre de la universidad para mostrarlo sin un segundo viaje.
 *
 * <p>Para el consumo PÚBLICO/anónimo existe {@link ZonaPublicaResponse}, que omite la comisión.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZonaResolucionResponse {

    private Long id;
    private Long universidadId;
    private String universidadNombre;
    private String nombre;
    private String descripcion;
    private String color;
    private Integer ordenPrioridad;
    private TipoLimite tipoLimite;
    private Double latitud;
    private Double longitud;
    private Double radioKm;
    private String poligonoJson;

    // --- Comisión de plataforma para cuartos vendidos en esta zona (se ingresa en el admin).
    //     Ambas nullable: si están vacías, no se cobra comisión en la zona. ---
    /** Porcentaje sobre el precio del cuarto (ej. 8.5 = 8.5%). */
    private Double comisionPorcentaje;
    /** Monto fijo por venta en soles (tiene prioridad sobre el porcentaje si está presente). */
    private java.math.BigDecimal comisionMonto;
}
