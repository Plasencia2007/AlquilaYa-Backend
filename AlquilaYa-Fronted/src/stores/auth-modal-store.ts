import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** Clave de sessionStorage del wizard (#177) — exportada para que las páginas que lo
 *  consumen puedan saber, ANTES de rehidratar, si ya había progreso guardado. */
export const AUTH_MODAL_STORAGE_KEY = 'alquilaya-auth-modal';

export type AuthView = 'login' | 'register' | 'forgot-password';

export type AuthRole = 'ESTUDIANTE' | 'ARRENDADOR';
export type RegisterStep = 'role' | 'personal' | 'details' | 'otp' | 'email-code' | 'result';

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
  /**
   * Ruta a la que volver tras autenticar (ítem 200), capturada cuando el modal se abre
   * desde una acción protegida (o desde `/login?next=`). `null` = sin origen conocido,
   * aplica el redirect por rol de siempre.
   */
  nextUrl: string | null;
  open: (view?: AuthView, role?: AuthRole, nextUrl?: string | null) => void;
  close: () => void;
  toggleView: () => void;
  setStep: (step: RegisterStep) => void;
  setRole: (role: AuthRole) => void;
  setPersonal: (data: PersonalData) => void;
  setStudentDetails: (data: StudentDetails) => void;
  setLandlordDetails: (data: LandlordDetails) => void;
  setNextUrl: (url: string | null) => void;
  /** Consume y limpia `nextUrl` en un solo paso (evita reusarlo en un login posterior). */
  consumeNextUrl: () => string | null;
  resetWizard: () => void;
}

/**
 * Progreso del wizard de registro persistido en sessionStorage (ítem 177): un F5 en
 * cualquier paso no pierde lo tecleado. La contraseña NUNCA se persiste (se limpia en
 * `partialize`) — no tiene sentido dejarla en texto plano en sessionStorage y de todas
 * formas el usuario debe re-escribirla al continuar. `isOpen` tampoco persiste: que el
 * modal de login/forgot-password reaparezca solo tras un refresh sería una sorpresa rara;
 * el registro (que vive en una página completa, no en este modal) no depende de `isOpen`.
 */
export const useAuthModal = create<AuthModalState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      view: 'login',
      targetRole: 'ESTUDIANTE',
      step: 'personal',
      personal: null,
      studentDetails: null,
      landlordDetails: null,
      nextUrl: null,

      open: (view = 'login', role = 'ESTUDIANTE', nextUrl) =>
        set((state) => ({
          isOpen: true,
          view,
          targetRole: role,
          // Solo resetea el step si se abre el flujo de registro desde cero
          // Para login/forgot-password no tocamos el step (no rompe la página de registro en el fondo)
          step: view === 'register' ? 'personal' : state.step,
          nextUrl: nextUrl !== undefined ? nextUrl : state.nextUrl,
        })),

      close: () =>
        set({
          isOpen: false,
          step: 'role',
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
      setNextUrl: (url) => set({ nextUrl: url }),
      consumeNextUrl: () => {
        const url = get().nextUrl;
        set({ nextUrl: null });
        return url;
      },

      resetWizard: () =>
        set({
          step: 'role',
          personal: null,
          studentDetails: null,
          landlordDetails: null,
        }),
    }),
    {
      name: AUTH_MODAL_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
      partialize: (state) => ({
        view: state.view,
        targetRole: state.targetRole,
        step: state.step,
        personal: state.personal ? { ...state.personal, password: '' } : null,
        studentDetails: state.studentDetails,
        landlordDetails: state.landlordDetails,
        nextUrl: state.nextUrl,
      }),
    },
  ),
);
