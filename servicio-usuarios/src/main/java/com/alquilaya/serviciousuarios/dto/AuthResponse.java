package com.alquilaya.serviciousuarios.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String token;
    private Long id; // ID del Usuario
    private String nombre;
    private String correo;
    private String rol;
    private Long perfilId; // ID de Arrendador o Estudiante
}
