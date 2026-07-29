'use client';

import { use, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ArrowLeft,
  BadgeCheck,
  BedDouble,
  BellRing,
  Building2,
  CalendarCheck,
  CalendarDays,
  Check,
  Eye,
  Flag,
  MapPin,
  MessageCircle,
  Footprints,
  Phone,
  Ruler,
  Share2,
  ShieldCheck,
  ShowerHead,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Money } from '@/components/ui/money';
import { Rating } from '@/components/ui/rating';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ErrorState } from '@/components/shared/error-state';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { ReputationBadge } from '@/components/reputation-badge';
import { RoommateGroupsSection } from '@/components/student/roommate-groups-section';
import { PropertyGallery } from '@/components/property/property-gallery';
import { PropertyReviews } from '@/components/property/property-reviews';
import { PropertyVideo } from '@/components/property/property-video';
import { PropertyNearbyPlaces } from '@/components/property/property-nearby-places';
import { PropertyQuestions } from '@/components/property/property-questions';
import { ServiceBadges } from '@/components/student/service-badges';
import { PropertyBadges } from '@/components/student/property-badges';
import { PropertyCarousel } from '@/components/student/property-carousel';
import { POLITICA_CANCELACION_INFO } from '@/lib/politica-cancelacion';
import { AvailabilityPanel } from '@/components/student/availability-panel';
import { RoomList } from '@/components/student/room-list';
import { FavoriteButton } from '@/components/student/favorite-button';
import { ReportListingDialog } from '@/components/student/report-listing-dialog';
import { ReservationFormDialog } from '@/components/student/reservation-form-dialog';
import { ContactLandlordDialog } from '@/components/student/contact-landlord-dialog';
import { MapSkeleton } from '@/components/search/map-skeleton';
import { MapFacade } from '@/components/shared/map-facade';
import { useInView } from '@/hooks/use-in-view';
import { servicioPropiedades, registrarContacto, registrarVista } from '@/services/property-service';
import {
  distanciaHaversineKm,
  formatearDistancia,
  googleMapsRutaUrl,
  minutosCaminando,
  resolverZona,
} from '@/lib/geo';
import { universidadService, type ZonaResolucion } from '@/services/universidad-service';
import { useHistory } from '@/hooks/use-history';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';
import { ULTIMA_BUSQUEDA_KEY } from '@/hooks/use-search-params-state';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/cn';
import { formatPEN } from '@/lib/money';
import { REGLAS_CATALOGO } from '@/types/propiedad';
import type { Propiedad, PoliticaCancelacion } from '@/types/propiedad';

// Ítem 421: además de `ssr:false`, el mapa solo se monta al entrar en viewport — en esta
// página (larga, galería+descripción+reseñas antes) casi nunca es lo primero que se ve.
const PropertiesMap = dynamic(() => import('@/components/shared/PropertiesMap'), {
  ssr: false,
  loading: () => <MapSkeleton className="h-[320px] w-full rounded-2xl" />,
});

const TIPO_LABEL: Record<string, string> = {
  CUARTO_INDIVIDUAL: 'Cuarto individual',
  CUARTO_COMPARTIDO: 'Cuarto compartido',
  DEPARTAMENTO: 'Departamento',
  MINI_DEPA: 'Mini depa',
  SUITE: 'Suite',
  MINI_DEPTO: 'Mini depto',
  CUARTO: 'Cuarto',
  ESTUDIO: 'Estudio',
  CASA: 'Casa',
};

/** Clave de sessionStorage para no inflar el contador de vistas en cada refresh (#162). */
function claveVista(id: string): string {
  return `alquilaya-vista:${id}`;
}

