package com.alquilaya.servicio_catalogos.dto;

/**
 * Respuesta mínima de una subida de imagen: la URL segura (secure_url) del asset
 * ya hospedado en Cloudinary. El frontend la guarda como `imagenUrl` del banner.
 */
public record UrlResponse(String url) {
}
