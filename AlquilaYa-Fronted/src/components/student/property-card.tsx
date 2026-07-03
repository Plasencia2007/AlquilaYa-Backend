'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, MapPin } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

import { cn } from '@/lib/cn';
import { distanciaHaversineKm, formatearDistancia, resolverZona } from '@/lib/geo';
import { getZonasCached } from '@/lib/zonas-cache';
import type { ZonaResolucion } from '@/services/universidad-service';
import type { Propiedad } from '@/types/propiedad';

import { FavoriteButton } from './favorite-button';
import { PropertyBadges } from './property-badges';
import { PropertyCardImageCarousel } from './property-card-image-carousel';
import { PropertyCardKebabMenu } from './property-card-kebab-menu';
import { PropertyPersonalizationBadges } from './property-personalization-badges';
import { PropertyRating } from './property-rating';
import { ServiceBadges } from './service-badges';

const PropertyQuickViewDrawer = dynamic(
  () =>
    import('./property-quick-view-drawer').then(
      (m) => m.PropertyQuickViewDrawer,
    ),
  { ssr: false },
);

export type PropertyCardVariant = 'compact' | 'full' | 'feature';

interface Props {
  propiedad: Propiedad;
  variant?: PropertyCardVariant;
  showFavorite?: boolean;
  showDistance?: boolean;
  priority?: boolean;
  className?: string;
}

function PropertyCardImpl({
  propiedad,
  variant = 'full',
  showFavorite = true,
  showDistance = true,
  priority = false,
  className,
}: Props) {
  const isFeature = variant === 'feature';
  const isCompact = variant === 'compact';

  const hayRebaja =
    (propiedad.badges?.includes('REBAJA') ?? false) && propiedad.precioAnterior != null;

  const [zonas, setZonas] = useState<ZonaResolucion[]>([]);
  useEffect(() => {
    let cancelado = false;
    getZonasCached().then((z) => {
      if (!cancelado) setZonas(z);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const zonaProp = propiedad.coordenadas ? resolverZona(propiedad.coordenadas, zonas) : null;
  const campusProp =
    zonaProp && zonaProp.latitud != null && zonaProp.longitud != null
      ? { lat: zonaProp.latitud, lng: zonaProp.longitud }
      : null;
  const distancia =
    propiedad.coordenadas && campusProp
      ? distanciaHaversineKm(propiedad.coordenadas, campusProp)
      : null;
  const campusNombre = zonaProp?.universidadNombre ?? 'el campus';
  const href = `/property/${propiedad.id}`;

  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const router = useRouter();

  const sizes = isCompact
    ? '(min-width: 768px) 400px, 85vw'
    : '(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw';

  // Aspect ratio: feature = 16/9, resto = 4/3 (igual que Airbnb)
  const imageAspect = isFeature ? 'aspect-[16/9]' : 'aspect-[4/3]';

  return (
    <article
      className={cn(
        'group relative flex h-full cursor-pointer select-none flex-col bg-transparent',
        isCompact && 'rounded-3xl border border-stone-100 bg-white p-3 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]',
        className,
      )}
    >
      {/* ── IMAGEN ── */}
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-2xl',
          imageAspect,
        )}
        onClick={() => router.push(href)}
      >
        <PropertyCardImageCarousel
          imagenes={propiedad.imagenes}
          alt={propiedad.titulo}
          sizes={sizes}
          priority={priority}
          aspect={imageAspect}
        />

        {/* No disponible */}
        {!propiedad.disponible && (
          <div className="pointer-events-none absolute inset-0 z-[7] flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-white/95 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
              No disponible
            </span>
          </div>
        )}

        {/* Badges — superior izquierda */}
        <div className="absolute left-3 top-3 z-[8] flex flex-col items-start gap-1.5">
          <PropertyBadges badges={propiedad.badges} max={2} />
          <PropertyPersonalizationBadges propiedadId={propiedad.id} />
        </div>

        {/* Kebab + Favorito — superior derecha */}
        <div
          className="absolute right-3 top-3 z-[8] flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {!isCompact && (
            <PropertyCardKebabMenu propiedadId={propiedad.id} titulo={propiedad.titulo} />
          )}
          {showFavorite && (
            <FavoriteButton propiedadId={propiedad.id} size={isCompact ? 'sm' : 'md'} />
          )}
        </div>

        {/* Quick-view — inferior derecha, solo en hover */}
        {!isCompact && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setQuickViewOpen(true);
            }}
            aria-label="Vista rápida"
            className={cn(
              'absolute bottom-3 right-3 z-[8] flex size-8 items-center justify-center rounded-full bg-white/95 text-foreground shadow-md',
              'opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none',
            )}
          >
            <Eye className="size-3.5" aria-hidden />
          </button>
        )}
      </div>

      {/* ── INFO ── */}
      <Link
        href={href}
        className="flex flex-1 flex-col focus-visible:outline-none"
        tabIndex={-1}
      >
          {/* Info superior: título, ubicación, distancia, servicios */}
          <div className="mt-3 flex flex-col" style={{ gap: '3px' }}>
            <div className="flex items-start justify-between gap-3">
              <h3
                className={cn(
                  'flex-1 text-[15px] font-[500] leading-[19px] text-foreground',
                  isFeature ? 'line-clamp-2 text-xl font-semibold' : 'line-clamp-2',
                )}
              >
                {propiedad.titulo}
              </h3>
              <PropertyRating
                calificacion={propiedad.calificacion}
                totalResenas={propiedad.reseñas}
                fechaCreacion={propiedad.fechaCreacion}
                size="sm"
              />
            </div>

            <p className="flex items-center gap-1 text-[14px] leading-[18px] text-muted-foreground">
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{propiedad.ubicacion}</span>
            </p>

            {showDistance && distancia !== null && (
              <p className="truncate text-[13px] leading-[17px] text-muted-foreground">
                a {formatearDistancia(distancia)} de {campusNombre}
              </p>
            )}

            {!isCompact && (propiedad.servicios?.length ?? 0) > 0 && (
              <ServiceBadges
                servicios={propiedad.servicios}
                max={3}
                variant="plain"
                className="mt-1"
              />
            )}
          </div>

          {/* Precio — anclado al fondo del card con mt-auto */}
          <div className="mt-auto pt-3 flex items-baseline gap-1.5">
            {hayRebaja && (
              <span className="text-[14px] text-muted-foreground line-through">
                S/ {propiedad.precioAnterior!.toLocaleString('es-PE')}
              </span>
            )}
            <span
              className={cn(
                'text-[15px] font-bold leading-[19px]',
                hayRebaja ? 'text-primary' : 'text-foreground',
                isFeature && 'text-lg',
              )}
            >
              S/ {propiedad.precio.toLocaleString('es-PE')}
            </span>
            <span className="text-[14px] text-muted-foreground">por mes</span>
          </div>
      </Link>

      {!isCompact && quickViewOpen && (
        <PropertyQuickViewDrawer
          propiedad={propiedad}
          open={quickViewOpen}
          onClose={() => setQuickViewOpen(false)}
        />
      )}
    </article>
  );
}

export const PropertyCard = memo(PropertyCardImpl);
