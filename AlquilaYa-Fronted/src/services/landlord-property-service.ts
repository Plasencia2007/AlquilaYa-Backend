import { api } from '@/lib/api';
import type { CrearPropiedadRequest } from '@/types/propiedad';

/**
 * Re-export para compatibilidad con código existente que importaba
 * `PropiedadRequest` desde este módulo. El payload completo vive en
 * `@/types/propiedad` (`CrearPropiedadRequest`).
 */
export type PropiedadRequest = CrearPropiedadRequest;

export const propiedadService = {
  /**
   * Crea una nueva propiedad vía `POST /api/v1/propiedades`.
   *
   * El endpoint es **multipart/form-data** con dos parts:
   *  - `propiedad` : Blob con JSON serializado y `Content-Type: application/json`
   *                  (Spring lo necesita explícito para deserializar a la entidad).
   *  - `file`      : la imagen principal (opcional). JPG/PNG/WEBP, max 10 MB.
   *
   * Si quieres subir más imágenes después de crear la propiedad, usa
   * `subirImagenesAdicionales(id, files)`.
   *
   * NOTA: NO seteamos manualmente el header `Content-Type: multipart/form-data`.
   * Axios/el browser lo añaden con el `boundary` correcto cuando se pasa un
   * `FormData`; forzarlo a mano rompe la deserialización del lado del backend.
   */
  async crearPropiedad(propiedad: CrearPropiedadRequest, file?: File | null) {
    const formData = new FormData();

    // El part "propiedad" debe ir como JSON con su propio Content-Type;
    // de lo contrario Spring lo trata como text/plain y la deserialización
    // a la entidad Propiedad falla con 415.
    formData.append(
      'propiedad',
      new Blob([JSON.stringify(propiedad)], { type: 'application/json' }),
    );

    if (file) {
      formData.append('file', file);
    }

    // Sin barra inicial '/' para respetar la baseURL de axios (http://.../api/v1/).
    const response = await api.post('propiedades', formData);
    return response.data;
  },

  /**
   * Sube imágenes adicionales a una propiedad ya creada.
   * Endpoint: `POST /api/v1/propiedades/{id}/imagenes` (part `files`, múltiples).
   */
  async subirImagenesAdicionales(propiedadId: number | string, files: File[]) {
    if (!files || files.length === 0) return [];
    const formData = new FormData();
    for (const f of files) {
      formData.append('files', f);
    }
    const response = await api.post(`propiedades/${propiedadId}/imagenes`, formData);
    return response.data;
  },

  /**
   * Obtiene todas las propiedades (vista general administrador).
   */
  async obtenerTodas() {
    const response = await api.get('propiedades');
    return response.data;
  },

  /**
   * Propiedades de un arrendador específico.
   */
  async obtenerPorArrendador(arrendadorId: string | number) {
    const response = await api.get(`propiedades/arrendador/${arrendadorId}`);
    return response.data;
  },
};
