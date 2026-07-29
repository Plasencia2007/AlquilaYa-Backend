'use client';

import { useEffect, useRef } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useAuthModal } from '@/stores/auth-modal-store';

import { LoginForm } from './login-form';
import { ForgotPasswordForm } from './forgot-password-form';

const TITULOS = {
  login: { title: 'Iniciar sesión', description: 'Ingresa con tu correo o con Google para continuar.' },
  'forgot-password': {
    title: 'Recuperar contraseña',
    description: 'Escribe tu correo y te enviaremos un enlace para restablecerla.',
  },
} as const;

export function AuthDialog() {
  const { isOpen, view, close } = useAuthModal();
  const headingRef = useRef<HTMLDivElement>(null);

  // El store persiste con `skipHydration` (evita mismatch SSR/CSR — ver auth-modal-store.ts);
  // este es el único punto de montaje global del modal, así que rehidrata aquí.
  useEffect(() => {
    useAuthModal.persist.rehydrate();
  }, []);

  // Foco al heading al cambiar de vista (#189): login ↔ forgot-password. El wizard de
  // registro (pasos rol/personal/detalles/otp) vive en /register, no en este modal — su
  // manejo de foco está en register-page-client.tsx.
  useEffect(() => {
    if (isOpen) headingRef.current?.focus();
  }, [isOpen, view]);

  const isForgotPassword = view === 'forgot-password';
  const { title, description } = TITULOS[isForgotPassword ? 'forgot-password' : 'login'];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-[420px] rounded-3xl border-none bg-card p-0 shadow-2xl">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>

        <div
          key={view}
          ref={headingRef}
          tabIndex={-1}
          className="px-8 pb-7 pt-7 outline-none sm:px-10"
        >
          {isForgotPassword ? <ForgotPasswordForm /> : <LoginForm />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
