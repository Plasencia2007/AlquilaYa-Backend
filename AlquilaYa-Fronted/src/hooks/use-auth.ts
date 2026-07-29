'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

export const useAuth = () => {
  const {
    inicializar, cargando, estaAutenticado, usuario, iniciarSesion, cerrarSesion, registrarse, loginConGoogle,
    // Ítem 379: "Ver como usuario".
    impersonando, adminOriginal, expiraEn, iniciarImpersonacion, salirImpersonacion,
  } = useAuthStore();

  useEffect(() => {
    // Sincronización inicial estable: solo se dispara si cargando es true
    if (cargando && !estaAutenticado) {
      inicializar();
    }
  }, [inicializar, cargando, estaAutenticado]);

  return {
    usuario,
    estaAutenticado,
    cerrarSesion,
    cargando,
    iniciarSesion,
    registrarse,
    loginConGoogle,
    inicializar,
    impersonando,
    adminOriginal,
    expiraEn,
    iniciarImpersonacion,
    salirImpersonacion,
  };
};
