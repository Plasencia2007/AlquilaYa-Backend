package com.alquilaya.serviciopagos.dto;

/**
 * Item 298: body de {@code POST /api/v1/pagos/nps}. Sin {@code @Valid} en el controller a
 * propósito (mismo criterio que {@link com.alquilaya.serviciopagos.controllers.DepositoController}
 * en este servicio): la validación real ocurre en {@code NpsService.registrar}, que lanza
 * {@link IllegalArgumentException} (mapeado a 400 por {@code GlobalExceptionHandler}) — el
 * handler global no tiene un caso para {@code MethodArgumentNotValidException}, así que un
 * {@code @Valid} fallido caería al catch-all genérico y devolvería 500 en vez de 400.
 */
public record NpsRequestDTO(
        Long reservaId,
        Integer score,
        String comentario) {
}
