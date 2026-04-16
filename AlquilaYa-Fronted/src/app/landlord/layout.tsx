'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import LandlordSidebar from '@/features/landlord/components/LandlordSidebar';

export default function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { estaAutenticado, usuario, cargando } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Seguridad Multinivel: Si el navegador restaura la página desde caché (bfcache)
    // forzamos una verificación real.
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && (!estaAutenticado || usuario?.rol !== 'PROVEEDOR')) {
        router.replace('/');
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    if (isMounted && !cargando) {
      if (!estaAutenticado || usuario?.rol !== 'PROVEEDOR') {
        router.replace('/');
      }
    }

    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [estaAutenticado, usuario, cargando, isMounted, router]);

  // Bloqueo visual preventivo: No renderiza nada si hay dudas sobre la sesión o el rol
  if (!isMounted || cargando || !estaAutenticado || usuario?.rol !== 'PROVEEDOR') {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0b1222] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="text-center">
            <p className="text-[11px] font-black text-blue-400 uppercase tracking-[0.3em] animate-pulse">Sincronizando Torre de Control</p>
            <p className="text-[9px] text-[#64748b] font-bold mt-2 uppercase tracking-widest">Protección de Socio Activa</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface-container-lowest animate-fade-in relative selection:bg-blue-500/20">
      <LandlordSidebar />
      <main className="flex-1 overflow-y-auto pl-[280px]">
        <div className="max-w-[1400px] mx-auto p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
