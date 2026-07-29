package com.alquilaya.serviciousuarios.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * Alta de una suscripción a alertas de nuevas propiedades (público, anónimo).
 *
 * <p>Se exige al menos uno de {@code zonaId}/{@code universidadId} para que la alerta sea
 * accionable (una suscripción sin ningún filtro notificaría absolutamente todo). El resto de
 * criterios ({@code precioMax}, {@code tipoPropiedad}, {@code servicios}, {@code dormitoriosMin},
 * {@code capacidadMin}) son opcionales y afinan el matching: cada uno presente debe cumplirse.</p>
 */
@Data
public class CrearSuscripcionAlertaRequest {

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "Correo inválido")
    private String correo;

    private Long zonaId;

    private Long universidadId;

    @DecimalMin(value = "0.01", message = "El precio máximo debe ser mayor a 0")
    private BigDecimal precioMax;

    /** Tipo de propiedad de interés (nombre del enum {@code TipoPropiedad}). Opcional. */
    @Size(max = 100, message = "Tipo de propiedad inválido")
    private String tipoPropiedad;

    /** Servicios que la propiedad debe ofrecer TODOS (subset). Opcional. */
    private List<@Size(max = 100) String> servicios;

    /** Dormitorios mínimos de la propiedad. Opcional. */
    @Positive(message = "Los dormitorios mínimos deben ser mayores a 0")
    private Integer dormitoriosMin;

    /** Capacidad (personas) mínima de la propiedad. Opcional. */
    @Positive(message = "La capacidad mínima debe ser mayor a 0")
    private Integer capacidadMin;

    /** Regla de negocio: la alerta necesita al menos un criterio de zona o universidad. */
    @AssertTrue(message = "Indica una zona o una universidad para tu alerta")
    public boolean isFiltroValido() {
        return zonaId != null || universidadId != null;
    }
}
