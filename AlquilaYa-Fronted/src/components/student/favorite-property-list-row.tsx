'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';

import { Money } from '@/components/ui/money';
import { cn } from '@/lib/cn';
import { distanciaHaversineKm, formatearDistancia, resolverZona } from '@/lib/geo';
import { esImagenExterna } from '@/lib/img';
import { getZonasCached } from '@/lib/zonas-cache';
import type { ZonaResolucion } from '@/services/universidad-service';
import type { Propiedad } from '@/types/propiedad';

import { PropertyRating } from './property-rating';

interface Props {
  propiedad: Propiedad;
  className?: string;
}

/**
 * Fila compacta de favorito para la vista lista (ítem 247). Variante ad-hoc
 * en vez de forzar `PropertyCard` (pensada para grid) a una fila: solo pinta
 * los datos que ya trae `Propiedad` — foto, título, ubicación/distancia,
 * precio y rating — reusando `Money`/`PropertyRating` para mantener la misma
 * jerarquía visual que la card completa.
 *
 * La distancia al campus reusa `getZonasCached()` (caché a nivel de módulo
 * que ya comparte `PropertyCard`), no dispara una llamada nueva por fila.
 */
export function FavoritePropertyListRow({ propiedad, className }: Props) {
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

  const imagen = propiedad.imagenes?.[0] || '/rooms/placeholder.jpg';
  const href = `/property/${propiedad.id}`;

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition-shadow hover:shadow-card',
        !propiedad.disponible && 'opacity-70',
        className,
      )}
    >
      <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-20">
        <Image
          src={imagen}
          alt={propiedad.titulo}
          fill
          sizes="80px"
          unoptimized={esImagenExterna(imagen)}
          className="object-cover"
        />
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold leading-tight text-foreground sm:text-[15px]">
          {propiedad.titulo}
        </h3>
        <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{propiedad.ubicacion}</span>
          {distancia !== null && (
            <span className="shrink-0 whitespace-nowrap">
              · {formatearDistancia(distancia)} de {campusNombre}
            </span>
          )}
        </p>
        <div className="mt-1.5 flex items-center gap-3">
          <Money value={propiedad.precio} period="mes" size="sm" />
          <PropertyRating
            calificacion={propiedad.calificacion}
            totalResenas={propiedad.reseñas}
            size="sm"
          />
        </div>
      </div>

      {!propiedad.disponible && (
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          No disponible
        </span>
      )}
    </Link>
  );
}
