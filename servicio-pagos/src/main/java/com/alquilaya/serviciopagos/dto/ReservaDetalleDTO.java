package com.alquilaya.serviciopagos.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ReservaDetalleDTO {
    private Long id;
    private Long estudianteId;
    private Long propiedadId;
    private String propiedadTitulo;
    private String estudianteNombre;
    private String estudianteCorreo;
    private BigDecimal montoTotal;
    /** Comisión de plataforma para esta venta (según la zona de la propiedad). Puede ser null/0. */
    private BigDecimal comision;
    private String estado;
    /** Si la reserva es grupal (#38): el pago va por cuotas, no con la preferencia individual. */
    private Long grupoId;
}
