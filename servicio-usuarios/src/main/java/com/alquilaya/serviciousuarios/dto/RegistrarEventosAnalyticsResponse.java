package com.alquilaya.serviciousuarios.dto;

/** Respuesta de la ingesta en batch (202 Accepted): cuántos eventos se persistieron. */
public record RegistrarEventosAnalyticsResponse(int aceptados) {
}
