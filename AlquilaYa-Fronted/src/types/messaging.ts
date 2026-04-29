// Re-exporta los tipos de chat para que los nuevos consumidores
// (mensajeria del arrendador) usen un namespace consistente.
export type {
  EstadoMensaje,
  RolEmisor,
  EstadoConversacion,
  Mensaje,
  Conversacion,
  ConversacionResumen,
  CrearConversacionRequest,
  EventoConversacion,
  EventoLectura,
  EventoTyping,
} from '@/types/chat';
