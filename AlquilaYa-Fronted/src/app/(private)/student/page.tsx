'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock,
  ClipboardList,
  Heart,
  History as HistoryIcon,
  MessageCircle,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useVerificationStatus } from '@/hooks/use-verification-status';
import { useHistory } from '@/hooks/use-history';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useUnreadMessagesStore } from '@/stores/unread-messages-store';
import { servicioPropiedades } from '@/services/property-service';
import { reservationService, type CuotaRenta } from '@/services/reservation-service';
import { pagoService } from '@/services/pago-service';
import { distanciaAUpeuKm } from '@/lib/geo';
import { cn } from '@/lib/cn';
import { notify } from '@/lib/notify';
import { formatPEN } from '@/lib/money';
import { PropertyCarousel } from '@/components/student/property-carousel';
import { StatCard } from '@/components/shared/stat-card';
import { ErrorState } from '@/components/shared/error-state';
import { OnboardingBanner, type OnboardingPaso } from '@/components/student/onboarding-banner';
import { ConvivenciaOnboardingWizard } from '@/components/student/convivencia-onboarding-wizard';
import { Stagger } from '@/components/motion';
import { catalogosService, type ItemCatalogo } from '@/services/catalogos-service';
import { Button } from '@/components/ui/button';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { resolveIcon } from '@/lib/icons';
import type { Propiedad } from '@/types/propiedad';
import type { Reserva } from '@/types/reserva';

/** Reserva + su cuota de renta más próxima a vencer (ítem 205). */
interface ProximaCuota {
  cuota: CuotaRenta;
  reserva: Reserva;
}

/** Reserva más relevante para el banner de acción dominante (ítem 206). */
interface BannerAccion {
  tipo: 'APROBADA' | 'SOLICITADA' | 'PAGADA';
  reserva: Reserva;
}

