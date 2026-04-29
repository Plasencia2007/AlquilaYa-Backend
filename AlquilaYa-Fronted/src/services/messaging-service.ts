import { conversationService } from '@/services/conversation-service';
import type { Conversacion, ConversacionResumen, Mensaje } from '@/types/messaging';

/**
 * Wrapper con la nomenclatura solicitada por las páginas de mensajería del
 * arrendador. Reusa `conversationService` para no duplicar lógica HTTP.
 *
 * Endpoints backend:
 *  - GET    /api/v1/mensajeria/conversaciones            -> listarConversaciones
 *  - GET    /api/v1/mensajeria/conversaciones/{id}/mensajes
 *  - POST   /api/v1/mensajeria/conversaciones/{id}/mensajes
 *  - PATCH  /api/v1/mensajeria/conversaciones/{id}/marcar-leida
 */
export const messagingService = {
  listarConversaciones: (): Promise<ConversacionResumen[]> =>
    conversationService.listarMias(),

  obtenerConversacion: (id: number | string): Promise<Conversacion> =>
    conversationService.obtener(id),

  obtenerMensajes: async (conversacionId: number | string): Promise<Mensaje[]> => {
    const pagina = await conversationService.listarMensajes(conversacionId, 0, 100);
    // El backend pagina el resultado; aquí queremos el array plano.
    return pagina.content ?? [];
  },

  enviarMensaje: (conversacionId: number | string, contenido: string): Promise<Mensaje> =>
    conversationService.enviarMensaje(conversacionId, contenido),

  marcarLeido: (conversacionId: number | string): Promise<void> =>
    conversationService.marcarLeida(conversacionId),
};
