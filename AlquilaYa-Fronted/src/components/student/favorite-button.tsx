'use client';

import { Heart } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useFavorites } from '@/hooks/use-favorites';
import { useFavoritesStore } from '@/stores/favorites-store';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const { toggle } = useFavorites();
  // Ítem 433: selector granular por id — Zustand solo re-renderiza ESTE botón cuando
  // el resultado de `ids.has(propiedadId)` cambia de valor, no en cada toggle de
  // cualquier otra propiedad del listado (antes `esFavorito` venía de una suscripción
  // al store completo dentro de `useFavorites`, así que un solo toggle repintaba las
  // ~50 cards visibles).
  const activo = useFavoritesStore((s) => s.ids.has(propiedadId));
  const dims = sizeMap[size];
  const etiqueta = activo ? 'Quitar de favoritos' : 'Agregar a favoritos';

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle(propiedadId);
            }}
            aria-pressed={activo}
            aria-label={etiqueta}
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
        </TooltipTrigger>
        <TooltipContent side="top">{etiqueta}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
