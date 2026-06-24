'use client';

import { useEffect, useState } from 'react';
import { rbacService } from '@/services/rbac-service';

// Caché a nivel de módulo: los permisos efectivos no cambian dentro de una sesión salvo
// que un admin reasigne roles. Se evita refetch en cada componente.
let cache: string[] | null = null;
let inflight: Promise<string[]> | null = null;

/** Limpia la caché (llamar al cerrar sesión / cambiar de usuario). */
export function resetPermisosCache() {
  cache = null;
  inflight = null;
}

/**
 * Permisos efectivos del usuario actual (rol base ∪ roles personalizados, #32).
 * `tienePermiso(clave)` para mostrar/ocultar acciones del panel.
 */
export function usePermisos() {
  const [permisos, setPermisos] = useState<string[] | null>(cache);
  const [cargando, setCargando] = useState(cache === null);

  useEffect(() => {
    if (cache) {
      setPermisos(cache);
      setCargando(false);
      return;
    }
    if (!inflight) {
      inflight = rbacService
        .misPermisos()
        .then((p) => {
          cache = p;
          return p;
        })
        .catch(() => [] as string[]);
    }
    let activo = true;
    inflight.then((p) => {
      if (activo) {
        setPermisos(p);
        setCargando(false);
      }
    });
    return () => {
      activo = false;
    };
  }, []);

  return {
    permisos: permisos ?? [],
    cargando,
    tienePermiso: (clave: string) => !!permisos?.includes(clave),
  };
}
