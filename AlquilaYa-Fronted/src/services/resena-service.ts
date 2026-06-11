import { api } from '@/lib/api';

export interface Resena {
  id: number;
  calificacion: number;
  comentario: string;
  fechaCreacion: string;
  autorNombre?: string;
  /** perfilId del estudiante autor — sirve para saber si "ya reseñé". */
  estudianteId?: number;
}

/** Forma real que devuelve el backend (ResenaResponseDTO / entidad). */
interface ResenaBackendDTO {
  id: number;
  rating: number;
  comentario?: string | null;
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
  };
}

export const resenaService = {
  crearResenaPropiedad: async (
    propiedadId: string | number,
    calificacion: number,
    comentario: string,
  ): Promise<Resena> => {
    const { data } = await api.post<ResenaBackendDTO>('/resenas/propiedad', {
      propiedadId: Number(propiedadId),
      rating: calificacion,
      comentario,
    });
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
};
