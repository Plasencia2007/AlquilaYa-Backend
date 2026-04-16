export type EstadoMensaje = 'ENVIADO' | 'ENTREGADO' | 'LEIDO';

export interface Mensaje {
  id: string;
  conversacionId: string;
  remitenteId: string;
  contenido: string;
  fecha: string;
  estado: EstadoMensaje;
}

export interface Conversacion {
  id: string;
  participantesIds: string[];
  propiedadId?: string;
  ultimoMensaje?: Mensaje;
  fechaActualizacion: string;
}
