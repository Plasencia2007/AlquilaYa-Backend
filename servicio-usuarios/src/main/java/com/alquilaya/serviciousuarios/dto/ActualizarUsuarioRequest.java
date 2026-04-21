package com.alquilaya.serviciousuarios.dto;

import com.alquilaya.serviciousuarios.enums.EstadoUsuario;
import com.alquilaya.serviciousuarios.validaciones.anotaciones.DniPeruano;
import com.alquilaya.serviciousuarios.validaciones.anotaciones.TelefonoPeruano;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ActualizarUsuarioRequest {
    @Size(min = 2, max = 50, message = "El nombre debe tener entre 2 y 50 caracteres")
    private String nombre;

    @Size(min = 2, max = 50, message = "El apellido debe tener entre 2 y 50 caracteres")
    private String apellido;

    @DniPeruano
    private String dni;

    @TelefonoPeruano
    private String telefono;

    private EstadoUsuario estado;

    @Valid
    private DetallesArrendadorRequest detallesArrendador;

    @Valid
    private DetallesEstudianteRequest detallesEstudiante;
}
