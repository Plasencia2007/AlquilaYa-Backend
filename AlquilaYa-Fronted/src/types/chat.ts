export type EstadoMensaje = 'ENVIADO' | 'LEIDO' | 'BLOQUEADO';
export type RolEmisor = 'ESTUDIANTE' | 'ARRENDADOR';
export type EstadoConversacion = 'ACTIVA' | 'SUSPENDIDA' | 'ARCHIVADA';

export interface Mensaje {
  id: number;
  conversacionId: number;
  emisorPerfilId: number;
  emisorRol: RolEmisor;
  contenido: string;
  estado: EstadoMensaje;
  fechaEnvio: string;
  fechaLectura?: string | null;
}

export interface Conversacion {
  id: number;
  estudianteId: number;
  arrendadorId: number;
  propiedadId: number;
  estado: EstadoConversacion;
  fechaCreacion: string;
  fechaUltimaActividad: string;
  ultimoMensajePreview?: string | null;
}

export interface ConversacionResumen {
  id: number;
  contraparteId: number;
  contraparteNombre: string;
  contraparteRol: RolEmisor;
  propiedadId: number;
  propiedadTitulo: string;
  estado: EstadoConversacion;
  fechaUltimaActividad: string;
  ultimoMensajePreview?: string;
  noLeidos: number;
}

export interface CrearConversacionRequest {
  contraparteId: number;
  propiedadId: number;
}

export interface EventoLectura {
  tipo: 'MENSAJES_LEIDOS';
  conversacionId: number;
  lectorPerfilId: number;
  mensajes: number;
}

export interface EventoTyping {
  tipo: 'TYPING';
  conversacionId: number;
  emisorPerfilId: number;
  escribiendo: boolean;
}

export type EventoConversacion = EventoLectura | EventoTyping;
