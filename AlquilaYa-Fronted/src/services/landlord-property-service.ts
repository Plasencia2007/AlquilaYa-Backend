import { api } from '@/lib/api';
import type {
  CrearPropiedadRequest,
  PropiedadBackend,
  PropiedadCompleta,
  PropiedadImagen,
  PropiedadUpdate,
} from '@/types/propiedad';

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
   * Multipart con dos parts:
   *  - `propiedad`: Blob con JSON serializado y `Content-Type: application/json`
   *                 (Spring lo requiere explícito para deserializar la entidad).
   *  - `file`: imagen principal opcional. JPG/PNG/WEBP, max 10 MB.
   */
  async crearPropiedad(propiedad: CrearPropiedadRequest, file?: File | null): Promise<PropiedadBackend> {
    const formData = new FormData();
    formData.append(
      'propiedad',
      new Blob([JSON.stringify(propiedad)], { type: 'application/json' }),
    );
    if (file) {
      formData.append('file', file);
    }
    const response = await api.post<PropiedadBackend>('propiedades', formData, {
      headers: { 'Content-Type': undefined },
    });
    return response.data;
  },

  /**
   * Lista todas las propiedades disponibles.
   */
  async listarPropiedades() {
    const response = await api.get('propiedades');
    return response.data;
  },

  /**
   * Propiedades de un arrendador específico.
   */
  async obtenerPorArrendador(arrendadorId: string | number): Promise<PropiedadBackend[]> {
    const response = await api.get(`propiedades/arrendador/${arrendadorId}`);
    return response.data;
  },

  /**
   * Detalle completo (galería, servicios y reglas).
   * GET /propiedades/{id}/completo
   */
  async obtenerCompleto(id: string | number): Promise<PropiedadCompleta> {
    const response = await api.get(`propiedades/${id}/completo`);
    return response.data;
  },

  /**
   * PUT /propiedades/{id} (JSON, no multipart). Las imágenes se gestionan
   * con endpoints dedicados.
   */
  async actualizar(id: string | number, data: PropiedadUpdate): Promise<PropiedadBackend> {
    const response = await api.put(`propiedades/${id}`, data);
    return response.data;
  },

  /**
   * DELETE /propiedades/{id}
   */
  async eliminar(id: string | number): Promise<void> {
    await api.delete(`propiedades/${id}`);
  },

  /**
   * Sube imágenes adicionales a una propiedad existente.
   * POST /propiedades/{id}/imagenes (multipart, parte "files")
   */
  async subirImagenes(id: string | number, files: File[]): Promise<PropiedadImagen[]> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    const response = await api.post(`propiedades/${id}/imagenes`, formData, {
      headers: { 'Content-Type': undefined },
    });
    return response.data;
  },

  /**
   * Alias de `subirImagenes` para coherencia semántica con el flujo de creación.
   */
  async subirImagenesAdicionales(id: string | number, files: File[]): Promise<PropiedadImagen[]> {
    return this.subirImagenes(id, files);
  },

  /**
   * GET /propiedades/{id}/imagenes — lista imágenes con sus IDs reales para poder eliminarlas.
   */
  async obtenerImagenes(id: string | number): Promise<{ id: number; url: string; orden: number }[]> {
    const response = await api.get(`propiedades/${id}/imagenes`);
    return response.data;
  },

  /**
   * DELETE /propiedades/{id}/imagenes/{imagenId}
   */
  async eliminarImagen(propiedadId: string | number, imagenId: string | number): Promise<void> {
    await api.delete(`propiedades/${propiedadId}/imagenes/${imagenId}`);
  },
};
