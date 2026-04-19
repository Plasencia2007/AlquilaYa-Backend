import { api } from '@/utils/api';

export interface UsuarioMaster {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  correo: string;
  telefono: string;
  rol: 'ADMIN' | 'ARRENDADOR' | 'ESTUDIANTE';
  estado: 'PENDING' | 'ACTIVE' | 'BANNED';
  telefonoVerificado: boolean;
  perfilId?: number;
}

export const usuarioMasterService = {
  /**
   * Obtiene usuarios por rol
   */
  obtenerPorRol: async (rol: string): Promise<UsuarioMaster[]> => {
    const response = await api.get<UsuarioMaster[]>(`usuarios/rol/${rol}`);
    return response.data;
  },

  /**
   * Actualiza el estado o datos de un usuario (Deep Update)
   */
  actualizarUsuario: async (id: number, updates: any): Promise<UsuarioMaster> => {
    const response = await api.put<UsuarioMaster>(`usuarios/${id}`, updates);
    return response.data;
  },

  /**
   * Elimina un usuario definitivamente
   */
  eliminarUsuario: async (id: number): Promise<void> => {
    await api.delete(`usuarios/${id}`);
  },

  /**
   * Banear usuario (Atajo funcional)
   */
  banearUsuario: async (id: number): Promise<UsuarioMaster> => {
    return usuarioMasterService.actualizarUsuario(id, { estado: 'BANNED' });
  },

  /**
   * Activar usuario (Atajo funcional)
   */
  activarUsuario: async (id: number): Promise<UsuarioMaster> => {
    return usuarioMasterService.actualizarUsuario(id, { estado: 'ACTIVE' });
  }
};
