import { api } from '@/lib/api';

export interface Permiso {
  id: number;
  rol: 'ADMIN' | 'ARRENDADOR' | 'ESTUDIANTE';
  funcionalidad: string;
  habilitado: boolean;
}

export const permisoService = {
  /**
   * Obtiene la matriz completa de permisos
   */
  obtenerTodos: async (): Promise<Permiso[]> => {
    const response = await api.get<Permiso[]>('usuarios/permisos');
    return response.data;
  },

  /**
   * Actualiza el estado de un permiso (Toggle)
   */
  actualizarEstado: async (id: number, habilitado: boolean): Promise<Permiso> => {
    const response = await api.put<Permiso>(`usuarios/permisos/${id}?habilitado=${habilitado}`);
    return response.data;
  },

  /**
   * Verifica si un rol tiene un permiso determinado (Uso interno cliente)
   */
  verificarPermiso: async (rol: string, funcionalidad: string): Promise<boolean> => {
    const response = await api.get<boolean>(`usuarios/permisos/check?rol=${rol}&funcionalidad=${funcionalidad}`);
    return response.data;
  }
};
