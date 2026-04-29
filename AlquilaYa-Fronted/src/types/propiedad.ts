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

// =============================================================================
// Tipos sincronizados con el backend de propiedades (servicio-propiedades)
// =============================================================================

/** Estado del backend (enum del servicio-propiedades). Distinto de EstadoPropiedad legacy. */
export type EstadoPropiedadBackend = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

/** Imagen embebida en la entidad Propiedad (incluye id necesario para eliminar). */
export interface PropiedadImagen {
  id: number;
  url: string;
  orden: number;
  fechaCreacion?: string;
}

/** Forma cruda de la entidad Propiedad tal como la devuelve el backend
 *  en GET /propiedades/arrendador/{id} y POST /propiedades. */
export interface PropiedadBackend {
  id: number;
  titulo: string;
  descripcion?: string;
  precio: number;
  direccion: string;
  ubicacionGps?: string;
  imagenUrl?: string;
  imagenes?: PropiedadImagen[];
  estado: EstadoPropiedadBackend;
  arrendadorId: number;
  tipoPropiedad?: string;
  periodoAlquiler?: string;
  area?: number;
  nroPiso?: number;
  estaDisponible?: boolean;
  disponibleDesde?: string;
  serviciosIncluidos?: string[];
  reglas?: string[];
  latitud?: number;
  longitud?: number;
  distanciaMetros?: number;
  aprobadoPorAdmin?: boolean;
  calificacion?: number;
  numResenas?: number;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

/** DTO retornado por GET /propiedades/{id}/completo. Las imágenes vienen como string[] (URLs). */
export interface PropiedadCompleta {
  id: number;
  titulo: string;
  descripcion?: string;
  precio: number;
  direccion: string;
  tipoPropiedad?: string;
  periodoAlquiler?: string;
  area?: number;
  nroPiso?: number;
  estaDisponible?: boolean;
  disponibleDesde?: string;
  serviciosIncluidos?: string[];
  reglas?: string[];
  latitud?: number;
  longitud?: number;
  distanciaMetros?: number;
  aprobadoPorAdmin?: boolean;
  calificacion?: number;
  numResenas?: number;
  estado: EstadoPropiedadBackend;
  imagenes: string[];
  arrendadorId: number;
  arrendadorNombre?: string;
  arrendadorTelefono?: string;
  arrendadorCorreo?: string;
}

/** Payload aceptado por PUT /propiedades/{id} (todo opcional, parche superficial). */
export interface PropiedadUpdate {
  titulo?: string;
  descripcion?: string;
  precio?: number;
  direccion?: string;
  ubicacionGps?: string;
  tipoPropiedad?: string;
  periodoAlquiler?: string;
  area?: number;
  nroPiso?: number;
  estaDisponible?: boolean;
  disponibleDesde?: string;
  serviciosIncluidos?: string[];
  reglas?: string[];
  latitud?: number;
  longitud?: number;
  arrendadorId?: number;
  estado?: EstadoPropiedadBackend;
  aprobadoPorAdmin?: boolean;
}

/** Catálogo cliente de servicios comunes (el backend acepta strings libres). */
export interface ServicioCatalogo {
  clave: string;
  etiqueta: string;
  icono: string;
}

/** Catálogo cliente de reglas comunes. */
export interface ReglaCatalogo {
  clave: string;
  etiqueta: string;
  icono: string;
}

export const SERVICIOS_CATALOGO: ServicioCatalogo[] = [
  { clave: 'WIFI', etiqueta: 'Wi-Fi', icono: 'wifi' },
  { clave: 'AGUA', etiqueta: 'Agua', icono: 'water_drop' },
  { clave: 'LUZ', etiqueta: 'Luz', icono: 'lightbulb' },
  { clave: 'GAS', etiqueta: 'Gas', icono: 'local_fire_department' },
  { clave: 'CABLE_TV', etiqueta: 'Cable TV', icono: 'tv' },
  { clave: 'LAVANDERIA', etiqueta: 'Lavandería', icono: 'local_laundry_service' },
  { clave: 'COCINA_COMPARTIDA', etiqueta: 'Cocina compartida', icono: 'kitchen' },
  { clave: 'ESTACIONAMIENTO', etiqueta: 'Estacionamiento', icono: 'local_parking' },
  { clave: 'SEGURIDAD_24H', etiqueta: 'Seguridad 24h', icono: 'shield' },
];

export const REGLAS_CATALOGO: ReglaCatalogo[] = [
  { clave: 'NO_FUMAR', etiqueta: 'No fumar', icono: 'smoke_free' },
  { clave: 'NO_MASCOTAS', etiqueta: 'No mascotas', icono: 'pets' },
  { clave: 'NO_FIESTAS', etiqueta: 'No fiestas', icono: 'celebration' },
  { clave: 'SILENCIO_22H', etiqueta: 'Silencio desde 22:00', icono: 'bedtime' },
  { clave: 'NO_VISITAS_NOCHE', etiqueta: 'No visitas nocturnas', icono: 'nightlight' },
  { clave: 'LIMPIEZA_COMUN', etiqueta: 'Limpieza áreas comunes', icono: 'cleaning_services' },
];
