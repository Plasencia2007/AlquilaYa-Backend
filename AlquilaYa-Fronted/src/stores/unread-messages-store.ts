import { create } from 'zustand';

interface UnreadMessagesState {
  total: number;
  setTotal: (n: number) => void;
}

export const useUnreadMessagesStore = create<UnreadMessagesState>((set) => ({
  total: 0,
  setTotal: (total) => set({ total }),
}));
