'use client';

import { create } from 'zustand';
import { Usuario, EstadoAuth } from '@/types/auth';
import { servicioAuth } from '@/services/auth-service';
import { parseAxiosError } from '@/lib/api-errors';

interface AccionesAuth {
  iniciarSesion: (correo: string, contrasena: string) => Promise<Usuario | null>;
  registrarse: (nombre: string, apellido: string, dni: string, correo: string, contrasena: string, rol: string, detallesPerfil: any, telefono: string) => Promise<Usuario | null>;
  loginConGoogle: (idToken: string, rolPreferido?: string) => Promise<Usuario | null>;
  cerrarSesion: () => void;
  inicializar: () => Promise<void>;
  reiniciar: () => void;
}

const estadoInicial: EstadoAuth = {
  usuario: null,
  estaAutenticado: false,
  cargando: true,
};

export const useAuthStore = create<EstadoAuth & AccionesAuth>((set) => ({
  ...estadoInicial,

  // S5: el access token es httpOnly — JS no puede leerlo para saber "¿sigo logueado?". Se
  // apoya en el refresh token (también httpOnly, pero el navegador lo manda solo) llamando
  // a /auth/refresh: si hay sesión válida, el backend la renueva y devuelve los datos del
  // usuario; si no, no hay sesión (y no es un error — es el estado normal de un visitante
  // no autenticado en la carga inicial de la página).
  inicializar: async () => {
    try {
      const usuario = await servicioAuth.restaurarSesion();
      if (usuario) {
        set({ usuario, estaAutenticado: true, cargando: false });
        return;
      }
    } catch {
      // sin sesión válida — cae al estado no-autenticado abajo
    }
    set({ usuario: null, estaAutenticado: false, cargando: false });
  },

  iniciarSesion: async (correo: string, contrasena: string) => {
    set({ cargando: true });
    try {
      const usuario = await servicioAuth.iniciarSesion(correo, contrasena);
      if (usuario) {
        set({ usuario, estaAutenticado: true, cargando: false });
        return usuario;
      }
      set({ cargando: false });
      return null;
    } catch (error) {
      set({ cargando: false });
      // Propaga el mensaje formateado del backend para que el modal lo muestre
      throw new Error(parseAxiosError(error, 'Error al iniciar sesión'));
    }
  },

  registrarse: async (nombre: string, apellido: string, dni: string, correo: string, contrasena: string, rol: string, detallesPerfil: any, telefono: string) => {
    set({ cargando: true });
    try {
      const usuario = await servicioAuth.registrarse(nombre, apellido, dni, correo, contrasena, rol, detallesPerfil, telefono);
      // NO se activa la sesión aquí. El usuario debe verificar el OTP primero.
      // completarActivacion() se llama desde AuthModal tras verificar el OTP.
      set({ cargando: false });
      return usuario ?? null;
    } catch (error) {
      set({ cargando: false });
      throw new Error(parseAxiosError(error, 'No se pudo completar el registro'));
    }
  },

  loginConGoogle: async (idToken: string, rolPreferido: string = 'ESTUDIANTE') => {
    set({ cargando: true });
    try {
      const usuario = await servicioAuth.loginConGoogle(idToken, rolPreferido);
      if (usuario) {
        set({ usuario, estaAutenticado: true, cargando: false });
        return usuario;
      }
      set({ cargando: false });
      return null;
    } catch (error) {
      set({ cargando: false });
      throw new Error(parseAxiosError(error, 'Error al iniciar sesión con Google'));
    }
  },

  cerrarSesion: () => {
    servicioAuth.cerrarSesion();
    set({ ...estadoInicial, cargando: false });
  },

  reiniciar: () => {
    set(estadoInicial);
  },
}));
