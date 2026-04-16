import { create } from 'zustand';

interface AuthModalState {
  isOpen: boolean;
  view: 'login' | 'register';
  open: (view?: 'login' | 'register') => void;
  close: () => void;
  toggleView: () => void;
}

export const useAuthModal = create<AuthModalState>((set) => ({
  isOpen: false,
  view: 'login',
  open: (view = 'login') => set({ isOpen: true, view }),
  close: () => set({ isOpen: false }),
  toggleView: () => set((state) => ({ 
    view: state.view === 'login' ? 'register' : 'login' 
  })),
}));
