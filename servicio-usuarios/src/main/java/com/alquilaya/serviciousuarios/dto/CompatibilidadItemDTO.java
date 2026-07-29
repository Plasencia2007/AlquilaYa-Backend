package com.alquilaya.serviciousuarios.dto;

/**
 * Un ítem del desglose de compatibilidad entre dos perfiles de convivencia (ítem 215).
 * Antes este desglose se recalculaba en el frontend replicando a mano la lógica de
 * {@code ConvivenciaService#calcularCompatibilidad} — dos copias del mismo algoritmo que
 * podían desincronizarse en silencio si una cambiaba y la otra no. Ahora el backend es la
 * única fuente de verdad: calcula el score Y el desglose en el mismo lugar, y los expone
 * juntos en {@link PerfilConvivenciaDTO}.
 */
public record CompatibilidadItemDTO(String campo, String label, boolean coincide) {}
