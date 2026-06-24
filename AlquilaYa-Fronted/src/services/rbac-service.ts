import { api } from '@/lib/api';

/** Entrada del catálogo de funcionalidades (permisos atómicos). */
export interface Funcionalidad {
  clave: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
}

/** Rol personalizado (RBAC dinámico #32). */
export interface RolPersonalizado {
  id: number;
  nombre: string;
  descripcion?: string;
  sistema: boolean;
  funcionalidades: string[];
}

export interface RolRequest {
  nombre: string;
  descripcion?: string;
  funcionalidades: string[];
}

const BASE = '/usuarios/rbac';

export const rbacService = {
  listarFuncionalidades: async (): Promise<Funcionalidad[]> => {
    const { data } = await api.get<Funcionalidad[]>(`${BASE}/funcionalidades`);
    return data;
  },

  listarRoles: async (): Promise<RolPersonalizado[]> => {
    const { data } = await api.get<RolPersonalizado[]>(`${BASE}/roles`);
    return data;
  },

  crearRol: async (req: RolRequest): Promise<RolPersonalizado> => {
    const { data } = await api.post<RolPersonalizado>(`${BASE}/roles`, req);
    return data;
  },

  actualizarRol: async (id: number, req: RolRequest): Promise<RolPersonalizado> => {
    const { data } = await api.put<RolPersonalizado>(`${BASE}/roles/${id}`, req);
    return data;
  },

  eliminarRol: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/roles/${id}`);
  },

  rolesDeUsuario: async (usuarioId: number | string): Promise<RolPersonalizado[]> => {
    const { data } = await api.get<RolPersonalizado[]>(`${BASE}/usuarios/${usuarioId}/roles`);
    return data;
  },

  asignarRol: async (usuarioId: number | string, rolId: number): Promise<void> => {
    await api.post(`${BASE}/usuarios/${usuarioId}/roles/${rolId}`);
  },

  quitarRol: async (usuarioId: number | string, rolId: number): Promise<void> => {
    await api.delete(`${BASE}/usuarios/${usuarioId}/roles/${rolId}`);
  },

  /** Permisos efectivos del usuario autenticado (para mostrar/ocultar en el panel). */
  misPermisos: async (): Promise<string[]> => {
    const { data } = await api.get<string[]>('/usuarios/permisos/mios');
    return data;
  },
};
