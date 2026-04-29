import { api } from '@/lib/api';

// ─── Tipos: Documentos ────────────────────────────────────────────────────────

export type EstadoDocumento = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface DocumentoAdmin {
  id: number;
  usuarioId: number;
  nombreUsuario: string;
  apellidoUsuario: string;
  correoUsuario: string;
  tipoDocumento: string;
  urlDocumento: string;
  fechaSubida: string;
  estado: EstadoDocumento;
  comentario?: string;
}

export interface VerificarDocumentoPayload {
  estado: 'APROBADO' | 'RECHAZADO';
  comentario: string;
}

// ─── Tipos: Mensajería ────────────────────────────────────────────────────────

export type EstadoConversacion = 'ACTIVA' | 'SUSPENDIDA';

export interface ConversacionAdmin {
  id: number;
  propiedadId: number;
  propiedadTitulo?: string;
  participantes: { id: number; nombre: string; rol: string }[];
  estado: EstadoConversacion;
  ultimaActividad: string;
  totalMensajes?: number;
}

export interface ConversacionesPage {
  content: ConversacionAdmin[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export type EstadoMensaje = 'ACTIVO' | 'BLOQUEADO';

export interface MensajeAdmin {
  id: number;
  conversacionId: number;
  remitenteId: number;
  remitenteNombre: string;
  contenido: string;
  fechaEnvio: string;
  estado: EstadoMensaje;
  motivoBloqueo?: string;
}

export interface MensajesPage {
  content: MensajeAdmin[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface MotivoPayload {
  motivo: string;
}

// ─── Params ───────────────────────────────────────────────────────────────────

export interface GetConversacionesParams {
  page?: number;
  size?: number;
  estado?: EstadoConversacion | '';
}

export interface GetMensajesParams {
  page?: number;
  size?: number;
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

export const adminModerationService = {
  // ── Documentos ──────────────────────────────────────────────────────────────

  /**
   * Obtiene todos los documentos en estado PENDIENTE
   * GET /api/v1/usuarios/documentos/admin/pending
   */
  getDocumentosPendientes: async (): Promise<DocumentoAdmin[]> => {
    const res = await api.get<DocumentoAdmin[]>('usuarios/documentos/admin/pending');
    return Array.isArray(res.data) ? res.data : [];
  },

  /**
   * Aprueba o rechaza un documento
   * PATCH /api/v1/usuarios/documentos/admin/verify/{id}
   */
  verificarDocumento: async (
    id: number,
    estado: 'APROBADO' | 'RECHAZADO',
    comentario: string = ''
  ): Promise<DocumentoAdmin> => {
    const res = await api.patch<DocumentoAdmin>(
      `usuarios/documentos/admin/verify/${id}`,
      { estado, comentario } satisfies VerificarDocumentoPayload
    );
    return res.data;
  },

  // ── Conversaciones ───────────────────────────────────────────────────────────

  /**
   * Lista paginada de conversaciones (con filtro opcional de estado)
   * GET /api/v1/admin/mensajeria/conversaciones?page=0&size=20&estado=ACTIVA
   */
  getConversaciones: async (
    params: GetConversacionesParams = {}
  ): Promise<ConversacionesPage> => {
    const { page = 0, size = 20, estado } = params;
    const query: Record<string, string | number> = { page, size };
    if (estado) query.estado = estado;
    const res = await api.get<ConversacionesPage>(
      'admin/mensajeria/conversaciones',
      { params: query }
    );
    // Normaliza respuesta paginada o array plano
    if (Array.isArray(res.data)) {
      return {
        content: res.data as unknown as ConversacionAdmin[],
        totalElements: (res.data as unknown as ConversacionAdmin[]).length,
        totalPages: 1,
        number: 0,
        size: (res.data as unknown as ConversacionAdmin[]).length,
      };
    }
    return res.data;
  },

  /**
   * Mensajes de una conversación
   * GET /api/v1/admin/mensajeria/conversaciones/{id}/mensajes
   */
  getMensajesAdmin: async (
    convId: number,
    params: GetMensajesParams = {}
  ): Promise<MensajesPage> => {
    const { page = 0, size = 50 } = params;
    const res = await api.get<MensajesPage>(
      `admin/mensajeria/conversaciones/${convId}/mensajes`,
      { params: { page, size } }
    );
    if (Array.isArray(res.data)) {
      return {
        content: res.data as unknown as MensajeAdmin[],
        totalElements: (res.data as unknown as MensajeAdmin[]).length,
        totalPages: 1,
        number: 0,
        size: (res.data as unknown as MensajeAdmin[]).length,
      };
    }
    return res.data;
  },

  // ── Mensajes ─────────────────────────────────────────────────────────────────

  /**
   * Bloquea un mensaje
   * POST /api/v1/admin/mensajeria/mensajes/{id}/bloquear
   */
  bloquearMensaje: async (id: number, motivo: string): Promise<void> => {
    await api.post(`admin/mensajeria/mensajes/${id}/bloquear`, { motivo } satisfies MotivoPayload);
  },

  /**
   * Desbloquea un mensaje
   * POST /api/v1/admin/mensajeria/mensajes/{id}/desbloquear
   */
  desbloquearMensaje: async (id: number, motivo: string): Promise<void> => {
    await api.post(`admin/mensajeria/mensajes/${id}/desbloquear`, { motivo } satisfies MotivoPayload);
  },

  // ── Conversaciones: acciones ─────────────────────────────────────────────────

  /**
   * Suspende una conversación
   * POST /api/v1/admin/mensajeria/conversaciones/{id}/suspender
   */
  suspenderConversacion: async (id: number, motivo: string): Promise<void> => {
    await api.post(`admin/mensajeria/conversaciones/${id}/suspender`, { motivo } satisfies MotivoPayload);
  },

  /**
   * Reactiva una conversación suspendida
   * POST /api/v1/admin/mensajeria/conversaciones/{id}/reactivar
   */
  reactivarConversacion: async (id: number, motivo: string): Promise<void> => {
    await api.post(`admin/mensajeria/conversaciones/${id}/reactivar`, { motivo } satisfies MotivoPayload);
  },
};
