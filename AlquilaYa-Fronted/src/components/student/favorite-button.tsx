'use client';

import { Heart } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useFavorites } from '@/hooks/use-favorites';

interface Props {
  propiedadId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { box: 'size-8', icon: 'size-4' },
  md: { box: 'size-10', icon: 'size-5' },
  lg: { box: 'size-12', icon: 'size-6' },
};

export function FavoriteButton({ propiedadId, className, size = 'md' }: Props) {
  const { esFavorito, toggle } = useFavorites();
  const activo = esFavorito(propiedadId);
  const dims = sizeMap[size];

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(propiedadId);
      }}
      aria-pressed={activo}
      aria-label={activo ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      className={cn(
        'flex items-center justify-center rounded-full bg-white/95 backdrop-blur-md shadow-md transition-all',
        'hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        dims.box,
        className,
      )}
    >
      <Heart
        className={cn(
          dims.icon,
          'transition-colors',
          activo ? 'fill-primary text-primary' : 'text-foreground/70',
        )}
        aria-hidden
      />
    </button>
  );
}
