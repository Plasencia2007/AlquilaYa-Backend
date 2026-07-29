'use client';

import { useState } from 'react';
import Image from 'next/image';

import { AvatarInitial } from '@/components/student/avatar-initial';
import { cn } from '@/lib/cn';
import { esImagenExterna } from '@/lib/img';

interface Props {
  src?: string | null;
  nombre: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  xs: 'size-6',
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
  xl: 'size-16',
};

/**
 * Avatar único: foto (next/image, `unoptimized` para hosts externos vía
 * `esImagenExterna`) con fallback a iniciales de color determinista
 * (`AvatarInitial` + `lib/avatar.ts`) — ítem 54 de MEJORAS.md.
 */
export function UserAvatar({ src, nombre, size = 'md', className }: Props) {
  const [erroredSrc, setErroredSrc] = useState<string | null>(null);

  if (!src || erroredSrc === src) {
    return <AvatarInitial nombre={nombre} size={size} className={className} />;
  }

  return (
    <span
      className={cn(
        'relative inline-block shrink-0 overflow-hidden rounded-full bg-muted',
        SIZE_MAP[size],
        className,
      )}
    >
      <Image
        src={src}
        alt={nombre || 'Avatar'}
        fill
        sizes="64px"
        unoptimized={esImagenExterna(src)}
        onError={() => setErroredSrc(src)}
        className="object-cover"
      />
    </span>
  );
}
