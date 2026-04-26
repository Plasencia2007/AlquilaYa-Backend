'use client';

import { useCallback, useEffect, useState } from 'react';

import { reservationService } from '@/services/reservation-service';
import { notify } from '@/lib/notify';
import type { Reserva } from '@/types/reserva';

/**
 * Lista de reservas del estudiante actual con loading/error y `cancelar` optimista.
 * Refetch manual con `refrescar()`.
 */
export function useReservations() {
  const [items, setItems] = useState<Reserva[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  const cargar = useCallback(async () => {
    setEstado('cargando');
    try {
      const data = await reservationService.listarMias();
      setItems(data);
      setEstado('ok');
    } catch (err) {
      notify.error(err, 'No pudimos cargar tus reservas');
      setEstado('error');
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cancelar = useCallback(async (id: string) => {
    try {
      const actualizada = await reservationService.cancelar(id);
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
    cargando: estado === 'cargando',
    error: estado === 'error',
    refrescar: cargar,
    cancelar,
  };
}
