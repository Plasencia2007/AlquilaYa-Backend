import { api } from '@/lib/api';

export interface Resena {
  id: number;
  calificacion: number;
  comentario: string;
  fechaCreacion: string;
  autorNombre?: string;
}

export const resenaService = {
  crearResenaPropiedad: async (
    propiedadId: string | number,
    calificacion: number,
    comentario: string,
  ): Promise<Resena> => {
    const { data } = await api.post<Resena>('/resenas/propiedad', {
      propiedadId: Number(propiedadId),
      calificacion,
      comentario,
    });
    return data;
  },

  crearResenaArrendador: async (
    arrendadorId: string | number,
    calificacion: number,
    comentario: string,
  ): Promise<Resena> => {
    const { data } = await api.post<Resena>('/resenas/arrendador', {
      arrendadorId: Number(arrendadorId),
      calificacion,
      comentario,
    });
    return data;
  },

  getResenasPorPropiedad: async (propiedadId: string | number): Promise<Resena[]> => {
    const { data } = await api.get<Resena[]>(`/resenas/propiedad/${propiedadId}`);
    return data;
  },

  getResenasPorArrendador: async (arrendadorId: string | number): Promise<Resena[]> => {
    const { data } = await api.get<Resena[]>(`/resenas/arrendador/${arrendadorId}`);
    return data;
  },
};
