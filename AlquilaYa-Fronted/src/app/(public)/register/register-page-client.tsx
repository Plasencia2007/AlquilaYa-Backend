'use client';

import { Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import {
  AUTH_MODAL_STORAGE_KEY,
  useAuthModal,
  type AuthRole,
  type RegisterStep,
} from '@/stores/auth-modal-store';
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

/**
 * Valores admitidos en `?rol=` → rol interno (`AuthRole`). Se usa la forma en
 * minúscula (`arrendador` / `estudiante`) por ser más limpia en una URL de
 * marketing (la landing /arrendadores enlaza a `/register?rol=arrendador`).
 * Cualquier otro valor —`admin`, basura o ausencia— NO está en el mapa y cae
 * al flujo normal empezando por la selección de rol. No se confía en la URL.
 */
const ROL_PARAM_MAP: Record<string, AuthRole> = {
  estudiante: 'ESTUDIANTE',
  arrendador: 'ARRENDADOR',
};

function CenteredStepper({ currentIdx }: { currentIdx: number }) {
  return (
    <div className="mb-8">
      <Stepper steps={STEPS} currentIndex={currentIdx} orientation="horizontal" />
    </div>
  );
}

function RegisterPageInner() {
  const searchParams = useSearchParams();
  const { step, setRole, setStep, open } = useAuthModal();
  const stepHeadingRef = useRef<HTMLDivElement>(null);

  // Reset del wizard al montar la página — PERO solo si no había progreso persistido
  // (ítem 177: un F5 a mitad del wizard no debe perder lo tecleado). El store persiste
  // con `skipHydration` (ver auth-modal-store.ts), así que primero se comprueba si ya
  // había algo guardado en sessionStorage ANTES de rehidratar (rehidratar sobrescribe
  // el estado en memoria, pero no borra la clave), y solo si no había nada se aplica
  // la preselección de rol por `?rol=` o el fallback a 'role'. Va en un efecto (no en
  // render) porque el store lo comparte AuthDialog: mutarlo durante el render agenda una
  // actualización de otro componente y React avisa. Llamar acciones de Zustand en un
  // efecto no infringe react-hooks/set-state-in-effect (no son setters de useState).
  useEffect(() => {
    let cancelado = false;
    const habiaProgreso =
      typeof window !== 'undefined' &&
      window.sessionStorage.getItem(AUTH_MODAL_STORAGE_KEY) !== null;

    useAuthModal.persist.rehydrate()?.then(() => {
      if (cancelado || habiaProgreso) return;
      const preRole = ROL_PARAM_MAP[searchParams.get('rol')?.toLowerCase() ?? ''];
      if (preRole) {
        // El usuario ya declaró su intención al llegar (p. ej. desde la landing
        // de arrendadores): preseleccionamos el rol y saltamos elegir rol.
        setRole(preRole);
        setStep('personal');
      } else {
        // Sin param válido → flujo normal, empezando por la selección de rol.
        setStep('role');
      }
    });
    return () => {
      cancelado = true;
    };
  }, [searchParams, setRole, setStep]);

  // Foco al heading del paso al cambiar (#189): el wizard avanza sin navegación de
  // verdad (mismo componente, `step` cambia), así que el lector de pantalla no lo
  // anuncia solo — se mueve el foco al contenedor del paso nuevo.
  useEffect(() => {
    stepHeadingRef.current?.focus();
  }, [step]);

  const currentIdx = STEP_IDX[step] ?? 0;
  const isRoleStep = step === 'role';

  return (
    <div className="flex min-h-dvh flex-col bg-background">

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
            ref={stepHeadingRef}
            tabIndex={-1}
            className="animate-in fade-in-0 slide-in-from-right-8 duration-300 outline-none"
          >
            <RegisterForm />
          </div>
        </div>
      </main>

    </div>
  );
}

export function RegisterPageClient() {
  // useSearchParams() (dentro de RegisterPageInner) obliga a un límite de
  // Suspense: sin él, el prerender de producción de Next.js aborta y el build
  // falla. El fallback replica el fondo para no provocar saltos de layout.
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <RegisterPageInner />
    </Suspense>
  );
}
