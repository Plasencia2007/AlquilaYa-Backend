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
  | 'MINI_DEPA'
  | 'CASA'
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
  /** Distribución (obligatoria en backend para DEPARTAMENTO/MINI_DEPA/CASA). */
  numDormitorios?: number;
  numBanos?: number;
  capacidadPersonas?: number;
  tieneSala?: boolean;
  tieneCocina?: boolean;
  amoblado?: boolean;
  /** Si true, el inmueble se alquila por habitaciones. */
  gestionPorHabitacion?: boolean;
  latitud?: number;
  longitud?: number;
  /** Valores `valor` provenientes del catálogo SERVICIO. */
  serviciosIncluidos?: string[];
  servicios?: ServicioConEstado[];
  /** Valores `valor` provenientes del catálogo REGLA. */
  reglas?: string[];
  estaDisponible?: boolean;
  /** Formato ISO yyyy-MM-dd (se mapea a LocalDate en backend). */
  disponibleDesde?: string;
  /** Enlace de video (YouTube/Vimeo/.mp4). El backend valida el formato. */
  videoUrl?: string;
  /** Política de cancelación (default FLEXIBLE). */
  politicaCancelacion?: PoliticaCancelacion;
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
  /** Precio antes de la última rebaja (para tachado). Solo se muestra si hay badge REBAJA. */
  precioAnterior?: number;
  /** Enlace de video (YouTube/Vimeo/.mp4). */
  videoUrl?: string;
  /** Política de cancelación (default FLEXIBLE). */
  politicaCancelacion?: PoliticaCancelacion;
  /** Precios por temporada/ciclo (solo en la ficha). */
  temporadas?: PrecioTemporada[];
  ubicacion: string;
  direccion: string;
  imagenes: string[];
  habitaciones: number;
  baños: number;
  /** Capacidad de personas (inmuebles completos: depa/mini depa/casa). */
  capacidadPersonas?: number;
  tieneSala?: boolean;
  tieneCocina?: boolean;
  amoblado?: boolean;
  /** Si true, el inmueble se alquila por habitaciones; `precio` es el "desde". */
  gestionPorHabitacion?: boolean;
  area: number;
  servicios: string[];
  /** Servicios con estado (incluido/aparte/no disponible) para el desglose en la ficha. */
  serviciosEstado?: ServicioConEstado[];
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

  // ----- Campos premium (rediseño card) — todos opcionales -----
  /** URL del avatar del arrendador (catálogo público). */
  arrendadorAvatar?: string;
  /** Si el arrendador está verificado por la plataforma. */
  arrendadorVerificado?: boolean;
  /** Fecha de creación de la propiedad en ISO 8601. */
  fechaCreacion?: string;
  /** Fecha de última actualización en ISO 8601. */
  ultimaActualizacion?: string;
  /** Fecha desde la cual está disponible (ISO `yyyy-MM-dd`). */
  disponibleDesde?: string;
  /** Contador de vistas (públicas) de la propiedad. */
  vistas?: number;
  /** Tiempo promedio de respuesta del arrendador en minutos. */
  tiempoRespuestaArrendador?: number;
  /** Reglas de la casa (valores del catálogo REGLA). */
  reglas?: string[];
  /** Distintivos automáticos calculados por el backend (nuevo/popular/última plaza/rebaja). */
  badges?: BadgePropiedad[];
  /** Aviso revisado y aprobado por un admin → sello "Verificado por AlquilaYa" (#47). */
  verificado?: boolean;
}

// =============================================================================
// Tipos sincronizados con el backend de propiedades (servicio-propiedades)
// =============================================================================

/** Estado del backend (enum del servicio-propiedades). Distinto de EstadoPropiedad legacy. */
export type EstadoPropiedadBackend = 'BORRADOR' | 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

/** Imagen embebida en la entidad Propiedad (incluye id necesario para eliminar). */
export interface PropiedadImagen {
  id: number;
  url: string;
  orden: number;
  fechaCreacion?: string;
  /** true = imagen por URL externa (no vive en nuestro Cloudinary). */
  externa?: boolean;
}

/** Forma cruda de la entidad Propiedad tal como la devuelve el backend
 *  en GET /propiedades/arrendador/{id} y POST /propiedades. */
export interface PropiedadBackend {
  id: number;
  titulo: string;
  descripcion?: string;
  precio: number;
  /** Precio antes de la última rebaja (para tachado). */
  precioAnterior?: number;
  /** Enlace de video (YouTube/Vimeo/.mp4). */
  videoUrl?: string;
  /** Política de cancelación (default FLEXIBLE). */
  politicaCancelacion?: PoliticaCancelacion;
  direccion: string;
  ubicacionGps?: string;
  imagenUrl?: string;
  imagenes?: PropiedadImagen[];
  estado: EstadoPropiedadBackend;
  arrendadorId: number;
  tipoPropiedad?: string;
  periodoAlquiler?: string;
  /** Fecha/hora de publicación programada (ISO) si el borrador está agendado. */
  fechaPublicacionProgramada?: string;
  area?: number;
  nroPiso?: number;
  numDormitorios?: number;
  numBanos?: number;
  capacidadPersonas?: number;
  tieneSala?: boolean;
  tieneCocina?: boolean;
  amoblado?: boolean;
  /** Si true, el inmueble se alquila por habitaciones (cada una con precio/estado propio). */
  gestionPorHabitacion?: boolean;
  estaDisponible?: boolean;
  disponibleDesde?: string;
  serviciosIncluidos?: string[];
  servicios?: ServicioConEstado[];
  reglas?: string[];
  latitud?: number;
  longitud?: number;
  distanciaMetros?: number;
  aprobadoPorAdmin?: boolean;
  calificacion?: number;
  numResenas?: number;
  /** Caducidad (#49): el aviso lleva demasiado sin reconfirmarse → pedir al dueño confirmar. */
  requiereReconfirmacion?: boolean;
  fechaUltimaConfirmacion?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;

