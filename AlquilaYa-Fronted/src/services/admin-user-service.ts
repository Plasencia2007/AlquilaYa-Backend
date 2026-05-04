import { api } from '@/lib/api';

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
  // Campos del endpoint /admin/arrendadores
  fotoUrl?: string;
  fechaCreacion?: string;
  calificacion?: number;
  nombreComercial?: string;
  perfilArrendadorId?: number;
}

export const usuarioMasterService = {
  obtenerPorRol: async (rol: string): Promise<UsuarioMaster[]> => {
    const response = await api.get<UsuarioMaster[]>(`usuarios/rol/${rol}`);
    return response.data;
  },

  obtenerArrendadoresAdmin: async (): Promise<UsuarioMaster[]> => {
    const response = await api.get<UsuarioMaster[]>('usuarios/admin/arrendadores');
    return response.data;
  },

  actualizarUsuario: async (id: number, updates: Record<string, unknown>): Promise<UsuarioMaster> => {
    const response = await api.put<UsuarioMaster>(`usuarios/${id}`, updates);
    return response.data;
  },

  eliminarUsuario: async (id: number): Promise<void> => {
    await api.delete(`usuarios/${id}`);
  },

  banearUsuario: async (id: number): Promise<UsuarioMaster> => {
    return usuarioMasterService.actualizarUsuario(id, { estado: 'BANNED' });
  },

  activarUsuario: async (id: number): Promise<UsuarioMaster> => {
    return usuarioMasterService.actualizarUsuario(id, { estado: 'ACTIVE' });
  },
};
