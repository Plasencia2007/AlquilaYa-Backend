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

  /**
   * Sube fotos propias de una habitación (multipart, vía Cloudinary en el backend).
   * Se agregan al final de `imagenes`, sin reemplazar las existentes.
   */
  subirImagenes: async (
    propiedadId: string | number,
    habitacionId: number,
    files: File[],
  ): Promise<Habitacion> => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    const { data } = await api.post<Habitacion>(
      `/propiedades/${propiedadId}/habitaciones/${habitacionId}/imagenes`,
      formData,
      { headers: { 'Content-Type': undefined } },
    );
    return data;
  },

  /** Elimina una foto de la habitación por URL (borra también en Cloudinary). */
  eliminarImagen: async (
    propiedadId: string | number,
    habitacionId: number,
    url: string,
  ): Promise<Habitacion> => {
    const { data } = await api.delete<Habitacion>(
      `/propiedades/${propiedadId}/habitaciones/${habitacionId}/imagenes`,
      { data: { url } },
    );
    return data;
  },
};
