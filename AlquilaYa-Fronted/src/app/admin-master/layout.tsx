'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useHasMounted } from '@/hooks/use-has-mounted';
import { usePermisos } from '@/hooks/use-permisos';
import { useStomp } from '@/hooks/use-stomp';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { NotificationBell } from '@/components/student/notification-bell';
import { SkipLink } from '@/components/shared/skip-link';

export default function AdminMasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { estaAutenticado, usuario, cargando } = useAuth();
  const { tienePermiso, cargando: cargandoPermisos } = usePermisos();
  const router = useRouter();
  // `useHasMounted` en vez de useState+useEffect: ese setState síncrono dentro de un
  // efecto viola `react-hooks/set-state-in-effect` (mismo patrón ya usado en
  // `landlord/layout.tsx`).
  const isMounted = useHasMounted();
  // Ítem 378: conecta STOMP para que la campana de notificaciones reciba push en vivo
  // (mismo patrón que `landlord/layout.tsx` y `DashboardShell` del estudiante).
  useStomp();

  // Acceso al panel: rol base ADMIN o cualquier rol personalizado con ADMIN_PANEL (#32).
  const puedeEntrar = estaAutenticado && (usuario?.rol === 'ADMIN' || tienePermiso('ADMIN_PANEL'));

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && !puedeEntrar && !cargandoPermisos) {
        router.replace('/');
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    if (isMounted && !cargando && !cargandoPermisos && !puedeEntrar) {
      router.replace('/');
    }

    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [puedeEntrar, cargando, cargandoPermisos, isMounted, router]);

  // Bloqueo visual mientras se verifica la sesión/permisos para evitar parpadeo a intrusos.
  if (!isMounted || cargando || cargandoPermisos || !puedeEntrar) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <div className="text-center">
            <p className="text-[11px] font-black text-primary uppercase tracking-[0.3em] animate-pulse">Sincronizando Torre de Control</p>
            <p className="text-[9px] text-muted-foreground font-bold mt-2 uppercase tracking-widest">Protección Admin Activa</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/20 animate-in fade-in slide-in-from-bottom-2 duration-400 flex overflow-hidden">
      {/* Ítem 394: apunta al `<main id="contenido">` de abajo. */}
      <SkipLink href="#contenido" />
      <AdminSidebar />
      <main id="contenido" className="flex-1 pl-[248px] h-screen overflow-y-auto custom-scrollbar bg-background">
        {/* Ítem 378 (PoC, 1 de 3 eventos — ver notas de alcance): campana de notificaciones
            admin. Hoy solo cubre "documento KYC nuevo" (NotificacionService, ver
            UserApprovalEventConsumer#notificarAdmins en servicio-mensajeria); denuncia nueva
            y propiedad pendiente quedan documentadas como siguiente paso. Vive fuera del
            sidebar porque AdminSidebar no tiene una franja de header propia para montarla. */}
        <div className="sticky top-0 z-50 flex items-center justify-end border-b border-border bg-background/95 px-10 py-3 backdrop-blur lg:px-14">
          <NotificationBell verTodasHref="/admin-master/validations/providers?tab=documentos" />
        </div>
        <div className="p-10 lg:p-14 max-w-[1600px] mx-auto min-h-full flex flex-col text-foreground">
          {children}
        </div>
      </main>
    </div>
  );
}
