package com.alquilaya.servicio_catalogos.dto;

import com.alquilaya.servicio_catalogos.enums.TipoLimite;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Vista PÚBLICA de una zona de cobertura ACTIVA (de una universidad activa), con su geometría.
 * La consume cualquier visitante anónimo (búsqueda pública, mapa, calculadora de ingresos) para
 * ubicar/filtrar propiedades por zona.
 *
 * <p>A diferencia de {@link ZonaResolucionResponse} (vista interna), NO expone la comisión de
 * plataforma ({@code comisionPorcentaje}/{@code comisionMonto}): esa configuración de negocio solo
 * viaja por el endpoint interno hacia servicio-propiedades y por el panel admin.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZonaPublicaResponse {

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
}
