'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useId, useRef, useState } from 'react';

import { cn } from '@/lib/cn';
import { esImagenExterna } from '@/lib/img';

interface Props {
  imagenes: string[];
  alt: string;
  sizes: string;
  priority?: boolean;
  aspect: string; // tailwind class e.g. 'aspect-[4/3]'
  className?: string;
}

const SWIPE_THRESHOLD = 50;

/**
 * Carrusel de imágenes para el card de propiedad.
 * - Desktop: flechas reveladas en hover + dots clicables.
 * - Móvil: swipe táctil (deltaX > 50px cambia slide).
 * - A11y: tablist con dots, live region anunciando cambio, aria-labels en flechas.
 * - Performance: imagen 0 con priority/eager, 1..N lazy.
 */
export function PropertyCardImageCarousel({
  imagenes,
  alt,
  sizes,
  priority = false,
  aspect,
  className,
}: Props) {
  const safeImages = imagenes && imagenes.length > 0 ? imagenes : ['/rooms/placeholder.jpg'];
  const total = safeImages.length;
  const tablistId = useId();

  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);

  const goTo = useCallback(
    (i: number) => {
      if (total === 0) return;
      const normalized = ((i % total) + total) % total;
      setIndex(normalized);
    },
    [total],
  );

  const onPrev = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      goTo(index - 1);
    },
    [goTo, index],
  );

  const onNext = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      goTo(index + 1);
    },
    [goTo, index],
  );

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchDeltaX.current = 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = (e.touches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
  };

  const onTouchEnd = () => {
    if (touchStartX.current === null) return;
    const delta = touchDeltaX.current;
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta < 0) goTo(index + 1);
      else goTo(index - 1);
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  // Caso simple: una sola imagen sin controles.
  if (total <= 1) {
    return (
      <div className={cn('relative w-full overflow-hidden', aspect, className)}>
        <Image
          fill
          sizes={sizes}
          src={safeImages[0]}
          alt={alt}
          priority={priority}
          unoptimized={esImagenExterna(safeImages[0])}
          className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
        />
      </div>
    );
  }

  return (
    <div
      className={cn('relative w-full overflow-hidden', aspect, className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Track de imágenes (apiladas, una visible) */}
      {safeImages.map((src, i) => (
        <Image
          key={`${src}-${i}`}
          fill
          sizes={sizes}
          src={src}
          alt={i === 0 ? alt : `${alt} — imagen ${i + 1}`}
          priority={i === 0 ? priority : false}
          loading={i === 0 ? undefined : 'lazy'}
          unoptimized={esImagenExterna(src)}
          className={cn(
            'object-cover transition-opacity duration-300 motion-safe:group-hover:scale-105 motion-safe:transition-transform motion-safe:duration-500',
            i === index ? 'opacity-100' : 'opacity-0 pointer-events-none',
          )}
          aria-hidden={i !== index}
        />
      ))}

      {/* Flechas desktop (hover) */}
      <button
        type="button"
        onClick={onPrev}
        aria-label="Imagen anterior"
        className={cn(
          'absolute left-2 top-1/2 z-[6] -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-white/95 text-foreground shadow-md backdrop-blur-md',
          'opacity-0 transition-opacity motion-safe:group-hover:opacity-100 hover:scale-110 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label="Imagen siguiente"
        className={cn(
          'absolute right-2 top-1/2 z-[6] -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-white/95 text-foreground shadow-md backdrop-blur-md',
          'opacity-0 transition-opacity motion-safe:group-hover:opacity-100 hover:scale-110 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>

      {/* Dots */}
      <div
        role="tablist"
        id={tablistId}
        aria-label="Selector de imagen"
        className="absolute inset-x-0 bottom-2 z-[6] flex items-center justify-center gap-1.5"
      >
        {safeImages.map((_, i) => {
          const active = i === index;
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-current={active ? 'true' : undefined}
              aria-label={`Ir a la imagen ${i + 1}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goTo(i);
              }}
              className={cn(
                'h-1.5 rounded-full transition-all',
                active ? 'w-4 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/80',
              )}
            />
          );
        })}
      </div>

      {/* Live region (visualmente oculto) */}
      <span
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        Imagen {index + 1} de {total}
      </span>
    </div>
  );
}
