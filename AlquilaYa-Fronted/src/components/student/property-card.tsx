'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Star } from 'lucide-react';

import { cn } from '@/lib/cn';
import { distanciaAUpeuKm, formatearDistancia } from '@/lib/geo';
import type { Propiedad } from '@/types/propiedad';

import { FavoriteButton } from './favorite-button';
import { ServiceBadges } from './service-badges';

export type PropertyCardVariant = 'compact' | 'full' | 'feature';

interface Props {
  propiedad: Propiedad;
  variant?: PropertyCardVariant;
  showFavorite?: boolean;
  showDistance?: boolean;
  className?: string;
}

const variantConfig: Record<
  PropertyCardVariant,
  {
    aspect: string;
    title: string;
    showBadges: boolean;
    titleClamp: string;
  }
> = {
  compact: {
    aspect: 'aspect-[4/5]',
    title: 'text-base md:text-lg',
    showBadges: false,
    titleClamp: 'line-clamp-1',
  },
  full: {
    aspect: 'aspect-[4/3]',
    title: 'text-base md:text-lg',
    showBadges: true,
    titleClamp: 'line-clamp-2',
  },
  feature: {
    aspect: 'aspect-[16/9]',
    title: 'text-2xl md:text-3xl',
    showBadges: true,
    titleClamp: 'line-clamp-2',
  },
};

export function PropertyCard({
  propiedad,
  variant = 'full',
  showFavorite = true,
  showDistance = true,
  className,
}: Props) {
  const cfg = variantConfig[variant];
  const distancia = distanciaAUpeuKm(propiedad.coordenadas);
  const imagen = propiedad.imagenes[0] ?? '/rooms/placeholder.jpg';
  const href = `/property/${propiedad.id}`;

  return (
    <Link
      href={href}
      className={cn(
        'group relative block overflow-hidden rounded-2xl border border-border bg-card text-card-foreground transition-all',
        'hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <div className={cn('relative w-full overflow-hidden', cfg.aspect)}>
        <Image
          fill
          sizes={
            variant === 'compact'
              ? '(min-width: 768px) 400px, 85vw'
              : '(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw'
          }
          src={imagen}
          alt={propiedad.titulo}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {!propiedad.disponible && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-white/95 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
              No disponible
            </span>
          </div>
        )}

        {showFavorite && (
          <FavoriteButton
            propiedadId={propiedad.id}
            size="md"
            className="absolute right-3 top-3 z-10"
          />
        )}

        {cfg.showBadges && propiedad.servicios.length > 0 && (
          <div className="absolute inset-x-3 bottom-3 z-[5]">
            <ServiceBadges servicios={propiedad.servicios} max={3} variant="overlay" />
          </div>
        )}
      </div>

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
          <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-foreground">
            <Star className="size-3.5 fill-yellow-500 text-yellow-500" aria-hidden />
            {propiedad.calificacion.toFixed(1)}
          </div>
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

        <div className="mt-2 flex items-baseline justify-between gap-2">
          <p className="text-xl font-black text-primary">
            S/ {propiedad.precio.toLocaleString('es-PE')}
            <span className="ml-1 text-xs font-normal text-muted-foreground">/mes</span>
          </p>
          {variant === 'feature' && (
            <span className="text-xs font-bold uppercase tracking-wider text-primary group-hover:underline">
              Ver detalles →
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
