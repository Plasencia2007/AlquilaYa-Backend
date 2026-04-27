package com.alquilaya.servicio_mensajeria.config;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CurrentUser {
    Long userId;
    Long perfilId;
    String email;
    String rol;
}
