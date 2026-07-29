'use client';

import { create } from 'zustand';
import { Usuario, EstadoAuth } from '@/types/auth';
import { servicioAuth, type DetallesPerfilRegistro } from '@/services/auth-service';
import { impersonacionService } from '@/services/impersonacion-service';
import { parseAxiosError } from '@/lib/api-errors';
import { resetAllStores } from './reset-all-stores';

interface AccionesAuth {
  iniciarSesion: (correo: string, contrasena: string) => Promise<Usuario | null>;
  registrarse: (nombre: string, apellido: string, dni: string, correo: string, contrasena: string, rol: string, detallesPerfil: DetallesPerfilRegistro, telefono: string, turnstileToken?: string) => Promise<Usuario | null>;
  loginConGoogle: (idToken: string, rolPreferido?: string) => Promise<Usuario | null>;
  cerrarSesion: () => void;
  inicializar: () => Promise<void>;
  reiniciar: () => void;
}

/**
 * Ítem 379: "Ver como usuario". `adminOriginal` guarda al admin real mientras `usuario`
 * pasa a ser el usuario objetivo — así `salirImpersonacion` no necesita ningún roundtrip
 * (el backend restauró el cookie de sesión real, esto solo restaura la copia en memoria).
 */
interface EstadoImpersonacion {
  impersonando: boolean;
  adminOriginal: Usuario | null;
  expiraEn: number | null; // epoch ms
}

interface AccionesImpersonacion {
  iniciarImpersonacion: (usuarioId: string | number) => Promise<void>;
  salirImpersonacion: () => Promise<void>;
}

const estadoInicial: EstadoAuth & EstadoImpersonacion = {
  usuario: null,
  estaAutenticado: false,
  cargando: true,
  impersonando: false,
  adminOriginal: null,
  expiraEn: null,
};

/**
 * Limpia los demás stores si el usuario que acaba de loguearse es DISTINTO del que
 * estaba antes en memoria (ítem 187) — evita que, en un dispositivo compartido, alguien
 * inicie sesión y herede favoritos/notificaciones/historial de la cuenta anterior si el
 * logout previo no se llegó a disparar (pestaña cerrada sin cerrar sesión, por ejemplo).
 */
function resetSiUsuarioDistinto(usuarioPrevio: Usuario | null, usuarioNuevo: Usuario | null): void {
  if (usuarioPrevio && usuarioNuevo && usuarioPrevio.id !== usuarioNuevo.id) {
    resetAllStores();
  }
}

export const useAuthStore = create<EstadoAuth & AccionesAuth & EstadoImpersonacion & AccionesImpersonacion>((set, get) => ({
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
        resetSiUsuarioDistinto(get().usuario, usuario);
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

  registrarse: async (nombre: string, apellido: string, dni: string, correo: string, contrasena: string, rol: string, detallesPerfil: DetallesPerfilRegistro, telefono: string, turnstileToken?: string) => {
    set({ cargando: true });
    try {
      const usuario = await servicioAuth.registrarse(nombre, apellido, dni, correo, contrasena, rol, detallesPerfil, telefono, turnstileToken);
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
        resetSiUsuarioDistinto(get().usuario, usuario);
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
    resetAllStores();
    set({ ...estadoInicial, cargando: false });
  },

  reiniciar: () => {
    set(estadoInicial);
  },

  iniciarImpersonacion: async (usuarioId: string | number) => {
    const admin = get().usuario;
    if (!admin || admin.rol !== 'ADMIN') {
      throw new Error('Solo un administrador puede usar "Ver como usuario"');
    }
    const { usuario: objetivo, expiraEnSegundos } = await impersonacionService.iniciar(usuarioId);
    const usuarioImpersonado: Usuario = {
      id: String(objetivo.id),
      nombre: objetivo.nombre,
      correo: objetivo.correo,
      rol: objetivo.rol,
      perfilId: objetivo.perfilId ?? undefined,
    };
    // Mismo criterio que un cambio real de cuenta (`resetSiUsuarioDistinto`): favoritos,
    // notificaciones, historial, etc. del admin no deben filtrarse a la vista impersonada.
    resetAllStores();
    set({
      usuario: usuarioImpersonado,
      estaAutenticado: true,
      cargando: false,
      adminOriginal: admin,
      impersonando: true,
      expiraEn: Date.now() + expiraEnSegundos * 1000,
    });
  },

  salirImpersonacion: async () => {
    const admin = get().adminOriginal;
    try {
      await impersonacionService.salir();
    } finally {
      resetAllStores();
      set({
        usuario: admin,
        estaAutenticado: !!admin,
        cargando: false,
        adminOriginal: null,
        impersonando: false,
        expiraEn: null,
      });
    }
  },
}));
