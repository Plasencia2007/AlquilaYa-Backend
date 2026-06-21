'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useStomp } from '@/hooks/use-stomp';
import LandlordSidebar from '@/components/landlord/landlord-sidebar';

export default function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { estaAutenticado, usuario, cargando } = useAuth();
  const router = useRouter();
  useStomp();
  const [isMounted, setIsMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Seguridad Multinivel: Si el navegador restaura la página desde caché (bfcache)
    // forzamos una verificación real.
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && (!estaAutenticado || usuario?.rol !== 'ARRENDADOR')) {
        router.replace('/');
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    if (isMounted && !cargando) {
      if (!estaAutenticado || usuario?.rol !== 'ARRENDADOR') {
        router.replace('/');
      }
    }

    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [estaAutenticado, usuario, cargando, isMounted, router]);

  // Bloqueo visual preventivo: No renderiza nada si hay dudas sobre la sesión o el rol
  if (!isMounted || cargando || !estaAutenticado || usuario?.rol !== 'ARRENDADOR') {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0b1222] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <div className="text-center">
            <p className="text-[11px] font-black text-primary uppercase tracking-[0.3em] animate-pulse">Sincronizando Torre de Control</p>
            <p className="text-[9px] text-[#64748b] font-bold mt-2 uppercase tracking-widest">Protección de Socio Activa</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-card animate-fade-in relative selection:bg-primary/20">
      <LandlordSidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />

      {/* Backdrop del drawer en móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <main className="flex-1 overflow-y-auto lg:pl-[280px]">
        {/* Barra superior solo en móvil: abre el drawer */}
        <div className="lg:hidden sticky top-0 z-50 flex items-center gap-3 h-14 px-4 border-b border-border bg-card/95 backdrop-blur">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
            className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted transition-colors"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="font-bold tracking-tight text-foreground">AlquilaYa</span>
        </div>

        <div className="max-w-[1400px] mx-auto p-6 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