export default function StudentDashboardPage() {
  const { usuario } = useAuth();
  const { verificado } = useVerificationStatus();
  const totalFavoritos    = useFavoritesStore((s) => s.ids.size);
  const noLeidasNotif     = useNotificationsStore((s) => s.noLeidas);
  const mensajesNoLeidos  = useUnreadMessagesStore((s) => s.total);
  const { entradas: historialEntradas } = useHistory();

  const [reservas,              setReservas]              = useState<Reserva[]>([]);
  const [destacados,            setDestacados]            = useState<Propiedad[]>([]);
  const [banners,               setBanners]               = useState<ItemCatalogo[]>([]);

  // ── Sugerencias: loading / error / vacío distinguidos (ítem 202) ───────────
  const [cargandoSugerencias,   setCargandoSugerencias]   = useState(true);
  const [errorSugerencias,      setErrorSugerencias]      = useState(false);
  const [reintentoSugerencias,  setReintentoSugerencias]  = useState(0);

  // ── Próximo pago (ítem 205) ─────────────────────────────────────────────────
  const [proximaCuota, setProximaCuota] = useState<ProximaCuota | null>(null);

  // ── Continúa donde quedaste (ítem 204) ──────────────────────────────────────
  const [historialProps,    setHistorialProps]    = useState<Map<string, Propiedad>>(new Map());
  const [cargandoHistorial, setCargandoHistorial]  = useState(true);

  // ── Banner de acción (ítem 206) ─────────────────────────────────────────────
  const [pagandoBanner, setPagandoBanner] = useState(false);

  // Reservas + banners de marketing: fallan en silencio (ambos ya degradan a
  // "vacío" con gracia — la sección de marketing simplemente no se muestra y
  // el resto de widgets derivados de `reservas` tampoco, que es aceptable).
  useEffect(() => {
    let cancelado = false;
    Promise.all([
      reservationService.listarMias().catch(() => [] as Reserva[]),
      catalogosService.obtenerPorTipo('BANNER').catch(() => [] as ItemCatalogo[]),
    ]).then(([rs, bnrs]) => {
      if (cancelado) return;
      setReservas(rs);
      setBanners(bnrs);
    });
    return () => { cancelado = true; };
  }, []);

  // Sugerencias: bloque aislado y reintentable — antes, si `obtenerDestacadas`
  // fallaba, el `Promise.all` conjunto rechazaba entero y el `.then()` nunca
  // corría, dejando el skeleton girando para siempre (ítem 202).
  useEffect(() => {
    let cancelado = false;
    setCargandoSugerencias(true);
    setErrorSugerencias(false);
    servicioPropiedades
      .obtenerDestacadas(8)
      .then((props) => {
        if (cancelado) return;
        setDestacados(props);
        setCargandoSugerencias(false);
      })
      .catch(() => {
        if (cancelado) return;
        setErrorSugerencias(true);
        setCargandoSugerencias(false);
      });
    return () => { cancelado = true; };
  }, [reintentoSugerencias]);

  // Próximo pago: entre las reservas PAGADAS, busca la cuota pendiente con
  // vencimiento futuro más cercano (ítem 205). No hay endpoint de pago por
  // cuota individual todavía (solo el cronograma de lectura) — el CTA lleva
  // al detalle de la reserva en vez de intentar cobrar directamente.
  useEffect(() => {
    const pagadas = reservas.filter((r) => r.estado === 'PAGADA');
    if (pagadas.length === 0) {
      setProximaCuota(null);
      return;
    }
    let cancelado = false;
    Promise.all(
      pagadas.map((r) =>
        reservationService
          .obtenerCuotas(r.id)
          .then((cuotas) => cuotas.map((cuota) => ({ cuota, reserva: r })))
          .catch(() => [] as ProximaCuota[]),
      ),
    ).then((listas) => {
      if (cancelado) return;
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const candidatas = listas
        .flat()
        .filter(({ cuota }) => {
          if (cuota.estado !== 'PENDIENTE') return false;
          const venc = new Date(`${cuota.fechaVencimiento}T00:00:00`);
          return venc.getTime() >= hoy.getTime();
        })
        .sort(
          (a, b) =>
            new Date(a.cuota.fechaVencimiento).getTime() - new Date(b.cuota.fechaVencimiento).getTime(),
        );
      setProximaCuota(candidatas[0] ?? null);
    });
    return () => { cancelado = true; };
  }, [reservas]);

  // Continúa donde quedaste: resuelve las 3 visitas más recientes del
  // historial local a datos de propiedad, con manejo de 404 por-item (mismo
  // patrón que student/history/page.tsx).
  const ultimasEntradas = useMemo(
    () => [...historialEntradas].sort((a, b) => b.visitadoEn - a.visitadoEn).slice(0, 3),
    [historialEntradas],
  );

  useEffect(() => {
    if (ultimasEntradas.length === 0) {
      setHistorialProps(new Map());
      setCargandoHistorial(false);
      return;
    }
    let cancelado = false;
    setCargandoHistorial(true);
    Promise.all(
      ultimasEntradas.map((e) => servicioPropiedades.obtenerPorId(e.propiedadId).catch(() => null)),
    ).then((resultados) => {
      if (cancelado) return;
      const map = new Map<string, Propiedad>();
      resultados.forEach((p) => { if (p) map.set(p.id, p); });
      setHistorialProps(map);
      setCargandoHistorial(false);
    });
    return () => { cancelado = true; };
  }, [ultimasEntradas]);

  const historialVisible = useMemo(
    () => ultimasEntradas.filter((e) => historialProps.has(e.propiedadId)),
    [ultimasEntradas, historialProps],
  );

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

  // Banner de acción: prioriza APROBADA (urge pagar) > SOLICITADA (esperando)
  // > PAGADA reciente (próximos pasos). Si no hay ninguna reserva activa, no
  // se muestra nada (ítem 206).
  const bannerAccion = useMemo<BannerAccion | null>(() => {
    const aprobada = reservas.find((r) => r.estado === 'APROBADA');
    if (aprobada) return { tipo: 'APROBADA', reserva: aprobada };

    const solicitada = reservas.find((r) => r.estado === 'SOLICITADA');
    if (solicitada) return { tipo: 'SOLICITADA', reserva: solicitada };

    const pagadas = reservas.filter((r) => r.estado === 'PAGADA');
    if (pagadas.length > 0) {
      const reciente = [...pagadas].sort(
        (a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime(),
      )[0];
      return { tipo: 'PAGADA', reserva: reciente };
    }

    return null;
  }, [reservas]);

  const diasParaVencerCuota = useMemo(() => {
    if (!proximaCuota) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = new Date(`${proximaCuota.cuota.fechaVencimiento}T00:00:00`);
    return Math.round((venc.getTime() - hoy.getTime()) / (24 * 60 * 60 * 1000));
  }, [proximaCuota]);

  const pagarDesdeElBanner = async (reservaId: string) => {
    setPagandoBanner(true);
    try {
      const { url } = await pagoService.crearPreferencia(reservaId);
      if (!url) throw new Error('Sin URL de checkout');
      const win = window.open(url, '_blank');
      if (!win) window.location.href = url;
    } catch (err) {
      notify.error(err, 'No pudimos iniciar el pago. Inténtalo de nuevo.');
    } finally {
      setPagandoBanner(false);
    }
  };

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

      {/* ── Wizard de convivencia (#180): opcional, tras el primer login, no bloquea nada ── */}
      <ConvivenciaOnboardingWizard />

      {/* ── Saludo ── */}
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Tu panel</p>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          Hola, {primerNombre} <span className="inline-block animate-[wave_1.5s_ease-in-out_1]">👋</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Aquí tienes lo que pasa con tus cuartos y reservas hoy.
        </p>
      </header>

      {/* ── Banner de acción (#206): prioridad visual, arriba de todo lo demás ── */}
      {bannerAccion && (
        <div
          className={cn(
            'relative overflow-hidden rounded-3xl border p-6 shadow-md',
            bannerAccion.tipo === 'APROBADA' && 'border-warning/30 bg-gradient-to-r from-warning-light to-warning-light/30',
            bannerAccion.tipo === 'SOLICITADA' && 'border-info/30 bg-gradient-to-r from-info-light to-info-light/30',
            bannerAccion.tipo === 'PAGADA' && 'border-success/30 bg-gradient-to-r from-success-light to-success-light/30',
          )}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span
                className={cn(
                  'flex size-12 shrink-0 items-center justify-center rounded-2xl',
                  bannerAccion.tipo === 'APROBADA' && 'bg-warning/15 text-warning',
                  bannerAccion.tipo === 'SOLICITADA' && 'bg-info/15 text-info',
                  bannerAccion.tipo === 'PAGADA' && 'bg-success/15 text-success',
                )}
              >
                {bannerAccion.tipo === 'APROBADA' && <AlertCircle className="size-6" aria-hidden />}
                {bannerAccion.tipo === 'SOLICITADA' && <Clock className="size-6" aria-hidden />}
                {bannerAccion.tipo === 'PAGADA' && <CheckCircle2 className="size-6" aria-hidden />}
              </span>
              <div>
                <h2 className="text-base font-black tracking-tight text-foreground">
                  {bannerAccion.tipo === 'APROBADA' && '¡Te aprobaron! Paga antes de que expire'}
                  {bannerAccion.tipo === 'SOLICITADA' && 'Esperando respuesta del arrendador'}
                  {bannerAccion.tipo === 'PAGADA' && '¡Reserva confirmada!'}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {bannerAccion.tipo === 'APROBADA' &&
                    `Tu solicitud para ${bannerAccion.reserva.propiedadTitulo ?? 'el cuarto'} fue aprobada. Completa el pago para asegurar tu lugar antes de que la aprobación expire.`}
                  {bannerAccion.tipo === 'SOLICITADA' &&
                    `Tu solicitud para ${bannerAccion.reserva.propiedadTitulo ?? 'el cuarto'} está pendiente de respuesta del arrendador.`}
                  {bannerAccion.tipo === 'PAGADA' &&
                    `Ya pagaste ${bannerAccion.reserva.propiedadTitulo ?? 'tu cuarto'}. Revisa tus próximos pasos para la mudanza.`}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {bannerAccion.tipo === 'APROBADA' && (
                <Button
                  size="sm"
                  className="w-full font-bold sm:w-auto"
                  disabled={pagandoBanner}
                  onClick={() => pagarDesdeElBanner(bannerAccion.reserva.id)}
                >
                  {pagandoBanner ? 'Abriendo…' : 'Pagar ahora'}
                </Button>
              )}
              {bannerAccion.tipo === 'SOLICITADA' && (
                <Link href="/student/reservations?tab=SOLICITADA">
                  <Button size="sm" variant="outline" className="w-full font-bold sm:w-auto">
                    Ver solicitud
                  </Button>
                </Link>
              )}
              {bannerAccion.tipo === 'PAGADA' && (
                <Link href="/student/reservations?tab=PAGADA">
                  <Button size="sm" variant="outline" className="w-full font-bold sm:w-auto">
                    Próximos pasos
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Banners Dinámicos ── */}
      {banners.length > 0 && (
        <div className="grid gap-5">
          {banners.map((b) => (
            <div
              key={b.id}
              className="relative overflow-hidden group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/[0.03] to-flash/[0.04] dark:from-primary/[0.08] dark:to-flash/[0.04] backdrop-blur-md shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
            >
              {/* Background Ambient Glows */}
              <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-primary/10 blur-3xl opacity-60 group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
              <div className="absolute -left-20 -bottom-20 w-48 h-48 rounded-full bg-flash/10 blur-3xl opacity-55 pointer-events-none" />

              <div className="flex items-start gap-5 relative z-10 flex-1">
                {b.icono && (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-flash text-primary-foreground flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 group-hover:rotate-6 transition-transform duration-300 animate-[pulse_3s_infinite_ease-in-out]">
                    <span className="material-symbols-outlined text-[24px]">
                      {resolveIcon(b.icono)}
                    </span>
                  </div>
                )}
                <div className="space-y-1">
                  <h2 className="text-base font-black text-foreground tracking-tight">
                    {b.nombre}
                  </h2>
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
                    className="relative z-10 font-bold text-xs gap-1.5 h-10 px-5 rounded-2xl bg-gradient-to-r from-primary to-flash hover:from-primary/90 hover:to-flash/90 text-primary-foreground shadow-lg shadow-primary/25 border-none w-full flex items-center justify-center group/btn"
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
      <section aria-label="Resumen">
        <Stagger className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={Heart}         label="Favoritos"       value={totalFavoritos}   href="/student/favorites"    accent="primary" />
          <StatCard icon={ClipboardList} label="Reservas activas" value={reservasActivas} href="/student/reservations" accent="info"    />
          <StatCard icon={MessageCircle} label="Mensajes"         value={mensajesNoLeidos} href="/student/messages"     accent="success" />
          <StatCard icon={Bell}          label="Notificaciones"   value={noLeidasNotif}   href="/student/notifications" accent="warning" />
        </Stagger>
      </section>

      {/* ── Próximo pago (#205) ── */}
      {proximaCuota && diasParaVencerCuota !== null && (
        <section aria-label="Próximo pago">
          <div className="flex flex-col gap-4 rounded-3xl border border-info/20 bg-info-light/40 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-info/10 text-info">
                <CalendarClock className="size-6" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-black text-foreground">
                  Próximo pago: {formatPEN(proximaCuota.cuota.monto)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Vence{' '}
                  {diasParaVencerCuota === 0
                    ? 'hoy'
                    : diasParaVencerCuota === 1
                      ? 'mañana'
                      : `en ${diasParaVencerCuota} días`}
                  {proximaCuota.reserva.propiedadTitulo ? ` · ${proximaCuota.reserva.propiedadTitulo}` : ''}
                </p>
              </div>
            </div>
            <Link href="/student/reservations?tab=PAGADA" className="shrink-0">
              <Button size="sm" className="w-full font-bold sm:w-auto">Ver cronograma</Button>
            </Link>
          </div>
        </section>
      )}

      {/* ── Continúa donde quedaste (#204) ── */}
      {!cargandoHistorial && historialVisible.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
              <HistoryIcon className="size-5 text-primary" aria-hidden />
              Continúa donde quedaste
            </h2>
            <Link
              href="/student/history"
              className="flex items-center gap-1 text-sm font-bold text-primary hover:underline"
            >
              Ver historial completo <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {historialVisible.map((e) => {
              const p = historialProps.get(e.propiedadId);
              if (!p) return null;
              return (
                <Link
                  key={e.propiedadId}
                  href={`/property/${p.id}`}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <Image
                      fill
                      sizes="64px"
                      src={p.imagenes[0] ?? '/rooms/placeholder.jpg'}
                      alt={p.titulo}
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{p.titulo}</p>
                    <p className="tnum text-xs font-black text-primary">
                      {formatPEN(p.precio)}
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">/mes</span>
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

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
          // Ítem 409: anuncio único para lectores de pantalla en vez de 3 piezas mudas.
          <SkeletonGroup label="Cargando sugerencias para ti…" className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full rounded-3xl" />
            ))}
          </SkeletonGroup>
        ) : errorSugerencias ? (
          <ErrorState
            title="No pudimos cargar tus sugerencias"
            description="Hubo un problema buscando cuartos recomendados para ti."
            retryLabel="Reintentar"
            onRetry={() => setReintentoSugerencias((n) => n + 1)}
          />
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
