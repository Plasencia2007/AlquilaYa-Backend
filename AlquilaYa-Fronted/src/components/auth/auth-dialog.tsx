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
      <DialogContent className={cn(
        "flex w-full flex-col gap-0 overflow-hidden border-none bg-card p-0 shadow-2xl rounded-2xl md:rounded-[1.5rem] lg:flex-row",
        isForgotPassword
          ? "max-w-[440px] h-[min(95dvh,520px)]"
          : isRegister
            ? "max-w-[420px] lg:max-w-[820px] h-[min(95dvh,780px)]"
            : "max-w-[420px] lg:max-w-[820px] h-[min(95dvh,660px)]"
      )}>
        <DialogTitle className="sr-only">
          {isRegister ? 'Crear cuenta' : isForgotPassword ? 'Recuperar contraseña' : 'Iniciar sesión'}
        </DialogTitle>

        <aside
          className={cn(
            'relative hidden overflow-hidden bg-primary text-primary-foreground lg:block lg:w-[46%] lg:flex-shrink-0',
            isRegister ? 'lg:order-1' : 'lg:order-2',
            isForgotPassword && 'lg:hidden'
          )}
        >
          {showLandlordPanel ? (
            <div className="flex h-full flex-col justify-between p-8 xl:p-10">
              <div>
                <h3 className="font-headline text-xl xl:text-2xl font-black leading-tight">
                  Haz crecer tu negocio con AlquilaYa
                </h3>

                <ul className="mt-6 space-y-4">
                  <li>
                    <p className="text-sm font-bold">Pagos garantizados</p>
                    <p className="text-xs opacity-80">Olvídate de las cobranzas manuales.</p>
                  </li>
                  <li>
                    <p className="text-sm font-bold">Control total</p>
                    <p className="text-xs opacity-80">Dashboard profesional para tus cuartos.</p>
                  </li>
                  <li>
                    <p className="text-sm font-bold">Visibilidad top</p>
                    <p className="text-xs opacity-80">Llega a miles de estudiantes verificados.</p>
                  </li>
                </ul>
              </div>

              <blockquote className="border-t border-primary-foreground/20 pt-4">
                <p className="text-xs italic opacity-80">
                  "AlquilaYa cambió la forma en que gestiono mis inmuebles."
                </p>
                <footer className="mt-2 text-[11px] font-bold opacity-90">— Carlos P., Arrendador en Lima</footer>
              </blockquote>
            </div>
          ) : (
            <>
              <Image
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 100vw"
                alt="Habitación acogedora"
                src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 z-10 p-8 xl:p-10">
                <p className="font-headline text-xl xl:text-2xl font-bold leading-tight">
                  Tu próximo hogar te está esperando
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="h-1 w-10 rounded-full bg-primary-foreground" />
                  <span className="text-xs font-medium opacity-80">Busca, elige, alquila.</span>
                </div>
              </div>
            </>
          )}
        </aside>

        <section
          className={cn(
            'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-card auth-modal-scroll lg:w-[54%]',
            isRegister ? 'lg:order-2' : 'lg:order-1',
          )}
        >
          <div className="flex min-h-full flex-col justify-center px-6 py-12 sm:px-8 sm:py-14 lg:px-9 lg:py-14 xl:px-10">
            <div key={view} className="w-full animate-fade-in">
              {isRegister ? (
                <RegisterForm />
              ) : isForgotPassword ? (
                <ForgotPasswordForm />
              ) : (
                <LoginForm />
              )}
            </div>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
