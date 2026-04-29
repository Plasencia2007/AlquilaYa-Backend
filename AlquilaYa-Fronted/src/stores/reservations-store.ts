'use client';

import { create } from 'zustand';
import type { EstadoReserva, FiltroEstadoReserva, Reserva } from '@/types/reserva';
import { reservationService } from '@/services/reservation-service';
import { parseAxiosError } from '@/lib/api-errors';
import { notify } from '@/lib/notify';

interface EstadoReservasArrendador {
  reservas: Reserva[];
  loading: boolean;
  error: string | null;
  filtroEstado: FiltroEstadoReserva;
}

interface AccionesReservas {
  cargar: (estado?: EstadoReserva) => Promise<void>;
  aprobar: (id: string) => Promise<boolean>;
  rechazar: (id: string, motivo?: string) => Promise<boolean>;
  finalizar: (id: string) => Promise<boolean>;
  setFiltro: (estado: FiltroEstadoReserva) => void;
  reset: () => void;
}

const estadoInicial: EstadoReservasArrendador = {
  reservas: [],
  loading: false,
  error: null,
  filtroEstado: 'TODAS',
};

/**
 * Aplica un cambio de estado optimista al arreglo de reservas y
 * regresa el snapshot anterior (para revertir en caso de error).
 */
function actualizarEstadoOptimista(
  reservas: Reserva[],
  id: string,
  parche: Partial<Reserva>,
): { siguiente: Reserva[]; previa: Reserva | undefined } {
  const previa = reservas.find((r) => r.id === id);
  const siguiente = reservas.map((r) => (r.id === id ? { ...r, ...parche } : r));
  return { siguiente, previa };
}

export const useReservationsStore = create<
  EstadoReservasArrendador & AccionesReservas
>((set, get) => ({
  ...estadoInicial,

  cargar: async (estado) => {
    set({ loading: true, error: null });
    try {
      const data = await reservationService.listarComoArrendador(estado);
      set({
        reservas: data,
        loading: false,
        filtroEstado: estado ?? 'TODAS',
      });
    } catch (err) {
      set({
        loading: false,
        error: parseAxiosError(err, 'No se pudieron cargar las reservas'),
      });
    }
  },

  setFiltro: (estado) => set({ filtroEstado: estado }),

  aprobar: async (id) => {
    const { reservas } = get();
    const { siguiente, previa } = actualizarEstadoOptimista(reservas, id, {
      estado: 'APROBADA',
    });
    if (!previa) return false;
    set({ reservas: siguiente });
    try {
      const actualizada = await reservationService.aprobar(id);
      set((state) => ({
        reservas: state.reservas.map((r) => (r.id === id ? actualizada : r)),
      }));
      notify.success('Reserva aprobada', 'El estudiante recibirá una notificación.');
      return true;
    } catch (err) {
      // revertir
      set((state) => ({
        reservas: state.reservas.map((r) => (r.id === id ? previa : r)),
      }));
      notify.error(err, 'No se pudo aprobar la reserva');
      return false;
    }
  },

  rechazar: async (id, motivo) => {
    const { reservas } = get();
    const { siguiente, previa } = actualizarEstadoOptimista(reservas, id, {
      estado: 'RECHAZADA',
      motivoRechazo: motivo,
    });
    if (!previa) return false;
    set({ reservas: siguiente });
    try {
      const actualizada = await reservationService.rechazar(id, motivo);
      set((state) => ({
        reservas: state.reservas.map((r) => (r.id === id ? actualizada : r)),
      }));
      notify.success('Reserva rechazada', 'Se notificó al estudiante con el motivo.');
      return true;
    } catch (err) {
      set((state) => ({
        reservas: state.reservas.map((r) => (r.id === id ? previa : r)),
      }));
      notify.error(err, 'No se pudo rechazar la reserva');
      return false;
    }
  },

  finalizar: async (id) => {
    const { reservas } = get();
    const { siguiente, previa } = actualizarEstadoOptimista(reservas, id, {
      estado: 'FINALIZADA',
    });
    if (!previa) return false;
    set({ reservas: siguiente });
    try {
      const actualizada = await reservationService.finalizar(id);
      set((state) => ({
        reservas: state.reservas.map((r) => (r.id === id ? actualizada : r)),
      }));
      notify.success('Reserva finalizada', 'La estancia quedó cerrada en el sistema.');
      return true;
    } catch (err) {
      set((state) => ({
        reservas: state.reservas.map((r) => (r.id === id ? previa : r)),
      }));
      notify.error(err, 'No se pudo finalizar la reserva');
      return false;
    }
  },

  reset: () => set(estadoInicial),
}));
