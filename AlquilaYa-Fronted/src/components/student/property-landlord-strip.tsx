'use client';

import * as Avatar from '@radix-ui/react-avatar';
import { BadgeCheck } from 'lucide-react';

import { iniciales } from '@/lib/avatar';
import { cn } from '@/lib/cn';

interface Props {
  nombre: string;
  avatar?: string;
  verificado?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const sizeMap = {
  sm: {
    avatar: 'size-5 text-[9px]',
    text: 'text-xs',
    icon: 'size-3.5',
  },
  md: {
    avatar: 'size-7 text-[11px]',
    text: 'text-sm',
    icon: 'size-4',
  },
};

/**
 * Fila pequeña: avatar (Radix con fallback de iniciales) + nombre + badge verificado.
 * Usado en variantes `full` y `feature` del card.
 */
export function PropertyLandlordStrip({
  nombre,
  avatar,
  verificado,
  size = 'sm',
  className,
}: Props) {
  const dims = sizeMap[size];

  return (
    <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
      <Avatar.Root
        className={cn(
          'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-muted align-middle',
          dims.avatar,
        )}
      >
        {avatar && (
          <Avatar.Image
            src={avatar}
            alt={nombre}
            className="h-full w-full object-cover"
          />
        )}
        <Avatar.Fallback
          delayMs={avatar ? 300 : 0}
          className="flex h-full w-full items-center justify-center bg-primary/15 font-bold uppercase text-primary"
        >
          {iniciales(nombre)}
        </Avatar.Fallback>
      </Avatar.Root>
      <span className={cn('truncate font-medium text-foreground/80', dims.text)}>
        {nombre}
      </span>
      {verificado && (
        <BadgeCheck
          className={cn('shrink-0 text-primary', dims.icon)}
          aria-label="Arrendador verificado"
        />
      )}
    </div>
  );
}
