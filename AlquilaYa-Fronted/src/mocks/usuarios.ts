import { RolUsuario, Usuario } from '@/types/auth';

export const MOCK_USUARIOS = [
  { id: '1', correo: 'estudiante@test.com', contrasena: '123456', rol: 'ESTUDIANTE' as RolUsuario, nombre: 'Carlos Estudiante' },
  { id: '2', correo: 'proveedor@test.com', contrasena: '123456', rol: 'PROVEEDOR' as RolUsuario, nombre: 'María Proveedora' },
  { id: '3', correo: 'admin@test.com', contrasena: '123456', rol: 'ADMIN' as RolUsuario, nombre: 'Admin Master' },
];
