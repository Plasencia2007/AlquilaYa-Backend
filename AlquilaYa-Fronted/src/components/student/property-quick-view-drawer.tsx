'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Star, X } from 'lucide-react';

import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { distanciaAUpeuKm, formatearDistancia } from '@/lib/geo';
import { formatPEN } from '@/lib/money';
import type { Propiedad, PropiedadCompleta } from '@/types/propiedad';
import { ServiceBadges } from '@/components/student/service-badges';
import { PropertyBadges } from '@/components/student/property-badges';
import { esImagenExterna } from '@/lib/img';
import { PropertyLandlordStrip } from '@/components/student/property-landlord-strip';

interface Props {
  propiedad: Propiedad;
  open: boolean;
  onClose: () => void;
}

// -----------------------------------------------------------------------------
// Cache módulo-scope: persiste entre aperturas mientras el bundle viva.
// Clave: id como string. Valor: respuesta cruda del endpoint /completo.
// -----------------------------------------------------------------------------
const completoCache = new Map<string, PropiedadCompleta>();

/**
 * Hook: trae `GET /propiedades/{id}/completo` solo cuando el drawer está abierto.
 * Cachea por id en una `Map` módulo-scope para evitar refetch al reabrir.
 */
function usePropiedadCompleta(id: string, enabled: boolean) {
  const [data, setData] = useState<PropiedadCompleta | undefined>(
    () => completoCache.get(id),
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    () => enabled && !completoCache.has(id),
  );

  useEffect(() => {
    if (!enabled) return;
    if (completoCache.has(id)) {
      setData(completoCache.get(id));
      setIsLoading(false);
      return;
    }
    let cancel = false;
    setIsLoading(true);
    api
      .get<PropiedadCompleta>(`propiedades/${id}/completo`)
      .then((res) => {
        if (cancel) return;
        completoCache.set(id, res.data);
        setData(res.data);
      })
      .catch(() => {
        // Si falla, simplemente nos quedamos con los datos de lista.
        if (cancel) return;
        setData(undefined);
      })
      .finally(() => {
        if (!cancel) setIsLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [id, enabled]);

  return { data, isLoading };
}

// -----------------------------------------------------------------------------
// Mini-mapa: dynamic import para evitar SSR de Leaflet y mantener el drawer ligero.
// -----------------------------------------------------------------------------
const QuickViewMiniMap = dynamic(() => import('./property-quick-view-mini-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] w-full animate-pulse rounded-xl bg-muted" />
  ),
});

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function formatDisponibleDesde(iso?: string): string | null {
  if (!iso) return null;
  try {
    const date = iso.length === 10 ? parseISO(`${iso}T00:00:00`) : parseISO(iso);
    if (Number.isNaN(date.getTime())) return null;
    return format(date, "d 'de' MMMM yyyy", { locale: es });
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Componente
// -----------------------------------------------------------------------------
export function PropertyQuickViewDrawer({ propiedad, open, onClose }: Props) {
  const { data: completo, isLoading } = usePropiedadCompleta(propiedad.id, open);

  // Galería: preferir set completo del backend si llegó; fallback al de lista.
  const imagenes =
    completo?.imagenes && completo.imagenes.length > 0
      ? completo.imagenes
      : propiedad.imagenes;

  // Descripción: la del /completo suele ser más larga; fallback al de lista.
  const descripcion =
    (completo?.descripcion && completo.descripcion.trim().length > 0
      ? completo.descripcion
      : propiedad.descripcion) ?? '';

  // Servicios: usar del completo si hay; si no, los de lista.
  const servicios =
    completo?.serviciosIncluidos && completo.serviciosIncluidos.length > 0
      ? completo.serviciosIncluidos
      : propiedad.servicios;

  // Datos premium con fallback a propiedad.
  const tiempoRespuesta =
    completo?.tiempoRespuestaArrendador ?? propiedad.tiempoRespuestaArrendador;

  const arrendadorAvatar = completo?.arrendadorAvatar ?? propiedad.arrendadorAvatar;
  const arrendadorVerificado =
    completo?.arrendadorVerificado ?? propiedad.arrendadorVerificado;
  const arrendadorNombre = completo?.arrendadorNombre ?? propiedad.propietarioNombre;

  const disponibleDesdeRaw = completo?.disponibleDesde ?? propiedad.disponibleDesde;
  const disponibleDesde = formatDisponibleDesde(disponibleDesdeRaw);

  const distancia = distanciaAUpeuKm(propiedad.coordenadas);

  // Rebaja (ítem 133): precio anterior tachado + % de descuento, consistente con
  // la card y el detalle. Se apoya en el precio, no en el badge REBAJA.
  const hayRebaja =
    propiedad.precioAnterior != null && propiedad.precioAnterior > propiedad.precio;
  const descuentoPct = hayRebaja
    ? Math.round((1 - propiedad.precio / propiedad.precioAnterior!) * 100)
    : 0;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        aria-describedby={undefined}
        className={cn(
          // Base compartida con el patrón estándar de ui/sheet.tsx (ver mobile-nav.tsx)
          'flex flex-col gap-0 p-0 outline-none',
          // Mobile (<md): bottom sheet
          'max-h-[90dvh] rounded-t-2xl',
          // Desktop (md+): right drawer (override mobile rules)
          'md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:h-[100dvh] md:max-h-none',
          'md:w-full md:max-w-xl md:rounded-none md:border-l md:border-t-0',
          'md:data-[state=open]:slide-in-from-right md:data-[state=closed]:slide-out-to-right',
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-background/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate text-lg font-bold text-foreground">
              {propiedad.titulo}
            </SheetTitle>
            {propiedad.ubicacion && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {propiedad.ubicacion}
              </p>
            )}
            <PropertyBadges
              badges={propiedad.badges}
              orientation="horizontal"
              max={4}
              className="mt-1.5"
            />
          </div>
          <SheetClose
            className={cn(
              'rounded-full p-2 text-muted-foreground transition',
              'hover:bg-muted hover:text-foreground',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            aria-label="Cerrar vista rápida"
          >
            <X className="size-5" />
          </SheetClose>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain pb-24">
          {/* 1. Galería */}
          <section className="px-0 pt-3">
            {imagenes.length > 0 ? (
              <div
                className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 pb-2"
                style={{ scrollbarWidth: 'thin' }}
              >
                {imagenes.map((src, i) => (
                  <div
                    key={`${src}-${i}`}
                    className="relative h-64 w-[85%] flex-shrink-0 snap-start overflow-hidden rounded-xl bg-muted md:w-[80%]"
                  >
                    <Image
                      src={src}
                      alt={`${propiedad.titulo} – foto ${i + 1}`}
                      fill
                      sizes="(max-width: 768px) 85vw, 480px"
                      unoptimized={esImagenExterna(src)}
                      className="object-cover"
                      loading={i === 0 ? 'eager' : 'lazy'}
                      priority={i === 0}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="mx-5 h-64 rounded-xl bg-muted" />
            )}
          </section>

          <div className="space-y-6 px-5 pt-4">
            {/* 2. Precio + disponibilidad */}
            <section>
              <div className="flex items-baseline gap-2">
                {hayRebaja && (
                  <span className="tnum text-base font-semibold text-muted-foreground line-through">
                    {formatPEN(propiedad.precioAnterior!)}
                  </span>
                )}
                <span className="tnum text-3xl font-extrabold text-primary">
                  {formatPEN(propiedad.precio)}
                </span>
                {hayRebaja && descuentoPct > 0 && (
                  <span className="self-center rounded-md bg-success/15 px-1.5 py-0.5 text-[11px] font-bold leading-none text-success">
                    -{descuentoPct}%
                  </span>
                )}
                <span className="text-sm font-medium text-muted-foreground">
                  /mes
                </span>
              </div>
              {disponibleDesde && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Disponible desde {disponibleDesde}
                </p>
              )}
            </section>

            {/* 3. Calificación + reseñas + distancia */}
            <section className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-1.5">
                <Star className="size-4 fill-warning text-warning" />
                {propiedad.reseñas > 0 ? (
                  <span className="font-semibold text-foreground">
                    {propiedad.calificacion.toFixed(1)}
                    <span className="ml-1 font-normal text-muted-foreground">
                      ({propiedad.reseñas} {propiedad.reseñas === 1 ? 'reseña' : 'reseñas'})
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Sin reseñas</span>
                )}
              </div>
              {distancia !== null && (
                <span className="text-muted-foreground">
                  a {formatearDistancia(distancia)} de UPeU
                </span>
              )}
            </section>

            {/* 4. Descripción */}
            <section>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-foreground/80">
                Descripción
              </h3>
              {descripcion ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">
                  {descripcion}
                </p>
              ) : isLoading ? (
                <div className="space-y-2">
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                  <div className="h-3 w-[92%] animate-pulse rounded bg-muted" />
                  <div className="h-3 w-[78%] animate-pulse rounded bg-muted" />
                </div>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  Sin descripción disponible.
                </p>
              )}
            </section>

            {/* 5. Servicios */}
            {servicios.length > 0 ? (
              <section>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-foreground/80">
                  Servicios
                </h3>
                <ServiceBadges
                  servicios={servicios}
                  max={servicios.length}
                  variant="plain"
                />
              </section>
            ) : isLoading ? (
              <section>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-foreground/80">
                  Servicios
                </h3>
                <div className="flex gap-2">
                  <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                  <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
                  <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
                </div>
              </section>
            ) : null}

            {/* 6. Arrendador */}
            <section>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-foreground/80">
                Arrendador
              </h3>
              {arrendadorNombre ? (
                <PropertyLandlordStrip
                  nombre={arrendadorNombre}
                  avatar={arrendadorAvatar}
                  verificado={arrendadorVerificado}
                  size="md"
                />
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  Información no disponible.
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Responde en ~
                {tiempoRespuesta != null ? `${tiempoRespuesta} min` : '—'}
              </p>
            </section>

            {/* 7. Mini-mapa */}
            {propiedad.coordenadas && (
              <section>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-foreground/80">
                  Ubicación
                </h3>
                <div className="h-[200px] w-full overflow-hidden rounded-xl border">
                  <QuickViewMiniMap
                    lat={propiedad.coordenadas.lat}
                    lng={propiedad.coordenadas.lng}
                    titulo={propiedad.titulo}
                  />
                </div>
              </section>
            )}
          </div>
        </div>

        {/* 8. Footer CTA sticky */}
        <div className="absolute inset-x-0 bottom-0 border-t bg-background/95 px-5 py-3 backdrop-blur">
          <Link
            href={`/property/${propiedad.id}`}
            onClick={onClose}
            className={cn(
              'flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow transition',
              'hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            )}
          >
            Ver detalles completos
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default PropertyQuickViewDrawer;
