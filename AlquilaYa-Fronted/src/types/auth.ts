export type RolUsuario = 'ESTUDIANTE' | 'ARRENDADOR' | 'ADMIN';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  perfilId?: number; // El ID de Arrendador o Estudiante
  avatar?: string;
  telefono?: string;
  biografia?: string;
  /** Correo confirmado vía link de verificación (o Google). #3 */
  emailVerificado?: boolean;
}

export interface PayloadJWT {
  sub: string;
  userId: string;
  perfilId?: number;
  nombre: string;
  rol: RolUsuario;
  iat: number;
  exp: number;
}

export interface EstadoAuth {
  usuario: Usuario | null;
  estaAutenticado: boolean;
  cargando: boolean;
}
