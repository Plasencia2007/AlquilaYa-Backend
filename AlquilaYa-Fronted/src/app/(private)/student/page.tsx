'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bell, ClipboardList, Heart, MessageCircle } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useVerificationStatus } from '@/hooks/use-verification-status';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useNotificationsStore } from '@/stores/notifications-store';
import { servicioPropiedades } from '@/services/property-service';
import { reservationService } from '@/services/reservation-service';
import { distanciaAUpeuKm } from '@/lib/geo';
import { PropertyCarousel } from '@/components/student/property-carousel';
import { StatCard } from '@/components/student/stat-card';
import { OnboardingBanner, type OnboardingPaso } from '@/components/student/onboarding-banner';
import { Skeleton } from '@/components/ui/skeleton';
import type { Propiedad } from '@/types/propiedad';
import type { Reserva } from '@/types/reserva';

export default function StudentDashboardPage() {
  const { usuario } = useAuth();
  const { verificado } = useVerificationStatus();
  const totalFavoritos  = useFavoritesStore((s) => s.ids.size);
  const noLeidasNotif   = useNotificationsStore((s) => s.noLeidas);

  const [reservas,              setReservas]              = useState<Reserva[]>([]);
  const [destacados,            setDestacados]            = useState<Propiedad[]>([]);
  const [cargandoSugerencias,   setCargandoSugerencias]   = useState(true);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      reservationService.listarMias().catch(() => [] as Reserva[]),
      servicioPropiedades.obtenerDestacadas(8),
    ]).then(([rs, props]) => {
      if (cancelado) return;
      setReservas(rs);
      setDestacados(props);
      setCargandoSugerencias(false);
    });
    return () => { cancelado = true; };
  }, []);

  const reservasActivas = useMemo(
    () => reservas.filter((r) => ['SOLICITADA', 'APROBADA', 'PAGADA'].includes(r.estado)).length,
    [reservas],
  );

  const cuartosCerca = useMemo(
    () => destacados.filter((p) => {
      const d = distanciaAUpeuKm(p.coordenadas);
      return d !== null && d <= 5;
    }).length,
    [destacados],
  );

  const onboardingPasos: OnboardingPaso[] = [
    {
      id:          'verificacion',
      titulo:      'Verifica tu identidad',
      descripcion: 'Sube las dos caras de tu DNI para mayor seguridad.',
      href:        '/student/profile?tab=verificacion',
      completado:  verificado,
    },
    {
      id:          'favoritos',
      titulo:      'Guarda 3 cuartos',
      descripcion: 'Marca con corazón los que más te gusten para comparar.',
      href:        '/search',
      completado:  totalFavoritos >= 3,
    },
    {
      id:          'reserva',
      titulo:      'Solicita una visita',
      descripcion: 'Reserva el cuarto que te interese para conocerlo.',
      href:        '/search',
      completado:  reservas.length > 0,
    },
  ];

  const primerNombre = (usuario?.nombre ?? '').split(' ')[0];

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-10 md:px-10 md:py-12">

      {/* ── Saludo ── */}
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Tu panel</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          Hola, {primerNombre} <span className="inline-block animate-[wave_1.5s_ease-in-out_1]">👋</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Aquí tienes lo que pasa con tus cuartos y reservas hoy.
        </p>
      </header>

      {/* ── Onboarding ── */}
      <OnboardingBanner pasos={onboardingPasos} />

      {/* ── Stats ── */}
      <section aria-label="Resumen" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Heart}         label="Favoritos"       value={totalFavoritos}  href="/student/favorites"    accent="primary" />
        <StatCard icon={ClipboardList} label="Reservas activas" value={reservasActivas} href="/student/reservations" accent="blue"    />
        <StatCard icon={MessageCircle} label="Mensajes"         value={noLeidasNotif}  href="/student/messages"     accent="emerald" />
        <StatCard icon={Bell}          label="Notificaciones"   value={noLeidasNotif}  href="/student/notifications" accent="amber"  />
      </section>

      {/* ── Sugerencias ── */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Sugerencias para ti
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {cuartosCerca} cuartos a menos de 5 km de tu facultad.
            </p>
          </div>
          <Link
            href="/search"
            className="flex items-center gap-1 text-sm font-bold text-primary hover:underline"
          >
            Ver todos <ArrowRight className="size-4" />
          </Link>
        </div>

        {cargandoSugerencias ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full rounded-3xl" />
            ))}
          </div>
        ) : destacados.length > 0 ? (
          <PropertyCarousel propiedades={destacados.slice(0, 8)} />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-16 text-center">
            <p className="text-sm font-semibold text-muted-foreground">Aún no tenemos sugerencias.</p>
            <Link href="/search" className="mt-3 text-sm font-bold text-primary hover:underline">
              Explora todos los cuartos →
            </Link>
          </div>
        )}
      </section>

    </div>
  );
}
