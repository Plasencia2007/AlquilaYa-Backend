package com.alquilaya.servicio_catalogos.dto;

import com.alquilaya.servicio_catalogos.enums.TipoLimite;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Zona de cobertura embebida dentro de {@link UniversidadRequest}. La coherencia entre
 * {@code tipoLimite} y su geometría (radio para CIRCULO, JSON para POLIGONO) la valida
 * {@code UniversidadService} al persistir.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZonaCoberturaRequest {

    @NotBlank(message = "El nombre de la zona es obligatorio")
    @Size(min = 2, max = 150, message = "El nombre debe tener entre 2 y 150 caracteres")
    private String nombre;

    @Size(max = 500, message = "La descripción no puede superar 500 caracteres")
    private String descripcion;

    @Size(max = 30, message = "El color no puede superar 30 caracteres")
    private String color;

    private Boolean activo;

    private Integer ordenPrioridad;

    private TipoLimite tipoLimite;

    @DecimalMin(value = "-90.0", message = "La latitud debe estar entre -90 y 90")
    @DecimalMax(value = "90.0", message = "La latitud debe estar entre -90 y 90")
    private Double latitud;

    @DecimalMin(value = "-180.0", message = "La longitud debe estar entre -180 y 180")
    @DecimalMax(value = "180.0", message = "La longitud debe estar entre -180 y 180")
    private Double longitud;

    private Double radioKm;

    private String poligonoJson;

    // --- Tarifas (comisión al arrendador por venta en esta zona). Nullable = sin comisión. ---
    @DecimalMin(value = "0.0", message = "La comisión porcentual no puede ser negativa")
    @DecimalMax(value = "100.0", message = "La comisión porcentual no puede superar 100")
    private Double comisionPorcentaje;

    @DecimalMin(value = "0.0", message = "La comisión fija no puede ser negativa")
    private java.math.BigDecimal comisionMonto;
}
