'use client';

import { useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/hooks/use-auth';
import { propiedadService } from '@/services/landlord-property-service';
import { notify } from '@/lib/notify';
import {
  TODAS_LAS_PROPIEDADES,
  useLandlordPropertyFilterStore,
} from '@/stores/landlord-property-filter-store';

const QUERY_PARAM = 'propiedad';

/**
 * Ítem 344: hook que expone el selector global de propiedad del panel arrendador.
 *
 * - Estado central: `stores/landlord-property-filter-store.ts` (Zustand, sobrevive a la
 *   navegación cliente entre `finances/monthly` ↔ `finances/per-room`).
 * - Sincronizado con el query param `?propiedad=<id>` de la página ACTIVA (patrón "workspace
 *   switcher"): al montar, si la URL trae `?propiedad=` y el store no coincide, hidrata el store
 *   desde la URL; al cambiar la selección, escribe el query param de la página actual para que
 *   la URL sea compartible/recargable.
 * - Carga el catálogo de propiedades del arrendador una sola vez por `perfilId` (cacheado en el
 *   store), para que ambas páginas de finanzas reusen el mismo fetch en vez de duplicarlo.
 */
export function useLandlordPropertyFilter() {
  const { usuario } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const propiedadId = useLandlordPropertyFilterStore((s) => s.propiedadId);
  const propiedades = useLandlordPropertyFilterStore((s) => s.propiedades);
  const cargando = useLandlordPropertyFilterStore((s) => s.cargando);
  const cargadoPara = useLandlordPropertyFilterStore((s) => s.cargadoPara);
  const setPropiedadId = useLandlordPropertyFilterStore((s) => s.setPropiedadId);
  const setPropiedades = useLandlordPropertyFilterStore((s) => s.setPropiedades);
  const setCargando = useLandlordPropertyFilterStore((s) => s.setCargando);

  // Hidratar desde el query param al entrar a una página con el switcher activo. Si el usuario
  // ya trae una selección hecha en otra página del panel (store no está en el default), se
  // respeta esa — no se pisa con lo que diga la URL de esta página en particular.
  useEffect(() => {
    const fromUrl = searchParams.get(QUERY_PARAM);
    if (fromUrl && propiedadId === TODAS_LAS_PROPIEDADES) {
      setPropiedadId(fromUrl);
    }
    // Solo al montar esta página: es una hidratación única, no una suscripción continua a la URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Catálogo de propiedades del arrendador (una vez por perfilId).
  useEffect(() => {
    const perfilId = usuario?.perfilId;
    if (!perfilId) return;
    const perfilIdStr = String(perfilId);
    if (cargadoPara === perfilIdStr) return;

    let cancelado = false;
    setCargando(true);
    propiedadService
      .obtenerPorArrendador(perfilIdStr)
      .then((lista) => {
        if (cancelado) return;
        setPropiedades(
          perfilIdStr,
          lista.map((p) => ({ id: String(p.id), titulo: p.titulo })),
        );
      })
      .catch((err) => {
        if (!cancelado) notify.error(err, 'No se pudieron cargar tus propiedades');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [usuario?.perfilId, cargadoPara, setPropiedades, setCargando]);

  const cambiarPropiedad = useCallback(
    (id: string) => {
      setPropiedadId(id);
      const params = new URLSearchParams(searchParams.toString());
      if (id === TODAS_LAS_PROPIEDADES) params.delete(QUERY_PARAM);
      else params.set(QUERY_PARAM, id);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams, setPropiedadId],
  );

  return { propiedadId, propiedades, cargando, cambiarPropiedad };
}
