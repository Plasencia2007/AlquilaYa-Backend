'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAuthModal } from '@/stores/auth-modal-store';
import { cn } from '@/lib/cn';

import { LoginForm } from './login-form';
import { ForgotPasswordForm } from './forgot-password-form';

export function AuthDialog() {
  const { isOpen, view, close } = useAuthModal();

  const isForgotPassword = view === 'forgot-password';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-[420px] rounded-3xl border-none bg-card p-0 shadow-2xl">
        <DialogTitle className="sr-only">
          {isForgotPassword ? 'Recuperar contraseña' : 'Iniciar sesión'}
        </DialogTitle>

        <div
          key={view}
          className="px-8 pb-7 pt-7 sm:px-10"
        >
          {isForgotPassword ? <ForgotPasswordForm /> : <LoginForm />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
