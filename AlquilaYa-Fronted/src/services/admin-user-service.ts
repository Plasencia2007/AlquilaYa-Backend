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
  /** Motivo del baneo (solo poblado si estado === 'BANNED'); null/undefined en baneos previos
   *  a este campo o si el usuario nunca fue baneado. */
  motivoBaneo?: string | null;
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

  /** Usuarios por estado de cuenta (ítem 367, p.ej. BANNED), sin importar el rol. */
  obtenerPorEstado: async (estado: UsuarioMaster['estado']): Promise<UsuarioMaster[]> => {
    const response = await api.get<UsuarioMaster[]>(`usuarios/estado/${estado}`);
    return response.data;
  },

  /**
   * Búsqueda por texto libre (ítem 377): nombre/apellido/correo/DNI, resuelta server-side.
   * Reemplaza el filtrado en cliente que antes hacía el command palette admin sobre el listado
   * completo por rol. `limit` acota el resultado (autocompletar); el backend lo capa a 20.
   */
  buscar: async (q: string, limit = 15): Promise<UsuarioMaster[]> => {
    const response = await api.get<UsuarioMaster[]>('usuarios/admin/buscar', {
      params: { q, limit },
    });
    return response.data;
  },

  actualizarUsuario: async (id: number, updates: Record<string, unknown>): Promise<UsuarioMaster> => {
    const response = await api.put<UsuarioMaster>(`usuarios/${id}`, updates);
    return response.data;
  },

  eliminarUsuario: async (id: number): Promise<void> => {
    await api.delete(`usuarios/${id}`);
  },

  // `motivo` con default '' para no romper los call sites existentes que aún banean sin pedir
  // motivo (validations/providers, clients/duplicates — fuera del alcance de este cambio); esos
  // flujos siguen mostrando "No especificado" en el panel de baneos activos, igual que antes.
  banearUsuario: async (id: number, motivo: string = ''): Promise<UsuarioMaster> => {
    return usuarioMasterService.actualizarUsuario(id, { estado: 'BANNED', motivo });
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

  /**
   * Ítem 386: registros de usuarios agrupados por semana, para la gráfica de crecimiento del
   * dashboard de métricas (`metrics/page.tsx`). `desde`/`hasta` en formato `YYYY-MM-DD`;
   * por defecto el backend usa las últimas 12 semanas.
   */
  obtenerRegistrosPorSemana: async (desde?: string, hasta?: string): Promise<RegistroSemanal[]> => {
    const params: Record<string, string> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    const response = await api.get<RegistroSemanal[]>('usuarios/admin/metricas/registros', { params });
    return Array.isArray(response.data) ? response.data : [];
  },
};

/** Ítem 386: conteo de registros de una semana (el lunes de esa semana ISO, `YYYY-MM-DD`). */
export interface RegistroSemanal {
  semana: string;
  total: number;
}
