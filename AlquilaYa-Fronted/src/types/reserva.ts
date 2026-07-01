export type EstadoReserva =
  | 'SOLICITADA'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'PAGADA'
  | 'FINALIZADA'
  | 'CANCELADA';

import type { NivelReputacion } from './reputacion';

export interface Reserva {
  id: string;
  propiedadId: string;
  propiedadTitulo?: string;
  propiedadImagen?: string;
  propiedadUbicacion?: string;
  estudianteId: string;
  estudianteNombre?: string;
  /** Score agregado de reputación del estudiante 0–100 (#26). */
  estudianteScore?: number;
  /** Nivel del estudiante: BRONCE/PLATA/ORO/PLATINO (#26). */
  estudianteNivelReputacion?: NivelReputacion;
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
  /** Comisión de plataforma de esta venta (según la zona). El estudiante paga montoTotal + comisión; el arrendador recibe montoTotal. */
  comision?: number;
  estado: EstadoReserva;
  fechaCreacion: string;
  estudianteCorreo?: string;
  estudianteTelefono?: string;
  estudianteUniversidad?: string;
  estudianteCarrera?: string;
  estudianteVerificado?: boolean;
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
