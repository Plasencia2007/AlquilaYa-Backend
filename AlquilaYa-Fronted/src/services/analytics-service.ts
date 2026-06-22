import { api } from '@/lib/api';

export interface PuntoSerie {
  fecha: string; // ISO yyyy-MM-dd
  valor: number;
}

export interface Embudo {
  vistas: number;
  favoritos: number;
  contactos: number;
  reservas: number;
}

export interface PrecioZona {
  precio: number;
  promedio: number;
  min: number | null;
  max: number | null;
  cantidad: number;
  posicion: 'BAJO' | 'PROMEDIO' | 'ALTO';
}

export interface AnaliticaPropiedad {
  vistasPorDia: PuntoSerie[];
  vistas7: number;
  vistas30: number;
  vistasTotal: number;
  embudo: Embudo;
  precioVsZona: PrecioZona | null;
  sugerencias: string[];
  diasUltimaReserva: number | null;
  alertaSinReservas: boolean;
}

export const analyticsService = {
  /** Analítica completa de una propiedad del arrendador (#51–#55). */
  obtener: async (propiedadId: string | number): Promise<AnaliticaPropiedad> => {
    const res = await api.get<AnaliticaPropiedad>(`propiedades/${propiedadId}/analitica`);
    return res.data;
  },
};
