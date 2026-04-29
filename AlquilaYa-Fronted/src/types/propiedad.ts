// AGENT A WILL OVERRIDE — stub temporal del Agente B para que su UI compile.
// Mantiene los tipos previos (EstadoPropiedad, Propiedad) y agrega los nuevos
// tipos requeridos por el formulario de publicación. Cuando el Agente A
// aplique su versión, deberá conservar al menos: TipoPropiedad nuevo,
// PeriodoAlquiler y CrearPropiedadRequest.

export type EstadoPropiedad = 'PENDIENTE_APROBACION' | 'ACTIVO' | 'RECHAZADO' | 'ARCHIVADO';

// Backend enum para tipo de cuarto/propiedad publicable.
export type TipoPropiedad =
  | 'CUARTO_INDIVIDUAL'
  | 'CUARTO_COMPARTIDO'
  | 'DEPARTAMENTO'
  | 'SUITE';

// Backend enum para período de alquiler.
export type PeriodoAlquiler = 'DIARIO' | 'MENSUAL' | 'SEMESTRAL' | 'ANUAL';

export interface Propiedad {
  id: string;
  titulo: string;
  descripcion: string;
  precio: number;
  ubicacion: string;
  direccion: string;
  imagenes: string[];
  habitaciones: number;
  baños: number;
  area: number;
  servicios: string[];
  propietarioId: string;
  propietarioNombre: string;
  calificacion: number;
  reseñas: number;
  disponible: boolean;
  tipo: TipoPropiedad | string;
  estado: EstadoPropiedad;
  coordenadas?: {
    lat: number;
    lng: number;
  };
}

/**
 * Payload para POST /api/v1/propiedades (parte JSON del multipart).
 * Refleja el contrato del backend ya verificado por el equipo.
 */
export interface CrearPropiedadRequest {
  titulo: string;
  descripcion?: string;
  precio: number;
  direccion: string;
  ubicacionGps?: string;
  tipoPropiedad?: TipoPropiedad;
  periodoAlquiler?: PeriodoAlquiler;
  area?: number;
  nroPiso?: number;
  latitud?: number;
  longitud?: number;
  serviciosIncluidos?: string[];
  reglas?: string[];
  estaDisponible?: boolean;
  disponibleDesde?: string; // yyyy-MM-dd
  arrendadorId: number;
}
