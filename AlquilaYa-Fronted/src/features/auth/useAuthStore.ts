'use client';

import { create } from 'zustand';
import Cookies from 'js-cookie';
import { Usuario, EstadoAuth } from '@/types/auth';
import { servicioAuth } from './servicioAuth';

interface AccionesAuth {
  iniciarSesion: (correo: string, contrasena: string) => Promise<Usuario | null>;
  cerrarSesion: () => void;
  inicializar: () => void;
  reiniciar: () => void;
}

const estadoInicial: EstadoAuth = {
  usuario: null,
  estaAutenticado: false,
  cargando: true,
};

export const useAuthStore = create<EstadoAuth & AccionesAuth>((set) => ({
  ...estadoInicial,

  inicializar: () => {
    const token = Cookies.get('auth-token');
    if (token) {
      const usuario = servicioAuth.obtenerUsuarioActualDesdeToken(token);
      if (usuario) {
        set({ usuario, estaAutenticado: true, cargando: false });
        return;
      }
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
      return null;
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
