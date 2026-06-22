package com.alquilaya.serviciopropiedades.enums;

/** Estado de gestión de una denuncia por el admin. */
public enum EstadoDenuncia {
    PENDIENTE,
    REVISADA,    // el admin la atendió (puede haber ocultado/eliminado la propiedad)
    DESCARTADA   // sin mérito
}
