'use client';

import { use, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ArrowLeft,
  BadgeCheck,
  BedDouble,
  Building2,
  CalendarCheck,
  CalendarDays,
  Check,
  Eye,
  Flag,
  MapPin,
  MessageCircle,
  Footprints,
  Ruler,
  Share2,
  ShieldCheck,
  ShowerHead,
  Star,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { PropertyGallery } from '@/components/property/property-gallery';
import { PropertyReviews } from '@/components/property/property-reviews';
import { PropertyVideo } from '@/components/property/property-video';
import { ServiceBadges } from '@/components/student/service-badges';
import { PropertyBadges } from '@/components/student/property-badges';
import { PropertyCard } from '@/components/student/property-card';
import { POLITICA_CANCELACION_INFO } from '@/lib/politica-cancelacion';
import { AvailabilityPanel } from '@/components/student/availability-panel';
import { RoomList } from '@/components/student/room-list';
import { FavoriteButton } from '@/components/student/favorite-button';
import { ReportListingDialog } from '@/components/student/report-listing-dialog';
import { ReservationFormDialog } from '@/components/student/reservation-form-dialog';
import { ContactLandlordDialog } from '@/components/student/contact-landlord-dialog';
import { servicioPropiedades } from '@/services/property-service';
import {
  distanciaHaversineKm,
  formatearDistancia,
  googleMapsRutaUrl,
  minutosCaminando,
  resolverZona,
} from '@/lib/geo';
import { universidadService, type ZonaResolucion } from '@/services/universidad-service';
import { useHistory } from '@/hooks/use-history';
import { cn } from '@/lib/cn';
import { REGLAS_CATALOGO } from '@/types/propiedad';
import type { Propiedad } from '@/types/propiedad';

const PropertiesMap = dynamic(() => import('@/components/shared/PropertiesMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full rounded-2xl" />,
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
  const { registrar } = useHistory();

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

  if (estado === 'cargando') {
    return (
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-28 sm:px-12">
        <Skeleton className="aspect-[16/7] w-full rounded-2xl" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
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

  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-24 sm:px-12 md:pt-28">
      <Link
        href="/search"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden /> Volver a la búsqueda
      </Link>

      <PropertyGallery imagenes={propiedad.imagenes} alt={propiedad.titulo} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          {/* Encabezado */}
          <header className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      propiedad.disponible
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                    )}
                  >
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        propiedad.disponible ? 'bg-green-500' : 'bg-red-500',
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
                <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
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
                    <Check className="size-4 text-green-500" aria-hidden />
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
              <span className="flex items-center gap-1.5 font-bold text-foreground">
                <Star className="size-4 fill-yellow-500 text-yellow-500" aria-hidden />
                {propiedad.calificacion.toFixed(1)}
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
              <h2 className="font-headline text-xl font-bold">Habitaciones disponibles</h2>
              <p className="text-sm text-muted-foreground">
                Este inmueble se alquila por habitaciones. Elige y reserva el cuarto que prefieras.
              </p>
              <RoomList propiedad={propiedad} />
            </section>
          )}

          {/* Descripción */}
          <section className="space-y-3">
            <h2 className="font-headline text-xl font-bold">Sobre este cuarto</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{propiedad.descripcion}</p>
          </section>

          {/* Video de la propiedad */}
          {propiedad.videoUrl && (
            <section className="space-y-3">
              <h2 className="font-headline text-xl font-bold">Video</h2>
              <PropertyVideo url={propiedad.videoUrl} titulo={propiedad.titulo} />
            </section>
          )}

          {/* Disponibilidad (a nivel inmueble; en modo por-habitación el estado va por cuarto) */}
          {!propiedad.gestionPorHabitacion && (
            <section className="space-y-3">
              <h2 className="font-headline text-xl font-bold">Disponibilidad</h2>
              <AvailabilityPanel propiedadId={propiedad.id} />
            </section>
          )}

          {/* Servicios — incluido vs. se paga aparte */}
          {(() => {
            const estado = propiedad.serviciosEstado;
            const incluidos = estado
              ? estado.filter((s) => s.estado === 'INCLUIDO').map((s) => s.servicio)
              : propiedad.servicios;
            const aparte = estado ? estado.filter((s) => s.estado === 'APARTE').map((s) => s.servicio) : [];
            return (
              <section className="space-y-4">
                <h2 className="font-headline text-xl font-bold">Servicios</h2>
                {incluidos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-success)]">
                      Incluido en el precio
                    </p>
                    <ServiceBadges servicios={incluidos} max={incluidos.length} variant="plain" />
                  </div>
                )}
                {aparte.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Se paga aparte</p>
                    <ServiceBadges servicios={aparte} max={aparte.length} variant="plain" />
                  </div>
                )}
                {incluidos.length === 0 && aparte.length === 0 && (
                  <p className="text-sm text-muted-foreground">No especificados</p>
                )}
              </section>
            );
          })()}

          {/* Reglas */}
          {propiedad.reglas && propiedad.reglas.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-headline text-xl font-bold">Reglas de la casa</h2>
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
            <h2 className="font-headline text-xl font-bold">Sobre el arrendador</h2>
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {propiedad.arrendadorAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={propiedad.arrendadorAvatar}
                    alt={propiedad.propietarioNombre}
                    className="size-14 rounded-full object-cover"
                  />
                ) : (
                  <User className="size-6" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-bold text-foreground">
                    {propiedad.propietarioNombre || 'Arrendador'}
                  </span>
                  {propiedad.arrendadorVerificado && (
                    <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verificado" />
                  )}
                </div>
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

          {/* Reseñas */}
          <PropertyReviews
            propiedadId={propiedad.id}
            calificacion={propiedad.calificacion}
            totalResenas={propiedad.reseñas}
          />

          {/* Mapa */}
          {propiedad.coordenadas && (
            <section className="space-y-3">
              <h2 className="font-headline text-xl font-bold">Ubicación</h2>

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

              <div className="overflow-hidden rounded-2xl border border-border">
                <PropertiesMap propiedades={[propiedad]} className="h-[320px] w-full" />
              </div>
              <p className="text-[11px] text-muted-foreground/70">
                El tiempo a pie es estimado; toca un modo para ver la ruta y el tiempo reales en Google Maps.
              </p>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">
              {propiedad.gestionPorHabitacion ? 'Habitaciones desde' : 'Precio mensual'}
            </p>
            {propiedad.badges?.includes('REBAJA') && propiedad.precioAnterior != null && (
              <p className="mt-1 flex items-center gap-2">
                <span className="text-base font-semibold text-muted-foreground line-through">
                  S/ {propiedad.precioAnterior.toLocaleString('es-PE')}
                </span>
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Rebaja
                </span>
              </p>
            )}
            <p className="mt-1 text-3xl font-black text-primary">
              S/ {propiedad.precio.toLocaleString('es-PE')}
              <span className="ml-1 text-sm font-normal text-muted-foreground">/mes</span>
            </p>

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
                    <span className="shrink-0 font-bold text-foreground">
                      S/{t.precio.toLocaleString('es-PE')}
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
            ) : (
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
              <div className="mt-4 border-t border-border pt-4">
                <p className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <ShieldCheck className="size-3.5 shrink-0 text-primary" aria-hidden />
                  Cancelación{' '}
                  {POLITICA_CANCELACION_INFO[propiedad.politicaCancelacion].label.toLowerCase()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {POLITICA_CANCELACION_INFO[propiedad.politicaCancelacion].descripcion}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Propiedades similares */}
      {similares.length > 0 && (
        <section className="mt-12 space-y-4">
          <h2 className="font-headline text-xl font-bold">También te puede interesar</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {similares.map((s) => (
              <PropertyCard key={s.id} propiedad={s} variant="compact" />
            ))}
          </div>
        </section>
      )}
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
