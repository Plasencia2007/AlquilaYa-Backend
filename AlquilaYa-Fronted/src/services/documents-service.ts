import Cookies from 'js-cookie';

import { api } from '@/lib/api';
import { servicioAuth } from '@/services/auth-service';
import type { Documento, TipoDocConfig, TipoDocumento } from '@/types/profile';

function obtenerMiUserId(): number | null {
  const token = Cookies.get('auth-token');
  if (!token) return null;
  const u = servicioAuth.obtenerUsuarioActualDesdeToken(token);
  const id = u?.id ? Number(u.id) : NaN;
  return Number.isFinite(id) ? id : null;
}

/**
 * Maneja documentos de verificación del usuario.
 * Endpoints backend (servicio-usuarios):
 *  - GET    /api/v1/usuarios/documentos/usuario/{usuarioId}
 *  - POST   /api/v1/usuarios/documentos/upload   (multipart)
 *  - DELETE /api/v1/usuarios/documentos/{id}     (requiere permiso GESTIONAR_DOCUMENTOS)
 */
export const documentsService = {
  obtenerTiposRequeridos: async (): Promise<TipoDocConfig[]> => {
    const { data } = await api.get<TipoDocConfig[]>('/usuarios/documentos/tipos-requeridos');
    return data;
  },

  listarMisDocumentos: async (): Promise<Documento[]> => {
    const userId = obtenerMiUserId();
    if (!userId) throw new Error('No hay sesión activa');
    const { data } = await api.get<Documento[]>(`/usuarios/documentos/usuario/${userId}`);
    return data;
  },

  subirDocumento: async (tipo: TipoDocumento, file: File): Promise<Documento> => {
    const userId = obtenerMiUserId();
    if (!userId) throw new Error('No hay sesión activa');
    const formData = new FormData();
    formData.append('usuarioId', String(userId));
    formData.append('tipo', tipo);
    formData.append('archivo', file);
    const { data } = await api.post<Documento>('/usuarios/documentos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  eliminarDocumento: async (id: number): Promise<void> => {
    await api.delete(`/usuarios/documentos/${id}`);
  },
};
