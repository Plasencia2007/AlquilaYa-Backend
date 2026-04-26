'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuthModal } from '@/stores/auth-modal-store';

export function ResultStep() {
  const router = useRouter();
  const { targetRole, close } = useAuthModal();

  const destino = targetRole === 'ARRENDADOR' ? '/landlord/dashboard' : '/';

  useEffect(() => {
    const timer = setTimeout(() => {
      close();
      router.push(destino);
    }, 2200);
    return () => clearTimeout(timer);
  }, [close, router, destino]);

  const handleContinue = () => {
    close();
    router.push(destino);
  };

  return (
    <div className="flex flex-col items-center space-y-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 className="size-10" aria-hidden />
      </div>

      <header className="space-y-2">
        <h2 className="font-headline text-2xl font-bold tracking-tight text-foreground">
          ¡Bienvenido a AlquilaYa!
        </h2>
        <p className="mx-auto max-w-[300px] text-sm text-muted-foreground">
          Tu cuenta se creó correctamente. Te llevamos a tu panel…
        </p>
      </header>

      <Button
        type="button"
        size="lg"
        onClick={handleContinue}
        className="h-12 w-full rounded-full text-sm font-bold tracking-wide shadow-lg shadow-primary/20"
      >
        Continuar
      </Button>
    </div>
  );
}
