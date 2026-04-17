import axios from 'axios';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface PropiedadRequest {
  titulo: string;
  descripcion: string;
  precio: number;
  direccion: string;
  arrendadorId: number;
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

    const response = await axios.post(`${API_GATEWAY_URL}/api/v1/propiedades`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        // El interceptor de axios debería añadir el token automáticamente,
        // pero podemos ser explícitos si es necesario.
      },
    });

    return response.data;
  },

  /**
   * Obtiene todas las propiedades (para vista general administrador)
   */
  async obtenerTodas() {
    const response = await axios.get(`${API_GATEWAY_URL}/api/v1/propiedades`);
    return response.data;
  },

  /**
   * Obtiene las propiedades de un arrendador específico
   */
  async obtenerPorArrendador(arrendadorId: number) {
    const response = await axios.get(`${API_GATEWAY_URL}/api/v1/propiedades/arrendador/${arrendadorId}`);
    return response.data;
  }
};
