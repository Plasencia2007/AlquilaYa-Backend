import { api } from '@/lib/api';
import type {
  PropiedadBackend,
  PropiedadCompleta,
  PropiedadImagen,
  PropiedadUpdate,
} from '@/types/propiedad';

export interface PropiedadRequest {
  titulo: string;
  descripcion: string;
  precio: number;
  direccion: string;
  arrendadorId: string;
  ubicacionGps?: string;
}

export const propiedadService = {
  /**
   * Crea una nueva propiedad con una imagen (Multipart)
   */
  async crearPropiedad(propiedad: PropiedadRequest, file: File) {
    const formData = new FormData();

    // El backend espera una parte "propiedad" como JSON string y una parte "file"
    formData.append('propiedad', JSON.stringify(propiedad));
    formData.append('file', file);

    // Sin la barra inicial '/' para que Axios use la baseURL: http://localhost:8080/api/v1
    const response = await api.post('propiedades', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Obtiene todas las propiedades (para vista general administrador)
   */
  async obtenerTodas() {
    const response = await api.get('propiedades');
    return response.data;
  },

  /**
   * Obtiene las propiedades de un arrendador específico
   */
  async obtenerPorArrendador(arrendadorId: string): Promise<PropiedadBackend[]> {
    const response = await api.get(`propiedades/arrendador/${arrendadorId}`);
    return response.data;
  },

  /**
   * Obtiene el detalle completo de la propiedad (incluye galería, servicios y reglas)
   * GET /propiedades/{id}/completo
   */
  async obtenerCompleto(id: string | number): Promise<PropiedadCompleta> {
    const response = await api.get(`propiedades/${id}/completo`);
    return response.data;
  },

  /**
   * Actualiza una propiedad. El backend espera JSON (PUT). FormData no es soportado en
   * el endpoint actual; las imágenes se gestionan vía endpoints dedicados.
   * PUT /propiedades/{id}
   */
  async actualizar(id: string | number, data: PropiedadUpdate): Promise<PropiedadBackend> {
    const response = await api.put(`propiedades/${id}`, data);
    return response.data;
  },

  /**
   * Elimina una propiedad.
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
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Elimina una imagen específica.
   * DELETE /propiedades/{id}/imagenes/{imagenId}
   */
  async eliminarImagen(propiedadId: string | number, imagenId: string | number): Promise<void> {
    await api.delete(`propiedades/${propiedadId}/imagenes/${imagenId}`);
  },
};
