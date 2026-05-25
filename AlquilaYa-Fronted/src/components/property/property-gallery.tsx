'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

import { cn } from '@/lib/cn';

interface Props {
  imagenes: string[];
  alt: string;
}

export function PropertyGallery({ imagenes, alt }: Props) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const total = imagenes.length;

  useEffect(() => {
    if (total <= 1 && !fullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + total) % total);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % total);
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [total, fullscreen]);

  useEffect(() => {
    document.body.style.overflow = fullscreen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [fullscreen]);

  if (total === 0) {
    return (
      <div className="flex aspect-[16/7] w-full items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
        Sin imágenes
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="group relative aspect-[16/7] w-full overflow-hidden rounded-2xl bg-muted">
          <Image
            fill
            priority
            sizes="(min-width: 1024px) 800px, 100vw"
            src={imagenes[index]}
            alt={alt}
            className="cursor-zoom-in object-cover transition-opacity duration-300"
            onClick={() => setFullscreen(true)}
          />

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={() => setIndex((i) => (i - 1 + total) % total)}
                aria-label="Imagen anterior"
                className="absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/70 group-hover:opacity-100"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setIndex((i) => (i + 1) % total)}
                aria-label="Imagen siguiente"
                className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/70 group-hover:opacity-100"
              >
                <ChevronRight className="size-5" aria-hidden />
              </button>
            </>
          )}

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
                aria-current={i === index}
                className={cn(
                  'relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 transition-all',
                  i === index ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100',
                )}
              >
                <Image fill sizes="112px" src={img} alt={`${alt} ${i + 1}`} className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {fullscreen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
            onClick={() => setFullscreen(false)}
          >
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              aria-label="Cerrar"
              className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="size-5" aria-hidden />
            </button>

            <span className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-white">
              {index + 1} / {total}
            </span>

            <div
              className="relative max-h-[85vh] w-full max-w-5xl px-14"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl">
                <Image
                  fill
                  src={imagenes[index]}
                  alt={alt}
                  sizes="(min-width: 1280px) 1024px, 100vw"
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIndex((i) => (i - 1 + total) % total);
                  }}
                  aria-label="Imagen anterior"
                  className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <ChevronLeft className="size-6" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIndex((i) => (i + 1) % total);
                  }}
                  aria-label="Imagen siguiente"
                  className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <ChevronRight className="size-6" aria-hidden />
                </button>
              </>
            )}

            {total > 1 && (
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
                {imagenes.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIndex(i);
                    }}
                    aria-label={`Ir a imagen ${i + 1}`}
                    className={cn(
                      'size-1.5 rounded-full transition-all',
                      i === index ? 'w-4 bg-white' : 'bg-white/40',
                    )}
                  />
                ))}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
