import { api } from '@/lib/api';
import type {
  CrearPropiedadRequest,
  PrecioTemporada,
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

/** Sugerencia de precio al publicar (estadísticas de avisos parecidos). */
export interface PrecioSugerido {
  min?: number;
  promedio?: number;
  max?: number;
  cantidad: number;
  /** "ZONA" | "UNIVERSIDAD" | "" según de dónde salieron los datos. */
  ambito: string;
}

export const propiedadService = {
  // ── Precios por temporada/ciclo ──
  async listarTemporadas(propiedadId: string | number): Promise<PrecioTemporada[]> {
    const { data } = await api.get<PrecioTemporada[]>(`propiedades/${propiedadId}/temporadas`);
    return Array.isArray(data) ? data : [];
  },

  async crearTemporada(
    propiedadId: string | number,
    body: { fechaInicio: string; fechaFin: string; precio: number; etiqueta?: string },
  ): Promise<PrecioTemporada> {
    const { data } = await api.post<PrecioTemporada>(`propiedades/${propiedadId}/temporadas`, body);
    return data;
  },

  async eliminarTemporada(propiedadId: string | number, temporadaId: number): Promise<void> {
    await api.delete(`propiedades/${propiedadId}/temporadas/${temporadaId}`);
  },

  /**
   * Precio sugerido al publicar: estadísticas de avisos aprobados parecidos
   * (zona/universidad/tipo). GET /propiedades/precio-sugerido.
   */
  async obtenerPrecioSugerido(params: {
    zonaId?: number;
    universidadId?: number;
    tipo?: string;
  }): Promise<PrecioSugerido> {
    const qs = new URLSearchParams();
    if (params.zonaId != null) qs.set('zonaId', String(params.zonaId));
    if (params.universidadId != null) qs.set('universidadId', String(params.universidadId));
    if (params.tipo) qs.set('tipo', params.tipo);
    const { data } = await api.get<PrecioSugerido>(`propiedades/precio-sugerido?${qs.toString()}`);
    return data;
  },

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
   * Confirma que el aviso sigue vigente (#49 caducidad). Renueva la fecha de confirmación
   * y limpia la marca de "requiere reconfirmación".
   * POST /propiedades/{id}/confirmar-disponibilidad
   */
  async confirmarDisponibilidad(id: string | number): Promise<PropiedadBackend> {
    const response = await api.post(`propiedades/${id}/confirmar-disponibilidad`);
    return response.data;
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
   * Agrega una imagen por URL externa (host del arrendador), sin pasar por Cloudinary.
   * POST /propiedades/{id}/imagenes/url  body: { url }. El backend valida que sea un
   * enlace directo a imagen (.jpg/.png/.webp…).
   */
  async agregarImagenPorUrl(id: string | number, url: string): Promise<PropiedadImagen> {
    const response = await api.post(`propiedades/${id}/imagenes/url`, { url });
    return response.data;
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

  /**
   * PATCH /propiedades/{id}/imagenes/reordenar
   */
  async reordenarImagenes(propiedadId: string | number, orden: number[]): Promise<void> {
    await api.patch(`propiedades/${propiedadId}/imagenes/reordenar`, { orden });
  },
};
