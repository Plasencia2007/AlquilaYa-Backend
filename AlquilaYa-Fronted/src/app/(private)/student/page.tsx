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
import { catalogosService, type ItemCatalogo } from '@/services/catalogos-service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Propiedad } from '@/types/propiedad';
import type { Reserva } from '@/types/reserva';

const FA_TO_MATERIAL: Record<string, string> = {
  'fa-wifi':             'wifi',
  'fa-tint':             'water_drop',
  'fa-bolt':             'bolt',
  'fa-lightbulb':        'lightbulb',
  'fa-tshirt':           'checkroom',
  'fa-shirt':            'checkroom',
  'fa-utensils':         'restaurant',
  'fa-key':              'key',
  'fa-tv':               'tv',
  'fa-snowflake':        'ac_unit',
  'fa-parking':          'local_parking',
  'fa-bus':              'directions_bus',
  'fa-lock':             'lock',
  'fa-couch':            'weekend',
  'fa-bed':              'bed',
  'fa-paw':              'pets',
  'fa-smoking-ban':     'smoke_free',
  'fa-graduation-cap':  'school',
  'fa-music':           'music_note',
  'fa-volume-mute':     'volume_off',
  'fa-glass-cheers':    'celebration',
  'fa-ban':             'block',
  'fa-user-times':      'person_remove',
  'fa-wrench':          'build',
  'fa-comments-slash':  'speaker_notes_off',
  'fa-plane-slash':     'flight_land',
  'fa-heartbeat':       'favorite',
  'fa-calendar-times':  'event_busy',
  'fa-exclamation-circle': 'warning',
};

function resolveIcon(icon: string | undefined): string | undefined {
  if (!icon) return undefined;
  const key = icon.toLowerCase().trim();
  if (key.startsWith('fa-')) return FA_TO_MATERIAL[key] ?? 'label';
  return icon;
}

export default function StudentDashboardPage() {
  const { usuario } = useAuth();
  const { verificado } = useVerificationStatus();
  const totalFavoritos  = useFavoritesStore((s) => s.ids.size);
  const noLeidasNotif   = useNotificationsStore((s) => s.noLeidas);

  const [reservas,              setReservas]              = useState<Reserva[]>([]);
  const [destacados,            setDestacados]            = useState<Propiedad[]>([]);
  const [banners,               setBanners]               = useState<ItemCatalogo[]>([]);
  const [cargandoSugerencias,   setCargandoSugerencias]   = useState(true);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      reservationService.listarMias().catch(() => [] as Reserva[]),
      servicioPropiedades.obtenerDestacadas(8),
      catalogosService.obtenerPorTipo('BANNER').catch(() => [] as ItemCatalogo[]),
    ]).then(([rs, props, bnrs]) => {
      if (cancelado) return;
      setReservas(rs);
      setDestacados(props);
      setBanners(bnrs);
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

      {/* ── Banners Dinámicos ── */}
      {banners.length > 0 && (
        <div className="grid gap-5">
          {banners.map((b) => (
            <div
              key={b.id}
              className="relative overflow-hidden group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/[0.03] via-violet-500/[0.02] to-pink-500/[0.04] dark:from-primary/[0.08] dark:to-pink-500/[0.04] backdrop-blur-md shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
            >
              {/* Background Ambient Glows */}
              <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-primary/10 blur-3xl opacity-60 group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
              <div className="absolute -left-20 -bottom-20 w-48 h-48 rounded-full bg-pink-500/10 blur-3xl opacity-55 pointer-events-none" />

              <div className="flex items-start gap-5 relative z-10 flex-1">
                {b.icono && (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-violet-500 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 group-hover:rotate-6 transition-transform duration-300 animate-[pulse_3s_infinite_ease-in-out]">
                    <span className="material-symbols-outlined text-[24px]">
                      {resolveIcon(b.icono)}
                    </span>
                  </div>
                )}
                <div className="space-y-1">
                  <h3 className="text-base font-black text-foreground tracking-tight">
                    {b.nombre}
                  </h3>
                  {b.descripcion && (
                    <p className="text-xs text-muted-foreground leading-relaxed font-medium max-w-2xl">
                      {b.descripcion}
                    </p>
                  )}
                </div>
              </div>

              {b.valor && (
                <Link href={b.valor} className="shrink-0 self-stretch sm:self-auto">
                  <Button
                    size="default"
                    className="relative z-10 font-bold text-xs gap-1.5 h-10 px-5 rounded-2xl bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 text-white shadow-lg shadow-primary/25 border-none w-full flex items-center justify-center group/btn"
                  >
                    Saber más
                    <ArrowRight className="size-3.5 group-hover/btn:translate-x-0.5 transition-transform duration-200" />
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

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
