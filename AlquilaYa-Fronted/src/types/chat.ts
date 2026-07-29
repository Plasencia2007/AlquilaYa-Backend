export type EstadoMensaje = 'ENVIADO' | 'LEIDO' | 'BLOQUEADO';
export type RolEmisor = 'ESTUDIANTE' | 'ARRENDADOR';
export type EstadoConversacion = 'ACTIVA' | 'SUSPENDIDA' | 'ARCHIVADA';
/** ESTUDIANTE_ARRENDADOR: flujo original, anclado a una propiedad. ROOMMATE: dos estudiantes. */
export type TipoConversacion = 'ESTUDIANTE_ARRENDADOR' | 'ROOMMATE';
/** Ítem 254: tipo de contenido de un mensaje. TEXTO es el default histórico. */
export type TipoMensaje = 'TEXTO' | 'IMAGEN';
/** Ítem 261: motivo de una denuncia de conversación. */
export type MotivoReporte = 'ACOSO' | 'FRAUDE' | 'SPAM' | 'CONTENIDO_INAPROPIADO' | 'OTRO';

export interface Mensaje {
  id: number;
  conversacionId: number;
  emisorPerfilId: number;
  emisorRol: RolEmisor;
  contenido: string;
  estado: EstadoMensaje;
  fechaEnvio: string;
  fechaLectura?: string | null;
  /** Ítem 254: default 'TEXTO' si el backend aún no lo manda (mensajes viejos). */
  tipo?: TipoMensaje;
  /** Ítem 254: URL en Cloudinary cuando tipo === 'IMAGEN'. */
  urlAdjunto?: string | null;
  /**
   * Ítem 268: estado LOCAL de envío (optimistic UI), nunca viene del backend.
   * Ausente/undefined = mensaje ya confirmado por el servidor (comportamiento actual).
   */
  estadoEnvio?: 'enviando' | 'fallido';
}

export interface Conversacion {
  id: number;
  tipo: TipoConversacion;
  estudianteId: number;
  arrendadorId: number | null;
  /** Segundo estudiante; solo presente en conversaciones ROOMMATE. */
  estudiante2Id?: number | null;
  propiedadId: number | null;
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
  propiedadId: number | null;
  propiedadTitulo?: string | null;
  estado: EstadoConversacion;
  fechaUltimaActividad: string;
  ultimoMensajePreview?: string;
  noLeidos: number;
  /** Ítem 265: true si el último mensaje lo mandó el usuario actual ("Tú: …"). */
  ultimoMensajeEsMio?: boolean;
}

export interface CrearConversacionRequest {
  contraparteId: number;
  /** Obligatorio solo en ESTUDIANTE_ARRENDADOR; se omite en ROOMMATE. */
  propiedadId?: number;
  /** Por defecto ESTUDIANTE_ARRENDADOR si se omite. */
  tipo?: TipoConversacion;
}

export interface EventoLectura {
  tipo: 'MENSAJES_LEIDOS';
  conversacionId: number;
  lectorPerfilId: number;
  lectorRol: RolEmisor;
  mensajes: number;
}

export interface EventoTyping {
  tipo: 'TYPING';
  conversacionId: number;
  emisorPerfilId: number;
  emisorRol: RolEmisor;
  escribiendo: boolean;
}

export type EventoConversacion = EventoLectura | EventoTyping;
