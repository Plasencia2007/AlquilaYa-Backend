'use client';

import { useState } from 'react';
import Image from 'next/image';

import { cn } from '@/lib/cn';

interface Props {
  imagenes: string[];
  alt: string;
}

export function PropertyGallery({ imagenes, alt }: Props) {
  const [index, setIndex] = useState(0);
  const total = imagenes.length;
  if (total === 0) {
    return (
      <div className="flex aspect-[16/10] w-full items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
        Sin imágenes
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-muted">
        <Image
          fill
          priority
          sizes="(min-width: 1024px) 800px, 100vw"
          src={imagenes[index]}
          alt={alt}
          className="object-cover"
        />
        <span className="absolute bottom-4 right-4 rounded-full bg-black/70 px-3 py-1 text-[11px] font-bold text-white">
          {index + 1} / {total}
        </span>
      </div>

      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
          {imagenes.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ver imagen ${i + 1}`}
              className={cn(
                'relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 transition-all',
                i === index ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <Image
                fill
                sizes="112px"
                src={img}
                alt={`${alt} ${i + 1}`}
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
