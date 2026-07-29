'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { differenceInDays, isToday, isYesterday } from 'date-fns';

import { useNotifications } from '@/hooks/use-notifications';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { notificationService } from '@/services/notification-service';
import { notify } from '@/lib/notify';
import type { Notificacion } from '@/types/notificacion';

const PAGE_SIZE = 20;

export type GrupoFecha = 'Hoy' | 'Ayer' | 'Esta semana' | 'Anteriores';

const ORDEN_GRUPOS: GrupoFecha[] = ['Hoy', 'Ayer', 'Esta semana', 'Anteriores'];

export interface GrupoNotificaciones {
  grupo: GrupoFecha;
  items: Notificacion[];
}

function grupoDeFecha(fecha: string): GrupoFecha {
  const d = new Date(fecha);
  if (isToday(d)) return 'Hoy';
  if (isYesterday(d)) return 'Ayer';
  // Ya se descartaron hoy/ayer arriba, así que un diff < 7 días cae dentro
  // de "esta semana" (ventana móvil, no semana de calendario).
  if (differenceInDays(new Date(), d) < 7) return 'Esta semana';
  return 'Anteriores';
}

/** Agrupa la lista plana ya cargada en memoria — no toca la paginación. */
function agruparPorFecha(items: Notificacion[]): GrupoNotificaciones[] {
  const porGrupo = new Map<GrupoFecha, Notificacion[]>();
  for (const n of items) {
    const grupo = grupoDeFecha(n.fechaCreacion);
    const lista = porGrupo.get(grupo);
    if (lista) lista.push(n);
    else porGrupo.set(grupo, [n]);
  }
  return ORDEN_GRUPOS.filter((g) => porGrupo.has(g)).map((grupo) => ({
    grupo,
    items: porGrupo.get(grupo)!,
  }));
}

/**
 * Ítem 343: lógica de la lista de notificaciones (fetch paginado + agrupación por fecha +
 * estados de carga/error), extraída de `(private)/student/notifications/page.tsx` para que
 * `landlord/messages/notifications/page.tsx` gane la misma paridad (antes: solo el store global
 * con tope ~30, sin paginar ni agrupar). Ambas páginas llaman este hook UNA vez y le pasan el
 * resultado a `<NotificationList />` (presentacional) — evita fetches duplicados y mantiene toda
 * la lógica en un solo lugar para los dos paneles.
 *
 * El store global (`useNotifications`, compartido con la campana de la topbar/sidebar) mantiene
 * el contador de no leídas en tiempo real; la LISTA paginada vive aparte, en estado local, porque
 * el store solo conserva las primeras ~30-50 y no expone error de carga.
 */
export function useNotificationList() {
  const router = useRouter();
  const { noLeidas, marcarLeida, marcarTodasLeidas } = useNotifications();

  const [items, setItems] = useState<Notificacion[]>([]);
  const [pagina, setPagina] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState(false);

  const cargarPagina = useCallback(async (pageNum: number) => {
    const esInicial = pageNum === 0;
    if (esInicial) {
      setCargando(true);
      setError(false);
    } else {
      setCargandoMas(true);
    }
    try {
      const resultado = await notificationService.listar(pageNum, PAGE_SIZE);
      setItems((prev) => {
        if (esInicial) return resultado.content ?? [];
        const ids = new Set(prev.map((n) => n.id));
        const nuevos = (resultado.content ?? []).filter((n) => !ids.has(n.id));
        return [...prev, ...nuevos];
      });
      setHayMas(!resultado.last);
      setPagina(pageNum + 1);
    } catch (err) {
      if (esInicial) setError(true);
      else notify.error(err, 'No se pudieron cargar más notificaciones.');
    } finally {
      if (esInicial) setCargando(false);
      else setCargandoMas(false);
    }
  }, []);

  useEffect(() => {
    cargarPagina(0);
    // Solo al montar: `cargarPagina` es estable, el retry manual llama de nuevo con page 0.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useInfiniteScroll(sentinelRef, () => cargarPagina(pagina), {
    enabled: hayMas && !cargando && !cargandoMas && !error,
  });

  const onItemClick = useCallback(
    (n: Notificacion) => {
      if (!n.leida) {
        setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, leida: true } : it)));
        marcarLeida(n.id);
      }
      if (n.urlDestino) router.push(n.urlDestino);
    },
    [marcarLeida, router],
  );

  const onMarcarTodas = useCallback(() => {
    setItems((prev) => prev.map((it) => ({ ...it, leida: true })));
    marcarTodasLeidas();
  }, [marcarTodasLeidas]);

  // Se agrupa el array ya cargado en memoria en cada render — la paginación
  // (`cargarPagina`/`useInfiniteScroll`) sigue operando sobre `items` sin cambios.
  const grupos = useMemo(() => agruparPorFecha(items), [items]);

  return {
    noLeidas,
    grupos,
    cargando,
    cargandoMas,
    error,
    hayMas,
    sentinelRef,
    onItemClick,
    onMarcarTodas,
    reintentar: () => cargarPagina(0),
  };
}
