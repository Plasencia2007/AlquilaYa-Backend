export type EstadoPropiedad = 'PENDIENTE_APROBACION' | 'ACTIVO' | 'RECHAZADO' | 'ARCHIVADO';
export type TipoPropiedad = 'CUARTO' | 'DEPARTAMENTO' | 'ESTUDIO' | 'CASA';

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
  tipo: TipoPropiedad;
  estado: EstadoPropiedad;
  coordenadas?: {
    lat: number;
    lng: number;
  };
}
