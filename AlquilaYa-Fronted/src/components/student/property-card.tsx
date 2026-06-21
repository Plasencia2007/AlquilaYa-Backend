'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Eye, MapPin } from 'lucide-react';
import { memo, useState } from 'react';

import { cn } from '@/lib/cn';
import { distanciaAUpeuKm, formatearDistancia } from '@/lib/geo';
import type { Propiedad } from '@/types/propiedad';

import { FavoriteButton } from './favorite-button';
import { PropertyBadges } from './property-badges';
import { PropertyCardImageCarousel } from './property-card-image-carousel';
import { PropertyCardKebabMenu } from './property-card-kebab-menu';
import { PropertyLandlordStrip } from './property-landlord-strip';
import { PropertyPersonalizationBadges } from './property-personalization-badges';
import { PropertyRating } from './property-rating';
import { ServiceBadges } from './service-badges';

// Quick-view drawer cargado solo cuando se abre (Agent 5).
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
  /** Imagen 0 con `priority` (above-the-fold). */
  priority?: boolean;
  className?: string;
}

const variantConfig: Record<
  PropertyCardVariant,
  {
    aspect: string;
    title: string;
    showBadges: boolean;
    titleClamp: string;
    maxServiceBadges: number;
  }
> = {
  compact: {
    aspect: 'aspect-[4/5]',
    title: 'text-base md:text-lg',
    showBadges: false,
    titleClamp: 'line-clamp-1',
    maxServiceBadges: 3,
  },
  full: {
    aspect: 'aspect-[4/3]',
    title: 'text-base md:text-lg',
    showBadges: true,
    titleClamp: 'line-clamp-2',
    maxServiceBadges: 3,
  },
  feature: {
    aspect: 'aspect-[16/9]',
    title: 'text-2xl md:text-3xl',
    showBadges: true,
    titleClamp: 'line-clamp-2',
    maxServiceBadges: 4,
  },
};

function PropertyCardImpl({
  propiedad,
  variant = 'full',
  showFavorite = true,
  showDistance = true,
  priority = false,
  className,
}: Props) {
  const cfg = variantConfig[variant];
  const hayRebaja =
    (propiedad.badges?.includes('REBAJA') ?? false) && propiedad.precioAnterior != null;
  const distancia = distanciaAUpeuKm(propiedad.coordenadas);
  const href = `/property/${propiedad.id}`;
  const isCompact = variant === 'compact';
  const showKebab = !isCompact;
  const showLandlord = !isCompact;
  const showQuickView = !isCompact;

  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const sizes = isCompact
    ? '(min-width: 768px) 400px, 85vw'
    : '(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw';

  return (
    <article
      className={cn(
        'group relative block overflow-hidden rounded-2xl border border-border bg-card text-card-foreground transition-all',
        'motion-safe:hover:-translate-y-1 hover:shadow-xl focus-within:ring-2 focus-within:ring-ring',
        className,
      )}
    >
      <div className={cn('relative w-full overflow-hidden', cfg.aspect)}>
        <PropertyCardImageCarousel
          imagenes={propiedad.imagenes}
          alt={propiedad.titulo}
          sizes={sizes}
          priority={priority}
          aspect={cfg.aspect}
        />

        {!propiedad.disponible && (
          <div className="pointer-events-none absolute inset-0 z-[7] flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-white/95 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
              No disponible
            </span>
          </div>
        )}

        {/* Badges automáticos + personalización — esquina superior izquierda */}
        <div className="absolute left-3 top-3 z-[8] flex flex-col items-start gap-1.5">
          <PropertyBadges badges={propiedad.badges} max={isCompact ? 2 : 3} />
          <PropertyPersonalizationBadges propiedadId={propiedad.id} />
        </div>

        {/* Esquina superior derecha: kebab (a la izquierda) + favorito */}
        <div className="absolute right-3 top-3 z-[8] flex items-center gap-1.5">
          {showKebab && (
            <PropertyCardKebabMenu propiedadId={propiedad.id} titulo={propiedad.titulo} />
          )}
          {showFavorite && (
            <FavoriteButton
              propiedadId={propiedad.id}
              size={isCompact ? 'sm' : 'md'}
            />
          )}
        </div>

        {/* Quick-view trigger — visible en hover desktop */}
        {showQuickView && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setQuickViewOpen(true);
            }}
            aria-label="Vista rápida"
            className={cn(
              'absolute bottom-3 right-3 z-[8] flex size-9 items-center justify-center rounded-full bg-white/95 text-foreground shadow-md backdrop-blur-md',
              'opacity-0 transition-opacity motion-safe:group-hover:opacity-100 hover:scale-110 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <Eye className="size-4" aria-hidden />
          </button>
        )}

        {cfg.showBadges && (propiedad.servicios?.length ?? 0) > 0 && (
          <div className="absolute inset-x-3 bottom-3 z-[5]">
            <ServiceBadges
              servicios={propiedad.servicios}
              max={cfg.maxServiceBadges}
              variant="overlay"
            />
          </div>
        )}
      </div>

      {/* Link solo sobre el bloque textual (evita anidamiento interactivo) */}
      <Link
        href={href}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-b-2xl"
      >
        <div className="flex flex-col gap-1.5 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3
              className={cn(
                'flex-1 font-bold leading-tight text-foreground',
                cfg.title,
                cfg.titleClamp,
              )}
            >
              {propiedad.titulo}
            </h3>
            <PropertyRating
              calificacion={propiedad.calificacion}
              totalResenas={propiedad.reseñas}
              fechaCreacion={propiedad.fechaCreacion}
              size={variant === 'feature' ? 'md' : 'sm'}
            />
          </div>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{propiedad.ubicacion}</span>
            {showDistance && distancia !== null && (
              <>
                <span aria-hidden>·</span>
                <span className="font-semibold text-primary">
                  a {formatearDistancia(distancia)} de UPeU
                </span>
              </>
            )}
          </p>

          {showLandlord && propiedad.propietarioNombre && (
            <PropertyLandlordStrip
              nombre={propiedad.propietarioNombre}
              avatar={propiedad.arrendadorAvatar}
              verificado={propiedad.arrendadorVerificado}
              size={variant === 'feature' ? 'md' : 'sm'}
              className="mt-1"
            />
          )}

          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2">
              {hayRebaja && (
                <span className="text-sm font-semibold text-muted-foreground line-through">
                  S/ {propiedad.precioAnterior!.toLocaleString('es-PE')}
                </span>
              )}
              <p className="text-xl font-black text-primary">
                S/ {propiedad.precio.toLocaleString('es-PE')}
                <span className="ml-1 text-xs font-normal text-muted-foreground">/mes</span>
              </p>
            </div>
            {variant === 'feature' && (
              <span className="text-xs font-bold uppercase tracking-wider text-primary group-hover:underline">
                Ver detalles →
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Quick-view drawer (lazy-loaded) */}
      {showQuickView && quickViewOpen && (
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
