package com.alquilaya.servicio_catalogos.dto;

import com.alquilaya.servicio_catalogos.entities.Universidad;
import com.alquilaya.servicio_catalogos.entities.ZonaCobertura;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UniversidadResponse {

    private Long id;
    private String nombre;
    private String descripcion;
    private String color;
    private Double latitud;
    private Double longitud;
    private Boolean activo;
    private Boolean esPrincipal;
    private LocalDateTime fechaCreacion;
    private List<ZonaCoberturaResponse> zonas;

    public static UniversidadResponse from(Universidad u, List<ZonaCobertura> zonas) {
        List<ZonaCoberturaResponse> zonasResp = (zonas == null ? Collections.<ZonaCobertura>emptyList() : zonas)
                .stream()
                .map(ZonaCoberturaResponse::from)
                .toList();
        return UniversidadResponse.builder()
                .id(u.getId())
                .nombre(u.getNombre())
                .descripcion(u.getDescripcion())
                .color(u.getColor())
                .latitud(u.getLatitud())
                .longitud(u.getLongitud())
                .activo(u.getActivo())
                .esPrincipal(u.getEsPrincipal())
                .fechaCreacion(u.getFechaCreacion())
                .zonas(zonasResp)
                .build();
    }
}
