package com.alquilaya.serviciopropiedades.enums;

/**
 * Política de cancelación por propiedad. Modelo "todo-o-nada según anticipación":
 * al cancelar una reserva PAGADA, se reembolsa el total SOLO si se cancela con al
 * menos {@code diasMinAnticipacion} días antes del check-in; de lo contrario no se
 * emite reembolso. Se queda en el dominio propiedades (decide si emitir o no el
 * REFUND existente) — no toca servicio-pagos ni hace reembolsos parciales.
 */
public enum PoliticaCancelacion {
    /** Reembolso completo si se cancela antes del check-in. */
    FLEXIBLE(0),
    /** Reembolso completo si se cancela con al menos 7 días de anticipación. */
    MODERADA(7),
    /** Reembolso completo solo si se cancela con al menos 30 días de anticipación. */
    ESTRICTA(30);

    private final int diasMinAnticipacion;

    PoliticaCancelacion(int diasMinAnticipacion) {
        this.diasMinAnticipacion = diasMinAnticipacion;
    }

    public int getDiasMinAnticipacion() {
        return diasMinAnticipacion;
    }

    /** ¿Corresponde reembolso si la cancelación ocurre con {@code diasHastaCheckIn} de anticipación? */
    public boolean permiteReembolso(long diasHastaCheckIn) {
        return diasHastaCheckIn >= diasMinAnticipacion;
    }
}
