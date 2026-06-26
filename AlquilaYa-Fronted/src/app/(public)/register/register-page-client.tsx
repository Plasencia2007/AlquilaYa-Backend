'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuthModal, type RegisterStep } from '@/stores/auth-modal-store';
import { RegisterForm } from '@/components/auth/register-form';
import { cn } from '@/lib/cn';

/* ── Stepper config ── */
const STEPS: { key: RegisterStep; label: string }[] = [
  { key: 'role',     label: 'Rol' },
  { key: 'personal', label: 'Datos' },
  { key: 'details',  label: 'Detalles' },
  { key: 'result',   label: 'Listo' },
];
const STEP_IDX: Partial<Record<RegisterStep, number>> = {
  role: 0, personal: 1, details: 2, otp: 3, 'email-code': 3, result: 3,
};

function CenteredStepper({ currentIdx }: { currentIdx: number }) {
  return (
    <div className="relative mb-8 px-2">
      <div className="absolute left-[12.5%] right-[12.5%] top-5 h-0.5 bg-border" />
      <div
        className="absolute left-[12.5%] top-5 h-0.5 bg-primary transition-all duration-500"
        style={{ width: `${(currentIdx / (STEPS.length - 1)) * 75}%` }}
      />
      <div className="relative z-10 flex justify-between">
        {STEPS.map((s, i) => {
          const status = i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'pending';
          return (
            <div key={s.key} className="flex flex-col items-center gap-2">
              <div className={cn(
                'flex size-10 items-center justify-center rounded-full text-sm font-bold shadow-sm transition-all duration-300',
                status === 'done'    && 'bg-primary text-white shadow-primary/20',
                status === 'active'  && 'bg-primary text-white shadow-lg shadow-primary/25 ring-4 ring-primary/15',
                status === 'pending' && 'border border-border bg-white text-muted-foreground',
              )}>
                {status === 'done' ? <Check className="size-4" /> : i + 1}
              </div>
              <span className={cn(
                'text-[11px] font-bold uppercase tracking-wider',
                status === 'pending' ? 'text-muted-foreground/50' : 'text-primary',
              )}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RegisterPageClient() {
  const { step, setStep, open } = useAuthModal();

  useEffect(() => { setStep('role'); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentIdx = STEP_IDX[step] ?? 0;
  const isRoleStep = step === 'role';

  return (
    <div className="flex min-h-dvh flex-col bg-white dark:bg-background">

      {/* Header */}
      <header className="flex w-full items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/" className="text-xl font-black tracking-tighter text-foreground">
          Alquila<span className="text-primary">Ya</span>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <span className="hidden text-muted-foreground sm:inline">¿Ya tienes cuenta?</span>
          <Button variant="ghost" size="sm" className="font-bold text-primary hover:text-primary/80" onClick={() => open('login')}>
            Iniciar sesión
          </Button>
        </div>
      </header>

      {/* Contenido centrado */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-4">
        <div className={cn('w-full', isRoleStep ? 'max-w-2xl' : 'max-w-md')}>
          <CenteredStepper currentIdx={currentIdx} />

          <div
            key={step}
            className="animate-in fade-in-0 slide-in-from-right-8 duration-300"
          >
            <RegisterForm />
          </div>
        </div>
      </main>

    </div>
  );
}
