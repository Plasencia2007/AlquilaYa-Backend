import { api } from '@/lib/api';

export interface Carrera {
  id: number;
  nombre: string;
  codigo?: string | null;
  activo: boolean;
  fechaCreacion?: string | null;
}

export interface CarreraInput {
  nombre: string;
  codigo?: string;
  activo?: boolean;
}

export const carreraService = {
  listarActivas: async (): Promise<Carrera[]> => {
    const response = await api.get<Carrera[]>('catalogos/carreras');
    return response.data;
  },

  listarTodas: async (): Promise<Carrera[]> => {
    const response = await api.get<Carrera[]>('catalogos/carreras/admin');
    return response.data;
  },

  obtener: async (id: number): Promise<Carrera> => {
    const response = await api.get<Carrera>(`catalogos/carreras/${id}`);
    return response.data;
  },

  crear: async (input: CarreraInput): Promise<Carrera> => {
    const response = await api.post<Carrera>('catalogos/carreras/admin', input);
    return response.data;
  },

  actualizar: async (id: number, input: CarreraInput): Promise<Carrera> => {
    const response = await api.put<Carrera>(`catalogos/carreras/admin/${id}`, input);
    return response.data;
  },

  eliminar: async (id: number): Promise<void> => {
    await api.delete(`catalogos/carreras/admin/${id}`);
  },
};
