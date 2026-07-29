package com.alquilaya.serviciousuarios.clients;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Ítem 354: espejo LOCAL —deliberadamente mínimo— de {@code servicio-propiedades}
 * {@code PropiedadAdminDTO}, devuelto por
 * {@link PropiedadesAdminClient#listarPendientes()}. El dashboard de métricas agregadas solo
 * necesita el CONTEO de propiedades pendientes (ver
 * {@code AdminMetricasAgregadoService#obtenerMetricasAgregadas}), así que basta con {@code id}
 * para poder hacer {@code .size()} sobre la lista; el resto de campos que manda
 * servicio-propiedades (título, precio, arrendador, etc.) se ignoran en la deserialización
 * (Jackson no falla con propiedades desconocidas, configuración por defecto de Spring Boot).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PropiedadPendienteDTO {
    private Long id;
}
