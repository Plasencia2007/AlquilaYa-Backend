export type RolPerfil = 'ESTUDIANTE' | 'ARRENDADOR' | 'ADMIN';
export type EstadoUsuario = 'PENDING' | 'ACTIVE' | 'BANNED' | 'REJECTED' | 'SUSPENDED';

export interface Perfil {
  id: number;
  nombre: string;
  apellido: string;
  dni?: string;
  correo: string;
  telefono?: string;
  rol: RolPerfil;
  estado?: EstadoUsuario;
  fotoUrl?: string;
  detallesArrendador?: {
    nombreComercial?: string;
    ruc?: string;
    telefono?: string;
    direccionPropiedades?: string;
    latitud?: number;
    longitud?: number;
    esEmpresa?: boolean;
    calificacion?: number;
    /** KYC (U3): true cuando un admin aprobó sus documentos requeridos. Ítems 305/306. */
    verificado?: boolean;
  };
  detallesEstudiante?: {
    universidad?: string;
    codigoEstudiante?: string;
    carrera?: string;
    ciclo?: number;
    verificado?: boolean;
  };
}

export interface ActualizarPerfilRequest {
  nombre?: string;
  apellido?: string;
  dni?: string;
  telefono?: string;
  detallesArrendador?: {
    nombreComercial?: string;
    ruc?: string;
    telefono?: string;
    direccionCuartos?: string;
    latitud?: number;
    longitud?: number;
    esEmpresa?: boolean;
  };
  detallesEstudiante?: {
    universidad?: string;
    codigoEstudiante?: string;
    carrera?: string;
    ciclo?: number;
  };
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
