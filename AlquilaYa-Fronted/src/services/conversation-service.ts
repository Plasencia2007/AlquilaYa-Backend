import { api } from '@/lib/api';
import type {
  Conversacion,
  ConversacionResumen,
  Mensaje,
} from '@/types/chat';

interface PaginaMensajes {
  content: Mensaje[];
  totalElements: number;
  number: number;
  size: number;
  last: boolean;
}

const BASE = '/mensajeria/conversaciones';

export const conversationService = {
  listarMias: async (): Promise<ConversacionResumen[]> => {
    const { data } = await api.get<ConversacionResumen[]>(BASE);
    return data;
  },

  obtener: async (id: number | string): Promise<Conversacion> => {
    const { data } = await api.get<Conversacion>(`${BASE}/${id}`);
    return data;
  },

  crearOObtener: async (
    contraparteId: number,
    propiedadId: number,
  ): Promise<Conversacion> => {
    const { data } = await api.post<Conversacion>(BASE, {
      contraparteId,
      propiedadId,
    });
    return data;
  },

  listarMensajes: async (
    conversacionId: number | string,
    page = 0,
    size = 50,
  ): Promise<PaginaMensajes> => {
    const { data } = await api.get<PaginaMensajes>(
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
};
