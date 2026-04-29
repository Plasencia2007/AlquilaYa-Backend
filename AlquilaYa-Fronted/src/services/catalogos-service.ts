// AGENT A WILL OVERRIDE — stub temporal del Agente B.
// El Agente A está creando la versión real conectada al backend
// (GET /catalogos/activos). Este stub provee tipos y un fallback
// con datos por defecto para que la UI de publicación compile y
// funcione aunque el endpoint todavía no esté listo.

import { api } from '@/lib/api';

export type TipoCatalogo = 'SERVICIO' | 'REGLA' | 'TIPO_CUARTO' | 'PERIODO_ALQUILER';

export interface ItemCatalogo {
  id: number;
  nombre: string;
  valor: string;
  tipo: TipoCatalogo;
  icono?: string;
  descripcion?: string;
  activo: boolean;
}

export interface CatalogosActivos {
  SERVICIO: ItemCatalogo[];
  REGLA: ItemCatalogo[];
  TIPO_CUARTO: ItemCatalogo[];
  PERIODO_ALQUILER: ItemCatalogo[];
}

// Catálogo por defecto (fallback). Iconos = Material Symbols.
const FALLBACK: CatalogosActivos = {
  SERVICIO: [
    { id: 1, nombre: 'Wi-Fi', valor: 'WIFI', tipo: 'SERVICIO', icono: 'wifi', activo: true },
    { id: 2, nombre: 'Agua incluida', valor: 'AGUA', tipo: 'SERVICIO', icono: 'water_drop', activo: true },
    { id: 3, nombre: 'Luz incluida', valor: 'LUZ', tipo: 'SERVICIO', icono: 'bolt', activo: true },
    { id: 4, nombre: 'Cable / TV', valor: 'CABLE', tipo: 'SERVICIO', icono: 'tv', activo: true },
    { id: 5, nombre: 'Cocina', valor: 'COCINA', tipo: 'SERVICIO', icono: 'kitchen', activo: true },
    { id: 6, nombre: 'Lavandería', valor: 'LAVANDERIA', tipo: 'SERVICIO', icono: 'local_laundry_service', activo: true },
    { id: 7, nombre: 'Estacionamiento', valor: 'ESTACIONAMIENTO', tipo: 'SERVICIO', icono: 'local_parking', activo: true },
    { id: 8, nombre: 'Aire acondicionado', valor: 'AIRE_ACONDICIONADO', tipo: 'SERVICIO', icono: 'ac_unit', activo: true },
    { id: 9, nombre: 'Cámaras de seguridad', valor: 'SEGURIDAD', tipo: 'SERVICIO', icono: 'shield', activo: true },
    { id: 10, nombre: 'Limpieza', valor: 'LIMPIEZA', tipo: 'SERVICIO', icono: 'cleaning_services', activo: true },
  ],
  REGLA: [
    { id: 101, nombre: 'No fumar', valor: 'NO_FUMAR', tipo: 'REGLA', icono: 'smoke_free', activo: true },
    { id: 102, nombre: 'No mascotas', valor: 'NO_MASCOTAS', tipo: 'REGLA', icono: 'pets', activo: true },
    { id: 103, nombre: 'No fiestas', valor: 'NO_FIESTAS', tipo: 'REGLA', icono: 'celebration', activo: true },
    { id: 104, nombre: 'Solo mujeres', valor: 'SOLO_MUJERES', tipo: 'REGLA', icono: 'female', activo: true },
    { id: 105, nombre: 'Solo varones', valor: 'SOLO_VARONES', tipo: 'REGLA', icono: 'male', activo: true },
    { id: 106, nombre: 'Silencio nocturno', valor: 'SILENCIO_NOCTURNO', tipo: 'REGLA', icono: 'bedtime', activo: true },
    { id: 107, nombre: 'No visitas tarde', valor: 'NO_VISITAS_TARDE', tipo: 'REGLA', icono: 'do_not_disturb', activo: true },
    { id: 108, nombre: 'Pago puntual', valor: 'PAGO_PUNTUAL', tipo: 'REGLA', icono: 'paid', activo: true },
  ],
  TIPO_CUARTO: [
    { id: 201, nombre: 'Cuarto individual', valor: 'CUARTO_INDIVIDUAL', tipo: 'TIPO_CUARTO', icono: 'bed', activo: true },
    { id: 202, nombre: 'Cuarto compartido', valor: 'CUARTO_COMPARTIDO', tipo: 'TIPO_CUARTO', icono: 'bunk_bed', activo: true },
    { id: 203, nombre: 'Departamento', valor: 'DEPARTAMENTO', tipo: 'TIPO_CUARTO', icono: 'apartment', activo: true },
    { id: 204, nombre: 'Suite', valor: 'SUITE', tipo: 'TIPO_CUARTO', icono: 'hotel', activo: true },
  ],
  PERIODO_ALQUILER: [
    { id: 301, nombre: 'Diario', valor: 'DIARIO', tipo: 'PERIODO_ALQUILER', icono: 'today', activo: true },
    { id: 302, nombre: 'Mensual', valor: 'MENSUAL', tipo: 'PERIODO_ALQUILER', icono: 'calendar_month', activo: true },
    { id: 303, nombre: 'Semestral', valor: 'SEMESTRAL', tipo: 'PERIODO_ALQUILER', icono: 'event_repeat', activo: true },
    { id: 304, nombre: 'Anual', valor: 'ANUAL', tipo: 'PERIODO_ALQUILER', icono: 'calendar_today', activo: true },
  ],
};

export const catalogosService = {
  /**
   * Devuelve los ítems activos agrupados por tipo. Si el endpoint
   * todavía no existe, cae al catálogo por defecto.
   */
  async obtenerActivos(): Promise<CatalogosActivos> {
    try {
      const response = await api.get('catalogos/activos');
      const data = response?.data;
      if (data && typeof data === 'object') {
        return {
          SERVICIO: Array.isArray(data.SERVICIO) ? data.SERVICIO : FALLBACK.SERVICIO,
          REGLA: Array.isArray(data.REGLA) ? data.REGLA : FALLBACK.REGLA,
          TIPO_CUARTO: Array.isArray(data.TIPO_CUARTO) ? data.TIPO_CUARTO : FALLBACK.TIPO_CUARTO,
          PERIODO_ALQUILER: Array.isArray(data.PERIODO_ALQUILER)
            ? data.PERIODO_ALQUILER
            : FALLBACK.PERIODO_ALQUILER,
        };
      }
      return FALLBACK;
    } catch {
      return FALLBACK;
    }
  },
};
