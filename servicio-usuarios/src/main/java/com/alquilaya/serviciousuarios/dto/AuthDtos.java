package com.alquilaya.serviciousuarios.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.*;

public class AuthDtos {

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class LoginRequest {
        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "Formato de correo inválido")
        private String correo;

        @NotBlank(message = "La contraseña es obligatoria")
        private String password;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AdminRegisterRequest {
        @NotBlank(message = "El nombre es obligatorio")
        private String nombre;

        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "Formato de correo inválido")
        private String correo;

        @NotBlank(message = "La contraseña es obligatoria")
        private String password;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RegisterRequest {
        @NotBlank(message = "El nombre es obligatorio")
        @Size(min = 2, max = 50, message = "El nombre debe tener entre 2 y 50 caracteres")
        private String nombre;

        @NotBlank(message = "El apellido es obligatorio")
        @Size(min = 2, max = 50, message = "El apellido debe tener entre 2 y 50 caracteres")
        private String apellido;

        @NotBlank(message = "El DNI es obligatorio")
        @Pattern(regexp = "^[0-9]{8}$", message = "El DNI debe tener 8 dígitos numéricos")
        private String dni;

        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "Formato de correo inválido")
        private String correo;

        @NotBlank(message = "La contraseña es obligatoria")
        @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
        private String password;

        @NotBlank(message = "El teléfono es obligatorio")
        private String telefono;

        @NotBlank(message = "El rol es obligatorio")
        private String rol; // ESTUDIANTE, ARRENDADOR
        
        private java.util.Map<String, Object> detallesPerfil;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AuthResponse {
        private String token;
        private Long id; // ID del Usuario
        private String nombre;
        private String correo;
        private String rol;
        private Long perfilId; // El ID de la tabla Arrendador o Estudiante
    }
}
