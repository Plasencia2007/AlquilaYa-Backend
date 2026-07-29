import { create } from 'zustand';

interface UnreadMessagesState {
  total: number;
  /** Ítem 266: desglose de no-leídos por conversación (los eventos STOMP ya traen el id). */
  porConversacion: Record<number, number>;
  setTotal: (n: number) => void;
  setPorConversacion: (map: Record<number, number>) => void;
  /** Suma 1 al contador de esa conversación y al total. */
  incrementar: (conversacionId: number) => void;
  /** Pone en 0 el contador de esa conversación y resta esa cantidad del total. */
  marcarLeida: (conversacionId: number) => void;
  reset: () => void;
}

export const useUnreadMessagesStore = create<UnreadMessagesState>((set) => ({
  total: 0,
  porConversacion: {},
  setTotal: (total) => set({ total }),
  setPorConversacion: (porConversacion) => set({ porConversacion }),
  incrementar: (conversacionId) =>
    set((state) => ({
      total: state.total + 1,
      porConversacion: {
        ...state.porConversacion,
        [conversacionId]: (state.porConversacion[conversacionId] ?? 0) + 1,
      },
    })),
  marcarLeida: (conversacionId) =>
    set((state) => {
      const actual = state.porConversacion[conversacionId] ?? 0;
      if (actual === 0) return state;
      const porConversacion = { ...state.porConversacion };
      delete porConversacion[conversacionId];
      return {
        total: Math.max(0, state.total - actual),
        porConversacion,
      };
    }),
  reset: () => set({ total: 0, porConversacion: {} }),
}));
