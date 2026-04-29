/**
 * Tipos de propiedad y enums relacionados, alineados con la entidad
 * `com.alquilaya.serviciopropiedades.entities.Propiedad` y los enums
 * `TipoPropiedad` y `PeriodoAlquiler` del backend.
 *
 * Si el backend cambia los enums, este archivo es el único punto a tocar
 * en el frontend (excepto el catálogo dinámico, que vive en
 * `services/catalogos-service.ts`).
 */

// ---------- Enums alineados con el backend ----------

/** Espejo del enum `com.alquilaya.serviciopropiedades.enums.TipoPropiedad`. */
export type TipoPropiedad =
  | 'CUARTO_INDIVIDUAL'
  | 'CUARTO_COMPARTIDO'
  | 'DEPARTAMENTO'
  | 'SUITE';

/** Espejo del enum `com.alquilaya.serviciopropiedades.enums.PeriodoAlquiler`. */
export type PeriodoAlquiler = 'DIARIO' | 'MENSUAL' | 'SEMESTRAL' | 'ANUAL';

/** Espejo del enum `com.alquilaya.serviciopropiedades.enums.EstadoPropiedad`. */
export type EstadoPropiedad =
  | 'PENDIENTE'
  | 'PENDIENTE_APROBACION'
  | 'ACTIVO'
  | 'RECHAZADO'
  | 'ARCHIVADO';

// ---------- Payload de creación ----------

/**
 * Payload aceptado por `POST /api/v1/propiedades` (parte `propiedad`).
 *
 * El backend lo deserializa directamente sobre la entidad `Propiedad`, así que
 * los nombres de campo deben coincidir exactamente.
 *
 * Validaciones backend:
 *  - titulo (NotBlank, max 150)
 *  - descripcion (max 5000)
 *  - precio (NotNull, > 0)
 *  - direccion (NotBlank, max 255)
 *  - area (>= 0)
 *  - nroPiso (>= 0)
 *  - latitud (-90..90), longitud (-180..180)
 *  - @CercaDeUpeu cross-field: si se manda lat/lng, debe estar a <= 15km del campus.
 *  - arrendadorId (NotNull a nivel @Column)
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
  /** Valores `valor` provenientes del catálogo SERVICIO. */
  serviciosIncluidos?: string[];
  /** Valores `valor` provenientes del catálogo REGLA. */
  reglas?: string[];
  estaDisponible?: boolean;
  /** Formato ISO yyyy-MM-dd (se mapea a LocalDate en backend). */
  disponibleDesde?: string;
  arrendadorId: number;
}

// ---------- Modelo legacy usado por mocks/UI pública ----------

/**
 * Forma simplificada que consume la UI de búsqueda y los mocks.
 * No corresponde 1:1 con la entidad backend; es la "vista" que armó el equipo
 * para listings, mapas y carruseles antes de tener un servicio real.
 *
 * No se debe usar para el payload de creación — para eso existe
 * `CrearPropiedadRequest`.
 */
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
  /**
   * Tipo flexible (incluye valores legacy que aparecen en mocks/UI como
   * 'CUARTO', 'ESTUDIO', 'CASA'). Para enviar al backend siempre usar
   * `TipoPropiedad`.
   */
  tipo: TipoPropiedad | 'CUARTO' | 'ESTUDIO' | 'CASA';
  estado: EstadoPropiedad;
  coordenadas?: {
    lat: number;
    lng: number;
  };
}
