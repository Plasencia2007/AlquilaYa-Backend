/**
 * Tipos del perfil del usuario logueado y sus documentos de verificación.
 */

export type RolPerfil = 'ESTUDIANTE' | 'ARRENDADOR' | 'ADMIN';

export interface Perfil {
  id: number;
  nombre: string;
  apellido: string;
  dni?: string;
  correo: string;
  telefono?: string;
  rol: RolPerfil;
  fotoUrl?: string;
  direccion?: string;
  // Datos por rol (opcionales).
  detallesArrendador?: {
    nombreComercial?: string;
    calificacion?: number;
  };
  detallesEstudiante?: {
    universidad?: string;
    carrera?: string;
  };
}

export interface ActualizarPerfilRequest {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  direccion?: string;
  fotoUrl?: string;
}

export type EstadoDocumento = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export type TipoDocumento =
  | 'DNI_FRONTAL'
  | 'DNI_REVERSO'
  | 'CARNE_ESTUDIANTE'
  | 'RECIBO_LUZ';

export interface Documento {
  id: number;
  tipoDocumento: TipoDocumento;
  archivoUrl: string;
  estadoVerificacion: EstadoDocumento;
  comentarioRechazo?: string | null;
  fechaCreacion: string;
  fechaActualizacion?: string;
}

export interface TipoDocConfig {
  tipo: string;
  titulo: string;
  descripcion: string;
}
