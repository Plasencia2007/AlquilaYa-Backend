'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  ClipboardList,
  Heart,
  MessageCircle,
  Search,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useNotificationsStore } from '@/stores/notifications-store';
import { servicioPropiedades } from '@/services/property-service';
import { reservationService } from '@/services/reservation-service';
import { distanciaAUpeuKm } from '@/lib/geo';
import { PropertyCarousel } from '@/components/student/property-carousel';
import { StatCard } from '@/components/student/stat-card';
import {
  OnboardingBanner,
  type OnboardingPaso,
} from '@/components/student/onboarding-banner';
import { Skeleton } from '@/components/ui/skeleton';
import type { Propiedad } from '@/types/propiedad';
import type { Reserva } from '@/types/reserva';

export default function StudentDashboardPage() {
  const { usuario } = useAuth();
  const totalFavoritos = useFavoritesStore((s) => s.ids.size);
  const noLeidasNotif = useNotificationsStore((s) => s.noLeidas);

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [destacados, setDestacados] = useState<Propiedad[]>([]);
  const [cargandoSugerencias, setCargandoSugerencias] = useState(true);

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
    return () => {
      cancelado = true;
    };
  }, []);

  const reservasActivas = useMemo(
    () => reservas.filter((r) => ['SOLICITADA', 'APROBADA', 'PAGADA'].includes(r.estado)).length,
    [reservas],
  );

  const cuartosCerca = useMemo(
    () =>
      destacados.filter((p) => {
        const d = distanciaAUpeuKm(p.coordenadas);
        return d !== null && d <= 5;
      }).length,
    [destacados],
  );

  const onboardingPasos: OnboardingPaso[] = [
    {
      id: 'verificacion',
      titulo: 'Verifica tu identidad',
      descripcion: 'Sube tu DNI y carné universitario.',
      href: '/student/profile?tab=verificacion',
      completado: false,
    },
    {
      id: 'favoritos',
      titulo: 'Guarda 3 cuartos',
      descripcion: 'Marca con corazón los que más te gusten.',
      href: '/search',
      completado: totalFavoritos >= 3,
    },
    {
      id: 'reserva',
      titulo: 'Solicita una visita',
      descripcion: 'Reserva el cuarto que te interese.',
      href: '/search',
      completado: reservas.length > 0,
    },
  ];

  const primerNombre = (usuario?.nombre ?? '').split(' ')[0] ?? '';

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8 md:py-12">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Tu panel
        </p>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          Hola, {primerNombre} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Aquí tienes lo que pasa con tus cuartos y reservas hoy.
        </p>
      </header>

      <OnboardingBanner pasos={onboardingPasos} />

      <section
        aria-label="Resumen"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <StatCard
          icon={Heart}
          label="Favoritos"
          value={totalFavoritos}
          href="/student/favorites"
          accent="primary"
        />
        <StatCard
          icon={ClipboardList}
          label="Reservas activas"
          value={reservasActivas}
          href="/student/reservations"
          accent="blue"
        />
        <StatCard
          icon={MessageCircle}
          label="Mensajes"
          value={noLeidasNotif}
          href="/student/messages"
          accent="emerald"
        />
        <StatCard
          icon={Bell}
          label="Notificaciones"
          value={noLeidasNotif}
          href="/student/notifications"
          accent="amber"
        />
      </section>

      <section className="space-y-4">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-headline text-xl font-bold text-foreground md:text-2xl">
              Sugerencias para ti
            </h2>
            <p className="text-xs text-muted-foreground md:text-sm">
              {cuartosCerca} cuartos a menos de 5 km de tu facultad.
            </p>
          </div>
          <Link
            href="/search"
            className="hidden items-center gap-1 text-sm font-bold text-primary hover:underline sm:flex"
          >
            Ver todos <ArrowRight className="size-4" />
          </Link>
        </header>

        {cargandoSugerencias ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full rounded-2xl" />
            ))}
          </div>
        ) : destacados.length > 0 ? (
          <PropertyCarousel propiedades={destacados.slice(0, 8)} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Aún no tenemos sugerencias. Vuelve pronto.
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/search"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
        >
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Search className="size-6" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Buscar cuartos</p>
            <p className="text-xs text-muted-foreground">
              Filtra por zona, precio y servicios.
            </p>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>

        <Link
          href="/student/profile?tab=verificacion"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
        >
          <span className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <ShieldCheck className="size-6" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Verifica tu identidad</p>
            <p className="text-xs text-muted-foreground">
              Sube tus documentos para reservar sin restricciones.
            </p>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>
      </section>
    </div>
  );
}
