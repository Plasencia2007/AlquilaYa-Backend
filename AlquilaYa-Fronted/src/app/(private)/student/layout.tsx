'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/use-auth';
import { useHasMounted } from '@/hooks/use-has-mounted';
import { DashboardShell } from '@/components/student/dashboard-shell';
import { ClientChrome } from '@/components/student/client-chrome';
import { FullScreenLoader } from '@/components/shared/full-screen-loader';
import { SkipLink } from '@/components/shared/skip-link';

/**
 * Layout privado del estudiante:
 *  - Verifica rol === ESTUDIANTE; si no, redirige a `/`.
 *  - Pantalla de carga mientras valida la sesión.
 *  - Defensa contra bfcache: si el navegador restaura desde el back/forward
 *    cache después de un logout, revalidamos.
 */
export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { usuario, estaAutenticado, cargando } = useAuth();
  const isMounted = useHasMounted();

  useEffect(() => {
    if (cargando) return;
    if (!estaAutenticado) {
      router.replace('/');
      return;
    }
    if (usuario && usuario.rol !== 'ESTUDIANTE') {
      router.replace(usuario.rol === 'ARRENDADOR' ? '/landlord/dashboard' : '/');
    }
  }, [usuario, estaAutenticado, cargando, router]);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const validado = isMounted && !cargando && estaAutenticado && usuario?.rol === 'ESTUDIANTE';

  if (!validado) {
    return <FullScreenLoader />;
  }

  return (
    <>
      {/* Ítem 394: apunta al `<main id="contenido">` de DashboardShell. */}
      <SkipLink href="#contenido" />
      <DashboardShell>{children}</DashboardShell>
      <ClientChrome />
    </>
  );
}
