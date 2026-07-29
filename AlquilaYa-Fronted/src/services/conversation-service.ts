import { api } from '@/lib/api';
import type {
  Conversacion,
  ConversacionResumen,
  Mensaje,
  MotivoReporte,
  TipoConversacion,
} from '@/types/chat';
import type { Page } from '@/types/pagination';

const BASE = '/mensajeria/conversaciones';

export interface ArrendadorInfo {
  nombre: string;
}

// Ítem 261: respuesta del endpoint de reportar una conversación.
export interface ReporteConversacion {
  id: number;
  conversacionId: number;
  reportanteId: number;
  reportanteRol: string;
  motivo: MotivoReporte;
  descripcion?: string | null;
  estado: 'PENDIENTE' | 'REVISADO' | 'DESESTIMADO';
  fechaCreacion: string;
}

export const conversationService = {
  listarMias: async (): Promise<ConversacionResumen[]> => {
    const { data } = await api.get<ConversacionResumen[]>(BASE);
    return data;
  },

  obtener: async (id: number | string): Promise<Conversacion> => {
    const { data } = await api.get<Conversacion>(`${BASE}/${id}`);
    return data;
  },

  // Ítem 244: usada en el header del chat para mostrar el nombre del arrendador
  // (antes se llamaba inline con el cliente `api` genérico desde la página).
  obtenerInfoArrendador: async (arrendadorId: number | string): Promise<ArrendadorInfo> => {
    const { data } = await api.get<ArrendadorInfo>(`/usuarios/arrendador/${arrendadorId}/info`);
    return data;
  },

  // Usada en el header del chat de una conversación ROOMMATE, para mostrar el
  // nombre del otro estudiante (mismo endpoint que ya consume el perfil de convivencia).
  obtenerInfoEstudiante: async (estudianteId: number | string): Promise<ArrendadorInfo> => {
    const { data } = await api.get<ArrendadorInfo>(`/usuarios/estudiante/${estudianteId}/info`);
    return data;
  },

  // `propiedadId` se omite en conversaciones ROOMMATE (`tipo`), que no están
  // ancladas a una propiedad.
  crearOObtener: async (
    contraparteId: number,
    propiedadId?: number,
    tipo: TipoConversacion = 'ESTUDIANTE_ARRENDADOR',
  ): Promise<Conversacion> => {
    const { data } = await api.post<Conversacion>(BASE, {
      contraparteId,
      propiedadId,
      tipo,
    });
    return data;
  },

  listarMensajes: async (
    conversacionId: number | string,
    page = 0,
    size = 50,
  ): Promise<Page<Mensaje>> => {
    const { data } = await api.get<Page<Mensaje>>(
      `${BASE}/${conversacionId}/mensajes`,
      { params: { page, size } },
    );
    return data;
  },

  enviarMensaje: async (
    conversacionId: number | string,
    contenido: string,
  ): Promise<Mensaje> => {
    const { data } = await api.post<Mensaje>(`${BASE}/${conversacionId}/mensajes`, {
      contenido,
    });
    return data;
  },

  marcarLeida: async (conversacionId: number | string): Promise<void> => {
    await api.patch(`${BASE}/${conversacionId}/marcar-leida`);
  },

  // Soft-delete por participante: oculta la conversación solo para el caller.
  // Si la contraparte envía un mensaje nuevo, reaparece automáticamente.
  eliminar: async (conversacionId: number | string): Promise<void> => {
    await api.delete(`${BASE}/${conversacionId}`);
  },

  // Ítem 262: mismo endpoint que `eliminar` (soft-delete), expuesto con el nombre
  // correcto para la UI ("Archivar", no borrado definitivo).
  archivar: async (conversacionId: number | string): Promise<void> => {
    await api.delete(`${BASE}/${conversacionId}`);
  },

  // Ítem 262: conversaciones que el usuario actual archivó.
  listarArchivadas: async (): Promise<ConversacionResumen[]> => {
    const { data } = await api.get<ConversacionResumen[]>(`${BASE}/archivadas`);
    return data;
  },

  // Ítem 264: versión paginada de `listarMias`. Endpoint nuevo y separado — `listarMias`
  // no cambia, sigue devolviendo el array completo que ya usan los badges de no-leídos.
  listarMiasPaginadas: async (page = 0, size = 20): Promise<Page<ConversacionResumen>> => {
    const { data } = await api.get<Page<ConversacionResumen>>(`${BASE}/paginadas`, {
      params: { page, size },
    });
    return data;
  },

  // Ítem 261: reportar una conversación (acoso, fraude, spam...) para revisión admin.
  reportar: async (
    conversacionId: number | string,
    motivo: MotivoReporte,
    descripcion?: string,
  ): Promise<ReporteConversacion> => {
    const { data } = await api.post<ReporteConversacion>(
      `${BASE}/${conversacionId}/reportar`,
      { motivo, descripcion },
    );
    return data;
  },

  // Ítem 254: sube una imagen de chat al backend (que la reenvía a Cloudinary — el
  // navegador nunca sube directo, mismo patrón que propiedadService.subirImagenes).
  // Solo devuelve la URL; el mensaje se crea después con enviarImagen().
  // POST /mensajeria/conversaciones/{id}/adjuntos (multipart, parte "file")
  subirImagenChat: async (
    conversacionId: number | string,
    file: File,
  ): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<{ url: string }>(
      `${BASE}/${conversacionId}/adjuntos`,
      formData,
      { headers: { 'Content-Type': undefined } },
    );
    return data;
  },

  // Ítem 254: crea el mensaje de tipo IMAGEN una vez que subirImagenChat() ya devolvió
  // la URL subida. `contenido` se omite: el backend genera un fallback ("📷 Imagen").
  enviarImagen: async (
    conversacionId: number | string,
    urlAdjunto: string,
  ): Promise<Mensaje> => {
    const { data } = await api.post<Mensaje>(`${BASE}/${conversacionId}/mensajes`, {
      tipo: 'IMAGEN',
      urlAdjunto,
    });
    return data;
  },
};
