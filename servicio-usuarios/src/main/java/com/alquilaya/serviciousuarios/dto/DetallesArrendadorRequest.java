package com.alquilaya.serviciousuarios.dto;

import com.alquilaya.serviciousuarios.validaciones.anotaciones.CercaDeUpeu;
import com.alquilaya.serviciousuarios.validaciones.anotaciones.CoordenadaLatitud;
import com.alquilaya.serviciousuarios.validaciones.anotaciones.CoordenadaLongitud;
import com.alquilaya.serviciousuarios.validaciones.anotaciones.RucPeruano;
import com.alquilaya.serviciousuarios.validaciones.anotaciones.TelefonoPeruano;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@CercaDeUpeu
public class DetallesArrendadorRequest {
    @TelefonoPeruano
    private String telefono;

    @RucPeruano
    private String ruc;

    private String nombreComercial;

    @NotBlank(message = "La dirección de las propiedades es obligatoria")
    private String direccionCuartos;

    @CoordenadaLatitud
    private Double latitud;

    @CoordenadaLongitud
    private Double longitud;

    private Boolean esEmpresa;
}
