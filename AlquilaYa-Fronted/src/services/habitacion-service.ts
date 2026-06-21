import { api } from '@/lib/api';
import type { Habitacion, HabitacionInput } from '@/types/propiedad';

/** CRUD de habitaciones de una propiedad gestionada por habitaciones. */
export const habitacionService = {
  listar: async (propiedadId: string | number): Promise<Habitacion[]> => {
    const { data } = await api.get<Habitacion[]>(`/propiedades/${propiedadId}/habitaciones`);
    return Array.isArray(data) ? data : [];
  },

  crear: async (propiedadId: string | number, input: HabitacionInput): Promise<Habitacion> => {
    const { data } = await api.post<Habitacion>(`/propiedades/${propiedadId}/habitaciones`, input);
    return data;
  },

  actualizar: async (
    propiedadId: string | number,
    id: number,
    input: HabitacionInput,
  ): Promise<Habitacion> => {
    const { data } = await api.put<Habitacion>(`/propiedades/${propiedadId}/habitaciones/${id}`, input);
    return data;
  },

  eliminar: async (propiedadId: string | number, id: number): Promise<void> => {
    await api.delete(`/propiedades/${propiedadId}/habitaciones/${id}`);
  },
};
