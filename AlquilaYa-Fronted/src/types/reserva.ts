export type EstadoReserva =
  | 'SOLICITADA'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'PAGADA'
  | 'FINALIZADA'
  | 'CANCELADA'
  /** Reserva APROBADA que no se pagó dentro del plazo configurado (ítem 238). Terminal. */
  | 'EXPIRADA';

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
  motivoCancelacion?: string;
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
  /** Firma electrónica del contrato (G4, ítem 237). Null = esa parte aún no firmó. */
  firmaEstudianteAt?: string | null;
  firmaArrendadorAt?: string | null;
  /** Solo presente cuando `estado === 'APROBADA'` (ítem 238). */
  fechaExpiracion?: string | null;
  grupoId?: number | null;
  /** Habitación reservada, si la propiedad se gestiona por habitaciones (ítem 285). */
  habitacionId?: number | null;
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
