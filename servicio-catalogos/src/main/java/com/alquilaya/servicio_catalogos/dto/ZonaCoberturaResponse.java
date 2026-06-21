package com.alquilaya.servicio_catalogos.dto;

import com.alquilaya.servicio_catalogos.entities.ZonaCobertura;
import com.alquilaya.servicio_catalogos.enums.TipoLimite;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZonaCoberturaResponse {

    private Long id;
    private Long universidadId;
    private String nombre;
    private String descripcion;
    private String color;
    private Boolean activo;
    private Integer ordenPrioridad;
    private TipoLimite tipoLimite;
    private Double latitud;
    private Double longitud;
    private Double radioKm;
    private String poligonoJson;
    private Double comisionPorcentaje;
    private java.math.BigDecimal comisionMonto;
    private LocalDateTime fechaCreacion;

    public static ZonaCoberturaResponse from(ZonaCobertura z) {
        return ZonaCoberturaResponse.builder()
                .id(z.getId())
                .universidadId(z.getUniversidadId())
                .nombre(z.getNombre())
                .descripcion(z.getDescripcion())
                .color(z.getColor())
                .activo(z.getActivo())
                .ordenPrioridad(z.getOrdenPrioridad())
                .tipoLimite(z.getTipoLimite())
                .latitud(z.getLatitud())
                .longitud(z.getLongitud())
                .radioKm(z.getRadioKm())
                .poligonoJson(z.getPoligonoJson())
                .comisionPorcentaje(z.getComisionPorcentaje())
                .comisionMonto(z.getComisionMonto())
                .fechaCreacion(z.getFechaCreacion())
                .build();
    }
}
