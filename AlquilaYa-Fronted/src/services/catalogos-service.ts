import { api } from '@/lib/api';

/**
 * Tipos válidos del catálogo dinámico expuestos por servicio-catalogos.
 * Espejo del enum `TipoItem` en el backend.
 *   - SERVICIO          : amenities/servicios incluidos en una propiedad (wifi, agua, etc.)
 *   - REGLA             : reglas de la casa (no fumar, no mascotas, etc.)
 *   - TIPO_CUARTO       : alias visual del enum TipoPropiedad
 *   - PERIODO_ALQUILER  : alias visual del enum PeriodoAlquiler
 */
export type TipoItemCatalogo = 'SERVICIO' | 'REGLA' | 'TIPO_CUARTO' | 'PERIODO_ALQUILER';

/**
 * Item individual del catálogo, tal como lo devuelve el backend
 * (`com.alquilaya.servicio_catalogos.entities.ItemCatalogo`).
 *
 * Importante: a la hora de enviar `serviciosIncluidos` o `reglas` al endpoint
 * `POST /api/v1/propiedades`, el backend persiste strings libres — usa siempre
 * `valor` (no `nombre`) para mantener consistencia de datos.
 */
export interface ItemCatalogo {
  id: number;
  nombre: string;
  valor: string;
  tipo: TipoItemCatalogo;
  icono?: string;
  descripcion?: string;
  activo: boolean;
}

/**
 * Respuesta de `GET /api/v1/catalogos/filtros/activos`.
 * Spring serializa el `Map<TipoItem, List<ItemCatalogo>>` como objeto plano
 * usando los nombres del enum como claves; cualquier tipo puede faltar si no
 * tiene items activos, por eso todos los campos son opcionales.
 */
export interface CatalogosActivos {
  SERVICIO?: ItemCatalogo[];
  REGLA?: ItemCatalogo[];
  TIPO_CUARTO?: ItemCatalogo[];
  PERIODO_ALQUILER?: ItemCatalogo[];
}

export const catalogosService = {
  /**
   * Trae todos los catálogos activos agrupados por tipo en una sola llamada.
   * Útil para hidratar el formulario de creación/edición de propiedades.
   */
  obtenerActivos: async (): Promise<CatalogosActivos> => {
    const { data } = await api.get<CatalogosActivos>('catalogos/filtros/activos');
    return data ?? {};
  },

  /**
   * Trae solo los items activos de un tipo concreto. Útil cuando ya se cargó
   * el agregado y solo se quiere refrescar una sección, o para selects aislados.
   */
  obtenerPorTipo: async (tipo: TipoItemCatalogo): Promise<ItemCatalogo[]> => {
    const { data } = await api.get<ItemCatalogo[]>(`catalogos/filtros/tipo/${tipo}`);
    return data ?? [];
  },
};
