'use client';

import Image from 'next/image';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAuthModal } from '@/stores/auth-modal-store';
import { cn } from '@/lib/cn';

import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';
import { ForgotPasswordForm } from './forgot-password-form';

export function AuthDialog() {
  const { isOpen, view, close, targetRole, step } = useAuthModal();

  const isRegister = view === 'register';
  const isForgotPassword = view === 'forgot-password';
  const showLandlordPanel = isRegister && targetRole === 'ARRENDADOR' && step !== 'result';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="grid w-full max-w-[900px] gap-0 overflow-hidden border-none bg-card p-0 shadow-2xl md:h-[620px] md:rounded-[2rem] md:grid-cols-2">
        <DialogTitle className="sr-only">
          {isRegister ? 'Crear cuenta' : isForgotPassword ? 'Recuperar contraseña' : 'Iniciar sesión'}
        </DialogTitle>

        <aside
          className={cn(
            'relative hidden overflow-hidden bg-primary text-primary-foreground md:block',
            isRegister ? 'order-1' : 'order-2',
          )}
        >
          {showLandlordPanel ? (
            <div className="flex h-full flex-col justify-center p-12">
              <h3 className="font-headline text-3xl font-black leading-tight">
                Haz crecer tu negocio con AlquilaYa
              </h3>

              <ul className="mt-10 space-y-6">
                <li>
                  <p className="text-sm font-bold">Pagos garantizados</p>
                  <p className="text-xs opacity-80">Olvídate de las cobranzas manuales.</p>
                </li>
                <li>
                  <p className="text-sm font-bold">Control total</p>
                  <p className="text-xs opacity-80">Dashboard profesional para gestionar tus cuartos.</p>
                </li>
                <li>
                  <p className="text-sm font-bold">Visibilidad top</p>
                  <p className="text-xs opacity-80">Llega a miles de estudiantes verificados.</p>
                </li>
              </ul>

              <blockquote className="mt-12 border-t border-primary-foreground/20 pt-6">
                <p className="italic opacity-80">
                  "AlquilaYa cambió la forma en que gestiono mis inmuebles. Todo es más simple."
                </p>
                <footer className="mt-2 text-xs font-bold">— Carlos P., Arrendador en Lima</footer>
              </blockquote>
            </div>
          ) : (
            <>
              <Image
                fill
                priority
                sizes="(min-width: 768px) 50vw, 100vw"
                alt="Habitación acogedora"
                src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 z-10 p-12">
                <p className="font-headline text-3xl font-bold leading-tight">
                  Tu próximo hogar te está esperando
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="h-1.5 w-12 rounded-full bg-primary-foreground" />
                  <span className="text-sm font-medium opacity-80">Busca, elige, alquila.</span>
                </div>
              </div>
            </>
          )}
        </aside>

        <section
          className={cn(
            'flex flex-col overflow-y-auto bg-card px-8 py-10 sm:px-10 md:px-12',
            isRegister ? 'order-2' : 'order-1',
          )}
        >
          <div className="my-auto">
            {isRegister ? (
              <RegisterForm />
            ) : isForgotPassword ? (
              <ForgotPasswordForm />
            ) : (
              <LoginForm />
            )}

          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
