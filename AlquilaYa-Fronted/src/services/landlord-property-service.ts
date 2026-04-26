import { api } from '@/lib/api';

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
  async obtenerPorArrendador(arrendadorId: string) {
    const response = await api.get(`propiedades/arrendador/${arrendadorId}`);
    return response.data;
  }
};
