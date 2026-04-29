/**
 * Re-export del módulo `reserva.ts` para mantener consistencia con el alias en
 * inglés solicitado en el plan de gestión del arrendador. Toda la verdad vive
 * en `./reserva.ts` para evitar duplicación.
 */
export type {
  EstadoReserva,
  Reserva,
  ReservaConDetalles,
  CrearReservaRequest,
  FiltroEstadoReserva,
} from './reserva';
