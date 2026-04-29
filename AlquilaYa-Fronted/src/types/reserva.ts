export type EstadoReserva =
  | 'SOLICITADA'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'PAGADA'
  | 'FINALIZADA'
  | 'CANCELADA';

export interface Reserva {
  id: string;
  propiedadId: string;
  propiedadTitulo?: string;
  propiedadImagen?: string;
  propiedadUbicacion?: string;
  estudianteId: string;
  estudianteNombre?: string;
  arrendadorId?: string;
  arrendadorNombre?: string;
  fechaInicio: string;
  fechaFin: string;
  meses?: number;
  ocupantes?: number;
  solicitaVisitaPrevia?: boolean;
  notaEstudiante?: string;
  motivoRechazo?: string;
  montoTotal: number;
  estado: EstadoReserva;
  fechaCreacion: string;
}

export interface CrearReservaRequest {
  propiedadId: string | number;
  fechaInicio: string;
  fechaFin: string;
  meses: number;
  ocupantes: number;
  solicitaVisitaPrevia: boolean;
  notaEstudiante?: string;
}

/**
 * Reserva enriquecida con información visible adicional del estudiante y
 * propiedad. La forma actual ya incluye los campos opcionales necesarios
 * dentro de `Reserva`; este alias documenta el caso de uso del arrendador.
 */
export interface ReservaConDetalles extends Reserva {
  estudianteCorreo?: string;
  estudianteAvatar?: string;
}

export type FiltroEstadoReserva = EstadoReserva | 'TODAS';
