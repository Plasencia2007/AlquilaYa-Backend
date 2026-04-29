// AGENT A WILL OVERRIDE — el Agente A está actualizando este archivo
// para incorporar todos los campos nuevos del backend. Este stub
// extiende el contrato anterior añadiendo `CrearPropiedadRequest`
// completo y manteniendo retro-compatibilidad con el resto de la app.

import { api } from '@/lib/api';
import type { CrearPropiedadRequest } from '@/types/propiedad';

// Alias compatible con el código existente.
export type PropiedadRequest = CrearPropiedadRequest;

export const propiedadService = {
  /**
   * Crea una nueva propiedad con una imagen (multipart/form-data).
   * El backend espera dos partes: `propiedad` (JSON string) y `file` (binario).
   */
  async crearPropiedad(propiedad: CrearPropiedadRequest, file?: File) {
    const formData = new FormData();
    formData.append('propiedad', JSON.stringify(propiedad));
    if (file) {
      formData.append('file', file);
    }

    const response = await api.post('propiedades', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  async obtenerTodas() {
    const response = await api.get('propiedades');
    return response.data;
  },

  async obtenerPorArrendador(arrendadorId: string | number) {
    const response = await api.get(`propiedades/arrendador/${arrendadorId}`);
    return response.data;
  },
};
