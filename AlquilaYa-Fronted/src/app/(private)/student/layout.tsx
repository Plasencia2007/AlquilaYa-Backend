'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/use-auth';
import { DashboardShell } from '@/components/student/dashboard-shell';

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
  const [validado, setValidado] = useState(false);

  useEffect(() => {
    if (cargando) return;
    if (!estaAutenticado) {
      router.replace('/');
      return;
    }
    if (usuario && usuario.rol !== 'ESTUDIANTE') {
      router.replace(usuario.rol === 'ARRENDADOR' ? '/landlord/dashboard' : '/');
      return;
    }
    setValidado(true);
  }, [usuario, estaAutenticado, cargando, router]);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  if (!validado) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
        <div className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
}
