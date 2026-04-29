/**
 * Reseña proveniente del backend `servicio-propiedades`.
 * Endpoint: GET /api/v1/resenas/arrendador/{arrendadorId}
 */
export type TipoResena = 'PROPIEDAD' | 'ARRENDADOR';

export interface Resena {
  id: number;
  tipo: TipoResena;
  targetId: number;
  estudianteId: number;
  estudianteNombre?: string;
  rating: number;
  comentario: string;
  visible: boolean;
  fechaCreacion: string;
}

export interface CalificacionResumen {
  promedio: number;
  total: number;
}