/** Normaliza un teléfono peruano a formato internacional para el link `wa.me` (#153). */
function normalizarTelefonoWhatsapp(telefono: string): string {
  const digitos = telefono.replace(/\D/g, '');
  if (digitos.length === 9 && !digitos.startsWith('51')) return `51${digitos}`;
  return digitos;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function PropertyDetailPage({ params }: Props) {
  const { id } = use(params);
  const [propiedad, setPropiedad] = useState<Propiedad | null>(null);
  const [similares, setSimilares] = useState<Propiedad[]>([]);
  const [zonas, setZonas] = useState<ZonaResolucion[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'no-encontrado' | 'error'>('cargando');
  const [copiado, setCopiado] = useState(false);
  const [enviandoWhatsapp, setEnviandoWhatsapp] = useState(false);
  const { registrar } = useHistory();
  const { estaAutenticado, usuario } = useAuth();
  const { open: abrirAuth } = useAuthModal();
  // Ítem 421: el mapa de ubicación vive bien abajo (tras galería, descripción, reseñas) —
  // se difiere hasta que el usuario se acerca en el scroll.
  const [mapaRef, mapaEnVista, mostrarMapa] = useInView<HTMLDivElement>({ rootMargin: '200px' });

  useEffect(() => {
    let cancelado = false;
    setSimilares([]);
    servicioPropiedades
      .obtenerSimilares(id, 4)
      .then((data) => {
        if (!cancelado) setSimilares(data);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [id]);

  // Zonas de cobertura: para resolver a qué UNIVERSIDAD pertenece esta propiedad y rutear ahí
  // (no al "campus principal" global, que con multi-universidad sería el equivocado).
  useEffect(() => {
    let cancelado = false;
    universidadService
      .listarZonasActivas()
      .then((data) => {
        if (!cancelado) setZonas(data);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    servicioPropiedades
      .obtenerPorId(id)
      .then((p) => {
        if (cancelado) return;
        if (!p) setEstado('no-encontrado');
        else {
          setPropiedad(p);
          setEstado('ok');
          registrar(id);
        }
      })
      .catch(() => {
        if (cancelado) return;
        setEstado('error');
      });
    return () => {
      cancelado = true;
    };
  }, [id, registrar]);

  // Vista pública (#162): una sola vez por sesión de navegador, separado del GET /publico
  // (ese también lo golpea el fetch de metadata OG en el servidor y no debe inflar el contador).
  useEffect(() => {
    if (estado !== 'ok' || !propiedad) return;
    try {
      const key = claveVista(propiedad.id);
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, '1');
    } catch {
      /* sessionStorage no disponible → no dedup, best-effort igual */
    }
    void registrarVista(propiedad.id);
  }, [estado, propiedad]);

  const compartir = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: propiedad?.titulo, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const contactarWhatsapp = async () => {
    if (!propiedad) return;
    if (!estaAutenticado) {
      abrirAuth('login');
      return;
    }
    if (usuario?.rol !== 'ESTUDIANTE') {
      notify.warning('Solo los estudiantes pueden contactar arrendadores');
      return;
    }
    setEnviandoWhatsapp(true);
    try {
      const { telefono } = await registrarContacto(propiedad.id);
      if (!telefono) {
        notify.warning('El arrendador no tiene WhatsApp registrado. Usa el chat interno.');
        return;
      }
      const numero = normalizarTelefonoWhatsapp(telefono);
      const texto = encodeURIComponent(
        `¡Hola! Vi tu propiedad "${propiedad.titulo}" en AlquilaYa. ¿Sigue disponible?`,
      );
      window.open(`https://wa.me/${numero}?text=${texto}`, '_blank', 'noopener,noreferrer');
    } finally {
      setEnviandoWhatsapp(false);
    }
  };

  // Ítems del nav sticky con scroll-spy (#145). Memoizado para que la referencia solo
  // cambie cuando cambian las secciones que realmente se renderizan.
  const seccionesNav = useMemo(
    () => [
      { id: 'resumen', label: 'Resumen' },
      ...(propiedad?.gestionPorHabitacion ? [{ id: 'habitaciones', label: 'Habitaciones' }] : []),
      { id: 'servicios', label: 'Servicios' },
      { id: 'resenas', label: 'Reseñas' },
      ...(propiedad?.coordenadas ? [{ id: 'ubicacion', label: 'Ubicación' }] : []),
    ],
    [propiedad?.gestionPorHabitacion, propiedad?.coordenadas],
  );

  if (estado === 'cargando') {
    return (
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-24 sm:px-12 md:pt-28">
        <Skeleton className="mb-4 h-4 w-56" />

        <div className="hidden grid-cols-4 grid-rows-2 gap-2 md:grid">
          <Skeleton className="col-span-2 row-span-2 rounded-2xl" />
          <Skeleton className="rounded-2xl" />
          <Skeleton className="rounded-2xl" />
          <Skeleton className="rounded-2xl" />
          <Skeleton className="rounded-2xl" />
        </div>
        <Skeleton className="aspect-[16/7] w-full rounded-2xl md:hidden" />

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-9 w-32" />
            <Skeleton className="mt-5 h-12 w-full rounded-full" />
            <Skeleton className="mt-3 h-12 w-full rounded-full" />
          </div>
        </div>
      </main>
    );
  }

  if (estado === 'no-encontrado') {
    return (
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-28 sm:px-12">
        <ErrorState
          title="Cuarto no encontrado"
          description="El cuarto que buscas ya no está disponible o el enlace es incorrecto."
          retryLabel="Volver a explorar"
          onRetry={() => {
            window.location.href = '/search';
          }}
        />
      </main>
    );
  }

  if (estado === 'error' || !propiedad) {
    return (
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-28 sm:px-12">
        <ErrorState
          title="No pudimos cargar este cuarto"
          description="Inténtalo de nuevo en un momento."
          retryLabel="Reintentar"
          onRetry={() => window.location.reload()}
        />
      </main>
    );
  }

  // Universidad/campus de ESTA propiedad (resuelto de su zona), no el ancla global.
  const zonaResuelta = propiedad.coordenadas ? resolverZona(propiedad.coordenadas, zonas) : null;
  const campusDestino =
    zonaResuelta && zonaResuelta.latitud != null && zonaResuelta.longitud != null
      ? { lat: zonaResuelta.latitud, lng: zonaResuelta.longitud }
      : null;
  const campusNombre = zonaResuelta?.universidadNombre ?? 'el campus';
  const distancia =
    propiedad.coordenadas && campusDestino
      ? distanciaHaversineKm(propiedad.coordenadas, campusDestino)
      : null;
  const tipoLabel = TIPO_LABEL[propiedad.tipo] ?? propiedad.tipo;

  // Rebaja (ítem 133): precio anterior tachado + % de descuento calculado.
  // Se basa en el precio (no en el badge REBAJA) para no pintar descuentos inválidos.
  const hayRebaja =
    propiedad.precioAnterior != null && propiedad.precioAnterior > propiedad.precio;
  const descuentoPct = hayRebaja
    ? Math.round((1 - propiedad.precio / propiedad.precioAnterior!) * 100)
    : 0;

  // Servicios incluidos vs. aparte (#118, #156): un solo cómputo, reusado en la sección
  // principal y en el resumen de costo mensual del sidebar.
  const estadoServicios = propiedad.serviciosEstado;
  const serviciosIncluidos = estadoServicios
    ? estadoServicios.filter((s) => s.estado === 'INCLUIDO').map((s) => s.servicio)
    : propiedad.servicios;
  const serviciosApartConMonto = estadoServicios
    ? estadoServicios.filter((s) => s.estado === 'APARTE')
    : [];
  const serviciosAparte = serviciosApartConMonto.map((s) => s.servicio);
  const serviciosApartesSinMonto = serviciosApartConMonto.filter((s) => s.monto == null);
  const totalMontosAparte = serviciosApartConMonto.reduce((sum, s) => sum + (s.monto ?? 0), 0);
  const estimadoMensualTotal = propiedad.precio + totalMontosAparte;

  // Breadcrumb "Explorar" con los últimos filtros de búsqueda (#160), si los hay.
  let ultimaBusquedaQs: string | null = null;
  try {
    ultimaBusquedaQs =
      typeof window !== 'undefined' ? window.sessionStorage.getItem(ULTIMA_BUSQUEDA_KEY) : null;
  } catch {
    ultimaBusquedaQs = null;
  }
  const exploarHref = ultimaBusquedaQs ? `/search?${ultimaBusquedaQs}` : '/search';

  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-24 sm:px-12 md:pt-28">
      <PageBreadcrumb
        className="mb-4"
        items={[
          { label: 'Inicio', href: '/' },
          { label: 'Explorar', href: exploarHref },
          { label: propiedad.titulo },
        ]}
      />

      <div className="relative overflow-hidden rounded-2xl">
        <PropertyGallery imagenes={propiedad.imagenes} alt={propiedad.titulo} />
        {!propiedad.disponible && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
            <span className="rounded-full bg-foreground px-4 py-2 text-sm font-bold text-background shadow-lg">
              Este cuarto ya no está disponible
            </span>
          </div>
        )}
      </div>

      <SeccionNav items={seccionesNav} />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          {/* Encabezado */}
          <header id="resumen" className="scroll-mt-24 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      propiedad.disponible
                        ? 'bg-success-light text-success'
                        : 'bg-destructive/10 text-destructive',
                    )}
                  >
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        propiedad.disponible ? 'bg-success' : 'bg-destructive',
                      )}
                    />
                    {propiedad.disponible ? 'Disponible' : 'No disponible'}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {tipoLabel}
                  </span>
                  <PropertyBadges badges={propiedad.badges} orientation="horizontal" max={4} />
                  {propiedad.verificado && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
                      title="Esta publicación fue revisada y aprobada por nuestro equipo"
                    >
                      <BadgeCheck className="size-3.5" aria-hidden /> Verificado por AlquilaYa
                    </span>
                  )}
                </div>
                <h1 className="text-h1">
                  {propiedad.titulo}
                </h1>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4" aria-hidden /> {propiedad.direccion}
                  {distancia !== null && (
                    <span className="font-semibold text-primary">
                      · a {formatearDistancia(distancia)} de {campusNombre}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={compartir}
                  aria-label="Compartir propiedad"
                  className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
                >
                  {copiado ? (
                    <Check className="size-4 text-success" aria-hidden />
                  ) : (
                    <Share2 className="size-4" aria-hidden />
                  )}
                </button>
                <FavoriteButton propiedadId={propiedad.id} size="lg" />
                <ReportListingDialog
                  propiedadId={propiedad.id}
                  trigger={
                    <button
                      type="button"
                      aria-label="Reportar publicación"
                      title="Reportar publicación"
                      className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Flag className="size-4" aria-hidden />
                    </button>
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-2">
                <Rating value={propiedad.calificacion} size="sm" showValue />
                <span className="font-normal text-muted-foreground">
                  ({propiedad.reseñas} reseñas)
                </span>
              </span>
              {propiedad.propietarioNombre && (
                <>
                  <span aria-hidden className="text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">
                    Publicado por{' '}
                    <strong className="text-foreground">{propiedad.propietarioNombre}</strong>
                  </span>
                </>
              )}
            </div>
          </header>

          {/* Stats */}
          <section className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-4">
            {propiedad.habitaciones > 0 && (
              <Stat icon={BedDouble} value={`${propiedad.habitaciones}`} label={propiedad.habitaciones === 1 ? 'Dormitorio' : 'Dormitorios'} />
            )}
            {propiedad.baños > 0 && (
              <Stat icon={ShowerHead} value={`${propiedad.baños}`} label={propiedad.baños === 1 ? 'Baño' : 'Baños'} />
            )}
            {propiedad.capacidadPersonas ? (
              <Stat icon={User} value={`${propiedad.capacidadPersonas}`} label={propiedad.capacidadPersonas === 1 ? 'Persona' : 'Personas'} />
            ) : null}
            {propiedad.area > 0 && (
              <Stat icon={Ruler} value={`${propiedad.area} m²`} label="Área" />
            )}
            <Stat icon={Building2} value={tipoLabel} label="Tipo" />
          </section>

          {/* Habitaciones (solo inmuebles gestionados por habitación) */}
          {propiedad.gestionPorHabitacion && (
            <section id="habitaciones" className="space-y-3 scroll-mt-24">
              <h2 className="text-h2">Habitaciones disponibles</h2>
              <p className="text-sm text-muted-foreground">
                Este inmueble se alquila por habitaciones. Elige y reserva el cuarto que prefieras.
              </p>
              <RoomList propiedad={propiedad} />
            </section>
          )}

          {/* Descripción */}
          <section className="space-y-3">
            <h2 className="text-h2">Sobre este cuarto</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{propiedad.descripcion}</p>
          </section>

          {/* Video de la propiedad */}
          {propiedad.videoUrl && (
            <section className="space-y-3">
              <h2 className="text-h2">Video</h2>
              <PropertyVideo url={propiedad.videoUrl} titulo={propiedad.titulo} />
            </section>
          )}

          {/* Disponibilidad (a nivel inmueble; en modo por-habitación el estado va por cuarto) */}
          {!propiedad.gestionPorHabitacion && (
            <section className="space-y-3">
              <h2 className="text-h2">Disponibilidad</h2>
              <AvailabilityPanel propiedadId={propiedad.id} />
            </section>
          )}

          {/* Servicios — incluido vs. se paga aparte */}
          <section id="servicios" className="space-y-4 scroll-mt-24">
            <h2 className="text-h2">Servicios</h2>
            {serviciosIncluidos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-success">
                  Incluido en el precio
                </p>
                <ServiceBadges servicios={serviciosIncluidos} max={serviciosIncluidos.length} variant="plain" />
              </div>
            )}
            {serviciosAparte.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-warning">Se paga aparte</p>
                <ServiceBadges servicios={serviciosAparte} max={serviciosAparte.length} variant="plain" />
              </div>
            )}
            {serviciosIncluidos.length === 0 && serviciosAparte.length === 0 && (
              <p className="text-sm text-muted-foreground">No especificados</p>
            )}
          </section>

          {/* Reglas */}
          {propiedad.reglas && propiedad.reglas.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-h2">Reglas de la casa</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {propiedad.reglas.map((regla, i) => {
                  const cat = REGLAS_CATALOGO.find(
                    (r) => r.clave === regla || r.etiqueta === regla,
                  );
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2.5"
                    >
                      <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                      <span className="text-xs font-medium text-foreground">
                        {cat?.etiqueta ?? regla}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Arrendador */}
          <section className="space-y-4">
            <h2 className="text-h2">Sobre el arrendador</h2>
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
              <UserAvatar
                src={propiedad.arrendadorAvatar}
                nombre={propiedad.propietarioNombre || 'Arrendador'}
                size="xl"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-bold text-foreground">
                    {propiedad.propietarioNombre || 'Arrendador'}
                  </span>
                  {propiedad.arrendadorVerificado && (
                    <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verificado" />
                  )}
                </div>
                {propiedad.arrendadorNivelReputacion && (
                  <div className="mt-1.5">
                    <ReputationBadge
                      nivel={propiedad.arrendadorNivelReputacion}
                      score={propiedad.arrendadorScore}
                    />
                  </div>
                )}
                {propiedad.tiempoRespuestaArrendador != null && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Responde en ~{propiedad.tiempoRespuestaArrendador} min
                  </p>
                )}
                {propiedad.fechaCreacion && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Publicó en{' '}
                    {new Date(propiedad.fechaCreacion).toLocaleDateString('es-PE', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Preguntas y respuestas públicas (#166) */}
          <section className="space-y-4">
            <h2 className="text-h2">Preguntas y respuestas</h2>
            <PropertyQuestions
              propiedadId={Number(propiedad.id)}
              arrendadorId={Number(propiedad.propietarioId)}
            />
          </section>

          {/* Reseñas */}
          <section id="resenas" className="scroll-mt-24">
            <PropertyReviews
              propiedadId={propiedad.id}
              calificacion={propiedad.calificacion}
              totalResenas={propiedad.reseñas}
            />
          </section>

          {/* Mapa */}
          {propiedad.coordenadas && (
            <section id="ubicacion" className="space-y-3 scroll-mt-24">
              <h2 className="text-h2">Ubicación</h2>

              {/* Tiempo estimado + cómo llegar (ruta real en Google Maps) */}
              {distancia !== null && campusDestino && propiedad.coordenadas && (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Footprints className="size-4 text-primary" aria-hidden />
                    <span className="text-muted-foreground">
                      <span className="font-bold text-foreground">
                        ~{minutosCaminando(distancia)} min
                      </span>{' '}
                      a pie a {campusNombre}
                      <span className="text-muted-foreground/70"> · {formatearDistancia(distancia)}</span>
                    </span>
                  </div>
                  <div className="ml-auto flex gap-2">
                    {(['walking', 'transit', 'driving'] as const).map((modo) => (
                      <a
                        key={modo}
                        href={googleMapsRutaUrl(propiedad.coordenadas!, campusDestino, modo)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        {modo === 'walking' ? 'A pie' : modo === 'transit' ? 'En bus' : 'En auto'}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div ref={mapaRef} className="overflow-hidden rounded-2xl border border-border">
                {mapaEnVista ? (
                  <PropertiesMap propiedades={[propiedad]} className="h-[320px] w-full" />
                ) : (
                  <MapFacade className="h-[320px]" onActivate={mostrarMapa} />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/70">
                El tiempo a pie es estimado; toca un modo para ver la ruta y el tiempo reales en Google Maps.
              </p>

              <PropertyNearbyPlaces
                propiedadId={Number(propiedad.id)}
                lat={propiedad.coordenadas.lat}
                lng={propiedad.coordenadas.lng}
                className="mt-4"
              />
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">
              {propiedad.gestionPorHabitacion ? 'Habitaciones desde' : 'Precio mensual'}
            </p>
            {hayRebaja && (
              <p className="mt-1 flex items-center gap-2">
                <span className="tnum text-base font-semibold text-muted-foreground line-through">
                  {formatPEN(propiedad.precioAnterior!)}
                </span>
                {descuentoPct > 0 && (
                  <span className="rounded-full bg-success px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-success-foreground">
                    -{descuentoPct}%
                  </span>
                )}
              </p>
            )}
            <Money value={propiedad.precio} period="mes" size="lg" className="mt-1 text-primary" />

            {/* Estimado mensual (#156): renta + montos reales de servicios aparte + depósito. */}
            {(serviciosIncluidos.length > 0 || serviciosApartConMonto.length > 0 || propiedad.deposito != null) && (
              <div className="mt-3 space-y-1.5 rounded-xl border border-border bg-muted/30 p-3 text-[11px]">
                <p className="font-bold text-foreground">Estimado mensual</p>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Renta</span>
                  <span className="tnum font-bold text-foreground">{formatPEN(propiedad.precio)}</span>
                </div>
                {serviciosApartConMonto
                  .filter((s) => s.monto != null)
                  .map((s) => (
                    <div key={s.servicio} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{s.servicio}</span>
                      <span className="tnum text-foreground">+ {formatPEN(s.monto!)}</span>
                    </div>
                  ))}
                {totalMontosAparte > 0 && (
                  <div className="flex items-center justify-between border-t border-border pt-1.5 font-bold">
                    <span className="text-foreground">Total estimado</span>
                    <span className="tnum text-primary">{formatPEN(estimadoMensualTotal)}</span>
                  </div>
                )}
                {serviciosIncluidos.length > 0 && (
                  <p className="text-success">
                    Incluye {serviciosIncluidos.length === 1 ? 'el servicio' : `los ${serviciosIncluidos.length} servicios`} marcados como incluidos.
                  </p>
                )}
                {serviciosApartesSinMonto.length > 0 && (
                  <p className="text-warning">
                    + {serviciosApartesSinMonto.map((s) => s.servicio).join(', ')}{' '}
                    se paga{serviciosApartesSinMonto.length === 1 ? '' : 'n'} aparte (monto no registrado por el arrendador).
                  </p>
                )}
                {propiedad.deposito != null && (
                  <p className="text-muted-foreground">
                    + Depósito de garantía:{' '}
                    <span className="tnum font-bold text-foreground">{formatPEN(propiedad.deposito)}</span>{' '}
                    (pago único, no mensual)
                  </p>
                )}
              </div>
            )}

            {propiedad.temporadas && propiedad.temporadas.length > 0 && (
              <div className="mt-3 space-y-1.5 rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[11px] font-bold text-foreground">Precios por temporada</p>
                {propiedad.temporadas.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-muted-foreground">
                      {t.etiqueta ? `${t.etiqueta} · ` : ''}
                      {new Date(t.fechaInicio).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}–
                      {new Date(t.fechaFin).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="tnum shrink-0 font-bold text-foreground">
                      {formatPEN(t.precio)}
                    </span>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground/70">
                  Se aplica según tu fecha de ingreso.
                </p>
              </div>
            )}

            {propiedad.gestionPorHabitacion ? (
              <a href="#habitaciones">
                <Button
                  size="lg"
                  className="mt-5 h-12 w-full rounded-full text-sm font-bold shadow-lg shadow-primary/20"
                >
                  <CalendarCheck className="size-4" aria-hidden /> Ver habitaciones
                </Button>
              </a>
            ) : propiedad.disponible ? (
              <ReservationFormDialog
                propiedad={propiedad}
                trigger={
                  <Button
                    size="lg"
                    className="mt-5 h-12 w-full rounded-full text-sm font-bold shadow-lg shadow-primary/20"
                  >
                    <CalendarCheck className="size-4" aria-hidden /> Reservar cuarto
                  </Button>
                }
              />
            ) : (
              <>
                <Button
                  size="lg"
                  disabled
                  className="mt-5 h-12 w-full rounded-full text-sm font-bold"
                >
                  Ya no disponible
                </Button>
                <ContactLandlordDialog
                  propiedad={propiedad}
                  presetMensaje={`Hola, vi que "${propiedad.titulo}" ya no está disponible. ¿Me avisas si se libera o tienes algo similar?`}
                  trigger={
                    <Button
                      variant="outline"
                      size="lg"
                      className="mt-3 h-12 w-full rounded-full text-sm font-bold"
                    >
                      <BellRing className="size-4" aria-hidden /> Avísame si se libera
                    </Button>
                  }
                />
              </>
            )}

            <ContactLandlordDialog
              propiedad={propiedad}
              trigger={
                <Button
                  variant="outline"
                  size="lg"
                  className="mt-3 h-12 w-full rounded-full text-sm font-bold"
                >
                  <MessageCircle className="size-4" aria-hidden /> Contactar arrendador
                </Button>
              }
            />

            <Button
              variant="outline"
              size="lg"
              disabled={enviandoWhatsapp}
              onClick={contactarWhatsapp}
              className="mt-3 h-12 w-full rounded-full text-sm font-bold"
            >
              <Phone className="size-4" aria-hidden />
              {enviandoWhatsapp ? 'Abriendo…' : 'WhatsApp'}
            </Button>

            {!propiedad.gestionPorHabitacion && (propiedad.capacidadPersonas ?? 0) > 1 && (
              <div className="mt-3">
                <RoommateGroupsSection propiedadId={propiedad.id} />
              </div>
            )}

            {(propiedad.disponibleDesde || propiedad.vistas != null) && (
              <div className="mt-4 space-y-1.5 border-t border-border pt-4">
                {propiedad.disponibleDesde && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                    Disponible desde{' '}
                    {new Date(propiedad.disponibleDesde).toLocaleDateString('es-PE', {
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                )}
                {propiedad.vistas != null && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Eye className="size-3.5 shrink-0" aria-hidden />
                    {propiedad.vistas} vistas
                  </p>
                )}
              </div>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              Sin cargos hasta confirmar. La reserva se concreta al pagar el primer mes.
            </p>

            {propiedad.politicaCancelacion && (
              <CancellationTimeline politica={propiedad.politicaCancelacion} />
            )}
          </div>
        </aside>
      </div>

      {/* Propiedades similares */}
      {similares.length > 0 && (
        <section className="mt-12 space-y-4">
          <h2 className="text-h2">
            {propiedad.disponible
              ? 'También te puede interesar'
              : 'Este cuarto ya no está disponible — mira estas opciones'}
          </h2>
          <PropertyCarousel propiedades={similares} />
        </section>
      )}

      {/* FAB "volver" en móvil (#169) */}
      <Link
        href={exploarHref}
        aria-label="Volver a la búsqueda"
        className="fixed bottom-6 left-4 z-40 flex size-12 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg lg:hidden"
      >
        <ArrowLeft className="size-5" aria-hidden />
      </Link>
    </main>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof BedDouble;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-bold text-foreground">{value}</p>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/** Nav sticky con scroll-spy (#145): resalta la sección visible mientras se hace scroll. */
function SeccionNav({ items }: { items: { id: string; label: string }[] }) {
  const [activo, setActivo] = useState(items[0]?.id ?? '');

  useEffect(() => {
    const elementos = items
      .map((it) => document.getElementById(it.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elementos.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target?.id) setActivo(visible.target.id);
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );
    elementos.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav className="sticky top-16 z-30 -mx-6 mb-6 overflow-x-auto border-b border-border bg-background/95 px-6 backdrop-blur sm:-mx-12 sm:px-12 md:top-20">
      <div className="flex gap-5">
        {items.map((it) => (
          <a
            key={it.id}
            href={`#${it.id}`}
            className={cn(
              'shrink-0 border-b-2 py-3 text-xs font-bold transition-colors',
              activo === it.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {it.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

/** Timeline visual de la política de cancelación (#155). */
function CancellationTimeline({ politica }: { politica: PoliticaCancelacion }) {
  const info = POLITICA_CANCELACION_INFO[politica];
  const nodos =
    info.diasMin > 0
      ? [
          { label: 'Reservas', detalle: 'Confirmas tu reserva' },
          { label: `Día -${info.diasMin}`, detalle: 'Último día con reembolso completo' },
          { label: 'Check-in', detalle: 'Después de este plazo, sin reembolso' },
        ]
      : [
          { label: 'Reservas', detalle: 'Confirmas tu reserva' },
          { label: 'Check-in', detalle: 'Reembolso completo hasta el ingreso' },
        ];

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="flex items-center gap-2 text-xs font-bold text-foreground">
        <ShieldCheck className="size-3.5 shrink-0 text-primary" aria-hidden />
        Cancelación {info.label.toLowerCase()}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{info.descripcion}</p>
      <div className="mt-3 flex items-center">
        {nodos.map((n, i) => (
          <div key={n.label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1 text-center" title={n.detalle}>
              <span className="size-2 rounded-full bg-primary" aria-hidden />
              <span className="whitespace-nowrap text-[10px] font-bold text-foreground">{n.label}</span>
            </div>
            {i < nodos.length - 1 && <span className="mx-1 h-px flex-1 bg-border" aria-hidden />}
          </div>
        ))}
      </div>
    </div>
  );
}
