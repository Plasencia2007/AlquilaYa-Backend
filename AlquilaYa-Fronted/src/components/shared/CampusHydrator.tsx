'use client';

import { useEffect } from 'react';
import { universidadService } from '@/services/universidad-service';
import { setCampusAnchor } from '@/lib/geo';

/**
 * Hidrata el ancla de campus (lib/geo) desde el catálogo al cargar la app, una sola vez.
 * No renderiza nada. Si falla, geo.ts conserva el respaldo (UPeU), así que es no-bloqueante.
 */
export default function CampusHydrator() {
  useEffect(() => {
    let cancelado = false;
    universidadService
      .obtenerCampusPrincipal()
      .then((campus) => {
        if (cancelado || !campus) return;
        if (typeof campus.latitud === 'number' && typeof campus.longitud === 'number') {
          setCampusAnchor(campus.latitud, campus.longitud, campus.radioKm ?? undefined);
        }
      })
      .catch(() => {
        /* sin red o catalogos caído → se mantiene el respaldo */
      });
    return () => {
      cancelado = true;
    };
  }, []);

  return null;
}
