import { create } from 'zustand';

interface AuthModalState {
  isOpen: boolean;
  view: 'login' | 'register';
  targetRole: 'ESTUDIANTE' | 'PROVEEDOR';
  open: (view?: 'login' | 'register', role?: 'ESTUDIANTE' | 'PROVEEDOR') => void;
  close: () => void;
  toggleView: () => void;
}

export const useAuthModal = create<AuthModalState>((set) => ({
  isOpen: false,
  view: 'login',
  targetRole: 'ESTUDIANTE',
  open: (view = 'login', role = 'ESTUDIANTE') => set({ isOpen: true, view, targetRole: role }),
  close: () => set({ isOpen: false }),
  toggleView: () => set((state) => ({ 
    view: state.view === 'login' ? 'register' : 'login' 
  })),
}));
