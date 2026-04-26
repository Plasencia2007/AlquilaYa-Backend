import { create } from 'zustand';

export type AuthView = 'login' | 'register';
export type AuthRole = 'ESTUDIANTE' | 'ARRENDADOR';
export type RegisterStep = 'personal' | 'details' | 'otp' | 'result';

export interface PersonalData {
  nombre: string;
  apellido: string;
  dni: string;
  correo: string;
  password: string;
  telefono: string;
}

export interface StudentDetails {
  universidad: string;
  codigoEstudiante: string;
  carrera: string;
  ciclo: string;
}

export interface LandlordDetails {
  ruc: string;
  direccionCuartos: string;
  latitud: number | null;
  longitud: number | null;
}

interface AuthModalState {
  isOpen: boolean;
  view: AuthView;
  targetRole: AuthRole;
  step: RegisterStep;
  personal: PersonalData | null;
  studentDetails: StudentDetails | null;
  landlordDetails: LandlordDetails | null;
  open: (view?: AuthView, role?: AuthRole) => void;
  close: () => void;
  toggleView: () => void;
  setStep: (step: RegisterStep) => void;
  setRole: (role: AuthRole) => void;
  setPersonal: (data: PersonalData) => void;
  setStudentDetails: (data: StudentDetails) => void;
  setLandlordDetails: (data: LandlordDetails) => void;
  resetWizard: () => void;
}

export const useAuthModal = create<AuthModalState>((set) => ({
  isOpen: false,
  view: 'login',
  targetRole: 'ESTUDIANTE',
  step: 'personal',
  personal: null,
  studentDetails: null,
  landlordDetails: null,

  open: (view = 'login', role = 'ESTUDIANTE') =>
    set({ isOpen: true, view, targetRole: role, step: 'personal' }),

  close: () =>
    set({
      isOpen: false,
      step: 'personal',
      personal: null,
      studentDetails: null,
      landlordDetails: null,
    }),

  toggleView: () =>
    set((state) => ({
      view: state.view === 'login' ? 'register' : 'login',
      step: 'personal',
    })),

  setStep: (step) => set({ step }),
  setRole: (role) => set({ targetRole: role }),
  setPersonal: (data) => set({ personal: data }),
  setStudentDetails: (data) => set({ studentDetails: data }),
  setLandlordDetails: (data) => set({ landlordDetails: data }),

  resetWizard: () =>
    set({
      step: 'personal',
      personal: null,
      studentDetails: null,
      landlordDetails: null,
    }),
}));
