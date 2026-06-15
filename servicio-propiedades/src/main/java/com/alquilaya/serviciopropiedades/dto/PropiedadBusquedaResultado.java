package com.alquilaya.serviciopropiedades.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Contenedor del resultado de búsqueda pública. Existe para poder cachear en
 * Redis: {@code GenericJackson2JsonRedisSerializer} NO hace round-trip de una
 * {@code List} en la raíz (la escribe como array plano y al leer espera el id de
 * tipo). Un objeto en la raíz sí lleva su {@code @class} y deserializa bien, por
 * lo que envolvemos la lista aquí.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PropiedadBusquedaResultado {
    private List<PropiedadPublicoDTO> propiedades;
}
