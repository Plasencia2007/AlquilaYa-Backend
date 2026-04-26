import { create } from 'zustand';

import type { Notificacion } from '@/types/notificacion';

interface NotificationsState {
  items: Notificacion[];
  noLeidas: number;
  cargada: boolean;

  setInicial: (items: Notificacion[], noLeidas: number) => void;
  pushNueva: (notif: Notificacion) => void;
  marcarLeida: (id: number) => void;
  marcarTodasLeidas: () => void;
  reset: () => void;
}

const MAX_ITEMS = 50;

export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: [],
  noLeidas: 0,
  cargada: false,

  setInicial: (items, noLeidas) => set({ items, noLeidas, cargada: true }),

  pushNueva: (notif) =>
    set((state) => {
      // Evitar duplicados (puede llegar por WS y por refetch)
      if (state.items.some((n) => n.id === notif.id)) return state;
      const items = [notif, ...state.items].slice(0, MAX_ITEMS);
      return {
        items,
        noLeidas: state.noLeidas + (notif.leida ? 0 : 1),
      };
    }),

  marcarLeida: (id) =>
    set((state) => {
      let yaEstabaLeida = true;
      const items = state.items.map((n) => {
        if (n.id !== id) return n;
        yaEstabaLeida = n.leida;
        return { ...n, leida: true, fechaLectura: new Date().toISOString() };
      });
      return {
        items,
        noLeidas: yaEstabaLeida ? state.noLeidas : Math.max(0, state.noLeidas - 1),
      };
    }),

  marcarTodasLeidas: () =>
    set((state) => ({
      items: state.items.map((n) => ({ ...n, leida: true })),
      noLeidas: 0,
    })),

  reset: () => set({ items: [], noLeidas: 0, cargada: false }),
}));
