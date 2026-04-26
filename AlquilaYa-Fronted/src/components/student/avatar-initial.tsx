'use client';

import { colorDeNombre, iniciales } from '@/lib/avatar';
import { cn } from '@/lib/cn';

interface Props {
  nombre: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-12 text-base',
  xl: 'size-16 text-xl',
};

/**
 * Avatar circular generado del nombre. Color HSL determinista, iniciales de 1-2 letras.
 */
export function AvatarInitial({ nombre, size = 'md', className }: Props) {
  const { bg, fg } = colorDeNombre(nombre);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold uppercase',
        sizeMap[size],
        className,
      )}
      style={{ backgroundColor: bg, color: fg }}
      aria-hidden
    >
      {iniciales(nombre)}
    </span>
  );
}
