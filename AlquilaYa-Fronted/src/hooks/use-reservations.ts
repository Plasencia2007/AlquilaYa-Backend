'use client';

import { useCallback, useEffect, useState } from 'react';

import { reservationService } from '@/services/reservation-service';
import { notify } from '@/lib/notify';
import type { EstadoReserva, Reserva } from '@/types/reserva';

const TAMANO_PAGINA = 10;

/**
 * Lista PAGINADA de reservas del estudiante actual (ítem 234) con loading/error
 * y `cancelar` optimista. `estado` es opcional: si se pasa, el backend pagina
 * DENTRO de ese filtro (igual que las tabs de estado de la UI). Cuando `estado`
 * cambia, resetea a la página 0 y vuelve a pedir. Navegar de página con
 * `irAPagina`; refetch manual de la página actual con `refrescar()`.
 */
export function useReservations(estado?: EstadoReserva) {
  const [items, setItems] = useState<Reserva[]>([]);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [totalElementos, setTotalElementos] = useState(0);
  const [estadoCarga, setEstadoCarga] = useState<'cargando' | 'ok' | 'error'>('cargando');

  // Fetch inicial y cada vez que cambia el filtro de estado (ítem 234: paginar
  // DENTRO del filtro activo, siempre reiniciando a la página 0). Encadenado
  // inline con `.then/.catch` en vez de delegar a una función con setState,
  // para no violar react-hooks/set-state-in-effect — mismo patrón que ya usan
  // student/messages/page.tsx y roommates/page.tsx en este proyecto.
  useEffect(() => {
    let cancelado = false;
    reservationService
      .listarMiasPaginadas({ page: 0, size: TAMANO_PAGINA, estado })
      .then((data) => {
        if (cancelado) return;
        setItems(data.content);
        setPagina(data.number);
        setTotalPaginas(data.totalPages);
        setTotalElementos(data.totalElements);
        setEstadoCarga('ok');
      })
      .catch((err) => {
        if (cancelado) return;
        notify.error(err, 'No pudimos cargar tus reservas');
        setEstadoCarga('error');
      });
    return () => {
      cancelado = true;
    };
  }, [estado]);

  // Paginación manual y "reintentar": se disparan desde un click (fuera de
  // cualquier efecto), así que sí pueden reusar una función async con setState.
  const cargar = useCallback(async (paginaObjetivo: number) => {
    setEstadoCarga('cargando');
    try {
      const data = await reservationService.listarMiasPaginadas({
        page: paginaObjetivo,
        size: TAMANO_PAGINA,
        estado,
      });
      setItems(data.content);
      setPagina(data.number);
      setTotalPaginas(data.totalPages);
      setTotalElementos(data.totalElements);
      setEstadoCarga('ok');
    } catch (err) {
      notify.error(err, 'No pudimos cargar tus reservas');
      setEstadoCarga('error');
    }
  }, [estado]);

  const irAPagina = useCallback((p: number) => {
    cargar(p);
  }, [cargar]);

  const refrescar = useCallback(() => {
    cargar(pagina);
  }, [cargar, pagina]);

  const cancelar = useCallback(async (id: string, motivo?: string) => {
    try {
      const actualizada = await reservationService.cancelar(id, motivo);
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...actualizada } : r)));
      notify.success('Reserva cancelada');
      return true;
    } catch (err) {
      notify.error(err, 'No se pudo cancelar la reserva');
      return false;
    }
  }, []);

  return {
    items,
    cargando: estadoCarga === 'cargando',
    error: estadoCarga === 'error',
    pagina,
    totalPaginas,
    totalElementos,
    irAPagina,
    refrescar,
    cancelar,
  };
}
