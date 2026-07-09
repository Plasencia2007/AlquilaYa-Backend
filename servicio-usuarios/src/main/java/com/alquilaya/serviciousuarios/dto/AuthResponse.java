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
    // S5: ni el access token ni el refresh token van en el JSON — ambos viajan SOLO como
    // cookies httpOnly (ver AuthController.setAccessCookie/setRefreshCookie). Un XSS que lea
    // esta respuesta ya no puede robar ningún token.
    //
    // `autenticado` reemplaza al viejo chequeo "¿token != null?" que usaba el frontend para
    // saber si ya hay sesión — con el token fuera del body, ese chequeo dejaría de servir
    // (tanto una sesión recién creada como una verificación aún pendiente tendrían token=null).
    private boolean autenticado;
    private Long id; // ID del Usuario
    private String nombre;
    private String correo;
    private String rol;
    private Long perfilId; // ID de Arrendador o Estudiante
    // S5: antes el frontend sacaba estos 3 campos decodificando el JWT en el navegador
    // (obtenerUsuarioActualDesdeToken); con el token ya inaccesible a JS, van explícitos acá.
    private String foto;
    private boolean emailVerificado;
    private String tipoLogin; // "LOCAL" | "GOOGLE"
}
