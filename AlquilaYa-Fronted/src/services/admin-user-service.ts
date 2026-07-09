import { api } from '@/lib/api';

export interface UsuarioMaster {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  correo: string;
  telefono: string;
  rol: 'ADMIN' | 'ARRENDADOR' | 'ESTUDIANTE';
  estado: 'PENDING' | 'ACTIVE' | 'BANNED' | 'REJECTED' | 'SUSPENDED';
  telefonoVerificado: boolean;
  perfilId?: number;
  // Campos del endpoint /admin/arrendadores
  fotoUrl?: string;
  fechaCreacion?: string;
  calificacion?: number;
  nombreComercial?: string;
  perfilArrendadorId?: number;
}

export interface CuentaDuplicada {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  dni: string;
  telefono?: string;
  rol: string;
  estado: 'PENDING' | 'ACTIVE' | 'BANNED' | 'REJECTED' | 'SUSPENDED';
  fechaCreacion?: string;
}

export interface ClusterDuplicado {
  criterio: 'DNI' | 'TELEFONO' | 'EMAIL';
  valor: string;
  cuentas: CuentaDuplicada[];
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

  /** Suspensión temporal (bloquea el login hasta reactivar). U4. */
  suspenderUsuario: async (id: number): Promise<UsuarioMaster> => {
    return usuarioMasterService.actualizarUsuario(id, { estado: 'SUSPENDED' });
  },

  /** Rechazar el registro/KYC (bloquea el login). U4. */
  rechazarUsuario: async (id: number): Promise<UsuarioMaster> => {
    return usuarioMasterService.actualizarUsuario(id, { estado: 'REJECTED' });
  },

  /** Grupos de cuentas duplicadas (mismo DNI/teléfono/email canónico). #8 */
  detectarDuplicados: async (): Promise<ClusterDuplicado[]> => {
    const response = await api.get<ClusterDuplicado[]>('usuarios/admin/duplicados');
    return response.data;
  },
};
