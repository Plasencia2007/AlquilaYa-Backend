package com.alquilaya.serviciousuarios.dto;

import com.alquilaya.serviciousuarios.validaciones.anotaciones.ContrasenaSegura;
import com.alquilaya.serviciousuarios.validaciones.anotaciones.DniPeruano;
import com.alquilaya.serviciousuarios.validaciones.anotaciones.TelefonoPeruano;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RegisterRequest {
    @NotBlank(message = "El nombre es obligatorio")
    @Size(min = 2, max = 50, message = "El nombre debe tener entre 2 y 50 caracteres")
    private String nombre;

    @NotBlank(message = "El apellido es obligatorio")
    @Size(min = 2, max = 50, message = "El apellido debe tener entre 2 y 50 caracteres")
    private String apellido;

    @NotBlank(message = "El DNI es obligatorio")
    @DniPeruano
    private String dni;

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "Formato de correo inválido")
    private String correo;

    @NotBlank(message = "La contraseña es obligatoria")
    @ContrasenaSegura
    private String password;

    @NotBlank(message = "El teléfono es obligatorio")
    @TelefonoPeruano
    private String telefono;

    @NotBlank(message = "El rol es obligatorio")
    @Pattern(regexp = "^(ESTUDIANTE|ARRENDADOR|ADMIN)$", message = "El rol debe ser ESTUDIANTE, ARRENDADOR o ADMIN")
    private String rol;

    @Valid
    private DetallesArrendadorRequest detallesArrendador;

    @Valid
    private DetallesEstudianteRequest detallesEstudiante;
}
