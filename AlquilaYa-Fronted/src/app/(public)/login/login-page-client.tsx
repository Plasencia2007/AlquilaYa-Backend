'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { LoginForm } from '@/components/auth/login-form';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';

/**
 * Página dedicada de login (ítem 186): reusa el mismo `LoginForm` del modal (`AuthDialog`),
 * embebido directamente en una página en vez de dentro de un `Dialog` — mismo patrón que
 * `/register` ya usa para su wizard. Da una URL real para "iniciar sesión" (los deep-links
 * a rutas protegidas pueden apuntar aquí con `?next=`, ítem 200) en vez de redirigir a `/`
 * sin contexto.
 */
function LoginPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { estaAutenticado, usuario } = useAuth();
  const { setNextUrl } = useAuthModal();

  const next = searchParams.get('next');

  // Guarda el `next` en el store apenas se monta: LoginForm ya sabe consumirlo
  // (consumeNextUrl()) al redirigir tras autenticar, sin duplicar esa lógica aquí.
  useEffect(() => {
    if (next) setNextUrl(next);
  }, [next, setNextUrl]);

  // Ya logueado y llega a /login (p. ej. link viejo en favoritos) → no tiene sentido
  // mostrarle el formulario, lo mandamos directo a donde iba (o a inicio).
  useEffect(() => {
    if (estaAutenticado && usuario) {
      router.replace(next || '/');
    }
  }, [estaAutenticado, usuario, next, router]);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex w-full items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/" className="text-xl font-black tracking-tighter text-foreground">
          Alquila<span className="text-primary">Ya</span>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <span className="hidden text-muted-foreground sm:inline">¿Aún no tienes cuenta?</span>
          <Link
            href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}
            className="font-bold text-primary transition-colors hover:text-primary/80"
          >
            Regístrate
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10">
          <LoginForm />
        </div>
      </main>
    </div>
  );
}

export function LoginPageClient() {
  // useSearchParams() obliga a un límite de Suspense en el prerender de producción.
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <LoginPageInner />
    </Suspense>
  );
}
