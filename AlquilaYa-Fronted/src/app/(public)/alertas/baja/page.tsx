'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SuccessScreen } from '@/components/shared/success-screen';
import { alertaService } from '@/services/alerta-service';

type Estado = 'cargando' | 'ok' | 'error' | 'sin-token';

function BajaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [estado, setEstado] = useState<Estado>(token ? 'cargando' : 'sin-token');
  const yaEjecutado = useRef(false);

  useEffect(() => {
    if (!token || yaEjecutado.current) return;
    yaEjecutado.current = true;
    alertaService
      .darDeBaja(token)
      .then(() => setEstado('ok'))
      .catch(() => setEstado('error'));
  }, [token]);

  if (estado === 'cargando') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
        <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
        <p className="mt-4 text-sm text-muted-foreground">Procesando tu baja…</p>
      </div>
    );
  }

  if (estado === 'ok') {
    return (
      <SuccessScreen
        title="Suscripción cancelada"
        description="Ya no recibirás alertas por correo de nuevos cuartos. Puedes volver a suscribirte cuando quieras desde la página de inicio."
        actionLabel="Volver al inicio"
        onAction={() => router.push('/')}
      />
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
      <div className="mb-4 rounded-full bg-destructive/10 p-4 text-destructive">
        <XCircle className="size-12" aria-hidden />
      </div>
      <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground">
        No pudimos procesar tu baja
      </h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        {estado === 'sin-token'
          ? 'El enlace no es válido. Usa el enlace de baja que aparece al pie de nuestros correos.'
          : 'Ocurrió un problema al cancelar tu suscripción. Inténtalo de nuevo desde el enlace del correo.'}
      </p>
      <Button onClick={() => router.push('/')} className="mt-6 rounded-full">
        Volver al inicio
      </Button>
    </div>
  );
}

export default function BajaAlertaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center text-sm text-muted-foreground animate-pulse">
          Cargando…
        </div>
      }
    >
      <BajaContent />
    </Suspense>
  );
}
