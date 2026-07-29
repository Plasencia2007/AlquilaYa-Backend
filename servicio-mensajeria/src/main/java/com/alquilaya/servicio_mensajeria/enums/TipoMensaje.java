package com.alquilaya.servicio_mensajeria.enums;

/** Ítem 254: distingue el tipo de contenido de un mensaje. */
public enum TipoMensaje {
    /** Mensaje de texto plano (comportamiento histórico, sigue siendo el default). */
    TEXTO,
    /** Mensaje con una imagen adjunta (`urlAdjunto`), subida previamente a Cloudinary. */
    IMAGEN
}
