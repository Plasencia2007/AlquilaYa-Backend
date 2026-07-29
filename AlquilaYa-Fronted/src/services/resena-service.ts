import { api } from '@/lib/api';

export interface Resena {
  id: number;
  calificacion: number;
  comentario: string;
  fechaCreacion: string;
  autorNombre?: string;
  /** perfilId del estudiante autor — sirve para saber si "ya reseñé". */
  estudianteId?: number;
  // Sub-categorías (solo reseñas de propiedad; opcionales / legacy null).
  limpieza?: number;
  ubicacion?: number;
  precio?: number;
  trato?: number;
  /** Respuesta pública del arrendador (solo reseñas de propiedad). */
  respuestaArrendador?: string;
  fechaRespuesta?: string;
}

/** Sub-puntajes que el estudiante asigna al reseñar una propiedad. */
export interface SubCategoriasResena {
  limpieza?: number;
  ubicacion?: number;
  precio?: number;
  trato?: number;
}

/** Promedios por categoría de una propiedad (cada uno null si aún no hay datos). */
export interface ResumenCategorias {
  limpieza: number | null;
  ubicacion: number | null;
  precio: number | null;
  trato: number | null;
}

/**
 * Testimonio de la home (#85): reseña destacada ya anonimizada por el backend.
 * `autor` es un nombre parcial ("María G.") o "Estudiante" si no se pudo resolver;
 * `carrera` puede venir vacía para visitantes anónimos. Nunca trae PII.
 */
export interface Testimonio {
  id: number;
  autor: string;
  carrera?: string;
  calificacion: number;
  comentario: string;
  fechaCreacion: string;
}

/** Forma que devuelve el backend (TestimonioDTO). */
interface TestimonioBackendDTO {
  id: number;
  autor: string;
  carrera?: string | null;
  rating: number;
  comentario?: string | null;
  fechaCreacion: string;
}

/** Forma real que devuelve el backend (ResenaResponseDTO / entidad). */
interface ResenaBackendDTO {
  id: number;
  rating: number;
  ratingLimpieza?: number | null;
  ratingUbicacion?: number | null;
  ratingPrecio?: number | null;
  ratingTrato?: number | null;
  comentario?: string | null;
  respuestaArrendador?: string | null;
  fechaRespuesta?: string | null;
  fechaCreacion: string;
  estudianteNombre?: string | null;
  estudianteId?: number;
}

function fromBackend(dto: ResenaBackendDTO): Resena {
  return {
    id: dto.id,
    calificacion: dto.rating ?? 0,
    comentario: dto.comentario ?? '',
    fechaCreacion: dto.fechaCreacion,
    autorNombre: dto.estudianteNombre ?? undefined,
    estudianteId: dto.estudianteId,
    limpieza: dto.ratingLimpieza ?? undefined,
    ubicacion: dto.ratingUbicacion ?? undefined,
    precio: dto.ratingPrecio ?? undefined,
    trato: dto.ratingTrato ?? undefined,
    respuestaArrendador: dto.respuestaArrendador ?? undefined,
    fechaRespuesta: dto.fechaRespuesta ?? undefined,
  };
}

export const resenaService = {
  crearResenaPropiedad: async (
    propiedadId: string | number,
    calificacion: number,
    comentario: string,
    sub?: SubCategoriasResena,
  ): Promise<Resena> => {
    const { data } = await api.post<ResenaBackendDTO>('/resenas/propiedad', {
      propiedadId: Number(propiedadId),
      rating: calificacion,
      comentario,
      ratingLimpieza: sub?.limpieza,
      ratingUbicacion: sub?.ubicacion,
      ratingPrecio: sub?.precio,
      ratingTrato: sub?.trato,
    });
    return fromBackend(data);
  },

  getResumenCategorias: async (
    propiedadId: string | number,
  ): Promise<ResumenCategorias> => {
    const { data } = await api.get<ResumenCategorias>(
      `/resenas/propiedad/${propiedadId}/resumen`,
    );
    return data;
  },

  /** El arrendador responde (o edita/borra con texto vacío) una reseña de su propiedad. */
  responderResenaPropiedad: async (
    resenaId: number,
    respuesta: string,
  ): Promise<Resena> => {
    const { data } = await api.put<ResenaBackendDTO>(
      `/resenas/propiedad/${resenaId}/respuesta`,
      { respuesta },
    );
    return fromBackend(data);
  },

  crearResenaArrendador: async (
    arrendadorId: string | number,
    calificacion: number,
    comentario: string,
  ): Promise<Resena> => {
    const { data } = await api.post<ResenaBackendDTO>('/resenas/arrendador', {
      arrendadorId: Number(arrendadorId),
      rating: calificacion,
      comentario,
    });
    return fromBackend(data);
  },

  getResenasPorPropiedad: async (propiedadId: string | number): Promise<Resena[]> => {
    const { data } = await api.get<ResenaBackendDTO[]>(`/resenas/propiedad/${propiedadId}`);
    return data.map(fromBackend);
  },

  getResenasPorArrendador: async (arrendadorId: string | number): Promise<Resena[]> => {
    const { data } = await api.get<ResenaBackendDTO[]>(`/resenas/arrendador/${arrendadorId}`);
    return data.map(fromBackend);
  },

  /** Reseñas destacadas (prueba social) para la home. Endpoint público y privacy-safe. */
  getDestacadas: async (limit = 5): Promise<Testimonio[]> => {
    const { data } = await api.get<TestimonioBackendDTO[]>('/resenas/destacadas', {
      params: { limit },
    });
    return data.map((t) => ({
      id: t.id,
      autor: t.autor,
      carrera: t.carrera ?? undefined,
      calificacion: t.rating ?? 0,
      comentario: t.comentario ?? '',
      fechaCreacion: t.fechaCreacion,
    }));
  },
};