  // ----- Campos premium (rediseño card) — todos opcionales -----
  /** URL del avatar del arrendador (catálogo público). */
  arrendadorAvatar?: string;
  /** Si el arrendador está verificado por la plataforma. */
  arrendadorVerificado?: boolean;
  /** Alias de `fechaActualizacion` cuando el backend lo expone con este nombre. */
  ultimaActualizacion?: string;
  /** Contador de vistas (públicas) de la propiedad. */
  vistas?: number;
  /** Tiempo promedio de respuesta del arrendador en minutos. */
  tiempoRespuestaArrendador?: number;
  /** Distintivos automáticos calculados por el backend (nuevo/popular/última plaza/rebaja). */
  badges?: BadgePropiedad[];
}

/** DTO retornado por GET /propiedades/{id}/completo. Las imágenes vienen como string[] (URLs). */
export interface PropiedadCompleta {
  id: number;
  titulo: string;
  descripcion?: string;
  precio: number;
  /** Precio antes de la última rebaja (para tachado). */
  precioAnterior?: number;
  /** Enlace de video (YouTube/Vimeo/.mp4). */
  videoUrl?: string;
  /** Política de cancelación (default FLEXIBLE). */
  politicaCancelacion?: PoliticaCancelacion;
  direccion: string;
  tipoPropiedad?: string;
  periodoAlquiler?: string;
  area?: number;
  nroPiso?: number;
  numDormitorios?: number;
  numBanos?: number;
  capacidadPersonas?: number;
  tieneSala?: boolean;
  tieneCocina?: boolean;
  amoblado?: boolean;
  /** Si true, el inmueble se alquila por habitaciones (cada una con precio/estado propio). */
  gestionPorHabitacion?: boolean;
  estaDisponible?: boolean;
  disponibleDesde?: string;
  serviciosIncluidos?: string[];
  servicios?: ServicioConEstado[];
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

  // ----- Campos premium (rediseño card / drawer) — todos opcionales -----
  /** URL del avatar del arrendador. */
  arrendadorAvatar?: string;
  /** Si el arrendador está verificado por la plataforma. */
  arrendadorVerificado?: boolean;
  /** Fecha de creación de la propiedad en ISO 8601. */
  fechaCreacion?: string;
  /** Fecha de última actualización en ISO 8601. */
  ultimaActualizacion?: string;
  /** Contador de vistas (públicas) de la propiedad. */
  vistas?: number;
  /** Tiempo promedio de respuesta del arrendador en minutos. */
  tiempoRespuestaArrendador?: number;
  /** Distintivos automáticos calculados por el backend (nuevo/popular/última plaza/rebaja). */
  badges?: BadgePropiedad[];
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
  numDormitorios?: number;
  numBanos?: number;
  capacidadPersonas?: number;
  tieneSala?: boolean;
  tieneCocina?: boolean;
  amoblado?: boolean;
  /** Si true, el inmueble se alquila por habitaciones (cada una con precio/estado propio). */
  gestionPorHabitacion?: boolean;
  estaDisponible?: boolean;
  disponibleDesde?: string;
  serviciosIncluidos?: string[];
  servicios?: ServicioConEstado[];
  reglas?: string[];
  latitud?: number;
  longitud?: number;
  /** Enlace de video. "" limpia el video; omitir = no tocar. */
  videoUrl?: string;
  /** Política de cancelación. */
  politicaCancelacion?: PoliticaCancelacion;
  arrendadorId?: number;
  estado?: EstadoPropiedadBackend;
  aprobadoPorAdmin?: boolean;
}

// ---------- Habitaciones (inmuebles gestionados por habitación) ----------

/** Estado de un servicio en una propiedad. */
/**
 * Distintivo automático calculado por el backend (no se almacena). Se pinta como chip.
 * - NUEVO: publicada hace poco · POPULAR: muchas vistas
 * - ULTIMA_PLAZA: queda 1 habitación libre (gestión por habitación) · REBAJA: bajó el precio
 */
export type BadgePropiedad = 'NUEVO' | 'POPULAR' | 'ULTIMA_PLAZA' | 'REBAJA';

/** Política de cancelación de una propiedad (gobierna el reembolso al cancelar). */
export type PoliticaCancelacion = 'FLEXIBLE' | 'MODERADA' | 'ESTRICTA';

/** Precio por temporada/ciclo: en [fechaInicio, fechaFin] el precio es `precio`. */
export interface PrecioTemporada {
  id: number;
  /** ISO yyyy-MM-dd */
  fechaInicio: string;
  fechaFin: string;
  precio: number;
  etiqueta?: string;
}

export type EstadoServicio = 'INCLUIDO' | 'APARTE' | 'NO_DISPONIBLE';

/** Servicio con su estado (incluido en el precio / se paga aparte / no disponible). */
export interface ServicioConEstado {
  servicio: string;
  estado: EstadoServicio;
}

export type EstadoHabitacion = 'LIBRE' | 'RESERVADA' | 'OCUPADA' | 'MANTENIMIENTO';

/** Habitación reservable de una propiedad gestionada por habitaciones. */
export interface Habitacion {
  id: number;
  propiedadId: number;
  nombre: string;
  precio: number;
  estado: EstadoHabitacion;
  area?: number | null;
  descripcion?: string | null;
  orden?: number;
}

/** Payload de alta/edición de una habitación. */
export interface HabitacionInput {
  nombre: string;
  precio: number;
  estado?: EstadoHabitacion;
  area?: number;
  descripcion?: string;
  orden?: number;
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
