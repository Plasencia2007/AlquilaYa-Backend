export type EstadoReserva = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'PAGADO' | 'CANCELADO';

export interface Reserva {
  id: string;
  propiedadId: string;
  estudianteId: string;
  estudianteNombre: string;
  fechaInicio: string;
  fechaFin: string;
  montoTotal: number;
  estado: EstadoReserva;
  fechaCreacion: string;
}
