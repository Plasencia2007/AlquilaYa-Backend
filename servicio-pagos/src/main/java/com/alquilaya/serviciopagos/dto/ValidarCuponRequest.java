package com.alquilaya.serviciopagos.dto;

/** Ítem 292: preview de un cupón ANTES de crear la preferencia de pago. */
public record ValidarCuponRequest(String codigo, Long reservaId) {
}
