'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

export const useAuth = () => {
  const { inicializar, cargando, estaAutenticado, usuario, iniciarSesion, cerrarSesion, registrarse, loginConGoogle } = useAuthStore();
  
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
    inicializar 
  };
};
