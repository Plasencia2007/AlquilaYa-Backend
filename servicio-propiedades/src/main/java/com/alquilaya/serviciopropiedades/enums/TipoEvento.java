package com.alquilaya.serviciopropiedades.enums;

/**
 * Tipo de evento de interacción con una publicación, registrado en la tabla de eventos
 * para la analítica del arrendador. Solo VISTA y CONTACTO se loguean aquí; favoritos y
 * reservas se cuentan desde sus propias tablas (que ya tienen fecha).
 */
public enum TipoEvento {
    VISTA,
    CONTACTO
}
