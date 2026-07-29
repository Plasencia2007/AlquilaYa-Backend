'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SuccessScreen } from '@/components/shared/success-screen';
import { alertaService } from '@/services/alerta-service';

type Estado = 'cargando' | 'ok' | 'error' | 'sin-token';

function ConfirmarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [estado, setEstado] = useState<Estado>(token ? 'cargando' : 'sin-token');
  const yaEjecutado = useRef(false);

  useEffect(() => {
    if (!token || yaEjecutado.current) return;
    yaEjecutado.current = true;
    alertaService
      .confirmar(token)
      .then(() => setEstado('ok'))
      .catch(() => setEstado('error'));
  }, [token]);

  if (estado === 'cargando') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
        <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
        <p className="mt-4 text-sm text-muted-foreground">Confirmando tu alerta…</p>
      </div>
    );
  }

  if (estado === 'ok') {
    return (
      <SuccessScreen
        title="¡Alerta confirmada!"
        description="Listo. Te avisaremos por correo cada vez que se publique un cuarto que encaje con lo que buscas."
        actionLabel="Explorar cuartos"
        onAction={() => router.push('/search')}
      />
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
      <div className="mb-4 rounded-full bg-destructive/10 p-4 text-destructive">
        <XCircle className="size-12" aria-hidden />
      </div>
      <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground">
        No pudimos confirmar tu alerta
      </h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        {estado === 'sin-token'
          ? 'El enlace no es válido. Revisa que hayas abierto el enlace completo del correo de confirmación.'
          : 'Ocurrió un problema al confirmar tu alerta. Vuelve a intentarlo desde el enlace del correo.'}
      </p>
      <Button onClick={() => router.push('/')} className="mt-6 rounded-full">
        Volver al inicio
      </Button>
    </div>
  );
}

export default function ConfirmarAlertaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center text-sm text-muted-foreground animate-pulse">
          Cargando…
        </div>
      }
    >
      <ConfirmarContent />
    </Suspense>
  );
}
