import { Propiedad } from '@/types/propiedad';
import { MOCK_PROPIEDADES } from '@/mocks/propiedades';
import { api } from '@/utils/api';

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

export const servicioPropiedades = {
  obtenerTodas: async (): Promise<Propiedad[]> => {
    if (USE_MOCKS) {
      await new Promise(resolve => setTimeout(resolve, 600));
      return MOCK_PROPIEDADES;
    }
    
    const response = await api.get<Propiedad[]>('/propiedades');
    return response.data;
  },

  obtenerPorId: async (id: string): Promise<Propiedad | null> => {
    if (USE_MOCKS) {
      await new Promise(resolve => setTimeout(resolve, 400));
      const propiedad = MOCK_PROPIEDADES.find(p => p.id === id);
      return propiedad || null;
    }

    const response = await api.get<Propiedad>(`/propiedades/${id}`);
    return response.data;
  },

  buscar: async (filtros: { ubicacion?: string; precioMaximo?: number; tipo?: string }): Promise<Propiedad[]> => {
    if (USE_MOCKS) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return MOCK_PROPIEDADES.filter(p => {
        if (filtros.ubicacion && !p.ubicacion.toLowerCase().includes(filtros.ubicacion.toLowerCase())) return false;
        if (filtros.precioMaximo && p.precio > filtros.precioMaximo) return false;
        if (filtros.tipo && p.tipo !== filtros.tipo) return false;
        return true;
      });
    }

    const response = await api.get<Propiedad[]>('/propiedades/buscar', { params: filtros });
    return response.data;
  }
};
