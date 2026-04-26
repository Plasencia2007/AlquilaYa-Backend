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
