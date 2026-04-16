export type RolUsuario = 'ESTUDIANTE' | 'PROVEEDOR' | 'ADMIN';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  avatar?: string;
  telefono?: string;
  biografia?: string;
}

export interface PayloadJWT {
  sub: string;
  correo: string;
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
