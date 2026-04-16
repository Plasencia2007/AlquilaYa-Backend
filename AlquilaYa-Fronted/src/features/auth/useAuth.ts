'use client';

import { useEffect } from 'react';
import { useAuthStore } from './useAuthStore';

export const useAuth = () => {
  const { inicializar, cargando, estaAutenticado, usuario, iniciarSesion, cerrarSesion } = useAuthStore();
  
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
    inicializar 
  };
};
