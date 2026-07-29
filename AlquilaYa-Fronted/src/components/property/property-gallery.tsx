'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { esImagenExterna } from '@/lib/img';
import { imgUrl } from '@/lib/cloudinary';
import { useFocusTrap } from '@/hooks/use-focus-trap';

interface Props {
  imagenes: string[];
  alt: string;
}

/**
 * Placeholder LQIP (ítem 419): para fotos de Cloudinary genera un `blurDataURL`
 * minúsculo (50px, muy comprimido) vía `imgUrl(..., { blur: true })`. Las URLs
 * externas (pegadas por el arrendador) no pasan por Cloudinary — `imgUrl` las
 * devuelve intactas, así que pedir esa versión "blur" descargaría la MISMA foto
 * completa dos veces; para esas se omite el placeholder.
 */
function blurProps(src: string): Pick<React.ComponentProps<typeof Image>, 'placeholder' | 'blurDataURL'> {
  if (esImagenExterna(src)) return {};
  return { placeholder: 'blur', blurDataURL: imgUrl(src, { blur: true }) };
}

export function PropertyGallery({ imagenes, alt }: Props) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const total = imagenes.length;
  // Ítem 396: focus trap básico del lightbox — solo Tab/Shift+Tab + devolver el
  // foco al cerrar (Escape ya lo maneja el listener de flechas de más abajo).
  const trapRef = useFocusTrap<HTMLDivElement>({ active: fullscreen });

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

  // Cuántas celdas pequeñas mostrar a la derecha (0-4) y cuántas fotos quedan ocultas tras el overlay "+N".
  const smallCount = Math.min(total - 1, 4);
  const overlayCount = total > 5 ? total - 5 : 0;

  // Ítem 418: el grid desktop activa a `md` (768px) y no vuelve a cambiar de
  // columnas después (grid-cols-4 fijo) — antes el `sizes` de la imagen
  // grande usaba 1024px como pivote, que no corresponde a ningún breakpoint
  // real de este grid. Sin celdas pequeñas ocupa el 100% del contenedor
  // (col-span-4); con ellas, el 50% (col-span-2 de 4).
  const mainSizes = smallCount === 0 ? '100vw' : '(min-width: 768px) 50vw, 100vw';

  // Distribución de las celdas pequeñas dentro del grid 4 cols x 2 rows, adaptada para no dejar huecos
  // ni repetir fotos cuando hay menos de 5 imágenes.
  const smallCellClasses: string[] =
    smallCount === 1
      ? ['col-start-3 row-start-1 col-span-2 row-span-2']
      : smallCount === 2
        ? ['col-start-3 row-start-1 col-span-2 row-span-1', 'col-start-3 row-start-2 col-span-2 row-span-1']
        : smallCount === 3
          ? [
              'col-start-3 row-start-1 col-span-1 row-span-1',
              'col-start-4 row-start-1 col-span-1 row-span-1',
              'col-start-3 row-start-2 col-span-2 row-span-1',
            ]
          : smallCount === 4
            ? [
                'col-start-3 row-start-1 col-span-1 row-span-1',
                'col-start-4 row-start-1 col-span-1 row-span-1',
                'col-start-3 row-start-2 col-span-1 row-span-1',
                'col-start-4 row-start-2 col-span-1 row-span-1',
              ]
            : [];

  return (
    <>
      <div className="space-y-3">
        {/* Mobile: carrusel simple (hero + tira de miniaturas) */}
        <div className="md:hidden">
          <div className="group relative aspect-[16/7] w-full overflow-hidden rounded-2xl bg-muted">
            <Image
              fill
              priority
              sizes="100vw"
              src={imagenes[index]}
              alt={`Foto ${index + 1} de ${alt}`}
              unoptimized={esImagenExterna(imagenes[index])}
              {...blurProps(imagenes[index])}
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
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
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
                  <Image
                    fill
                    sizes="112px"
                    src={img}
                    alt={`Foto ${i + 1} de ${alt}`}
                    unoptimized={esImagenExterna(img)}
                    {...blurProps(img)}
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop: grid estilo Airbnb (1 grande + hasta 4 pequeñas) */}
        <div className="hidden h-[420px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl md:grid lg:h-[480px]">
          <button
            type="button"
            onClick={() => {
              setIndex(0);
              setFullscreen(true);
            }}
            aria-label={`Ver imagen 1 de ${total}`}
            className={cn(
              'group relative col-start-1 row-start-1 row-span-2 overflow-hidden bg-muted',
              smallCount === 0 ? 'col-span-4' : 'col-span-2',
            )}
          >
            <Image
              fill
              priority
              sizes={mainSizes}
              src={imagenes[0]}
              alt={`Foto 1 de ${alt}`}
              unoptimized={esImagenExterna(imagenes[0])}
              {...blurProps(imagenes[0])}
              className="cursor-zoom-in object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </button>

          {smallCellClasses.map((cellClassName, i) => {
            const imgIndex = i + 1;
            const isOverlay = overlayCount > 0 && i === smallCellClasses.length - 1;

            return (
              <button
                key={imgIndex}
                type="button"
                onClick={() => {
                  setIndex(imgIndex);
                  setFullscreen(true);
                }}
                aria-label={isOverlay ? `Ver todas las fotos (${total})` : `Ver imagen ${imgIndex + 1} de ${total}`}
                className={cn('group relative overflow-hidden bg-muted', cellClassName)}
              >
                <Image
                  fill
                  sizes="(min-width: 768px) 30vw, 100vw"
                  src={imagenes[imgIndex]}
                  alt={`Foto ${imgIndex + 1} de ${alt}`}
                  unoptimized={esImagenExterna(imagenes[imgIndex])}
                  {...blurProps(imagenes[imgIndex])}
                  className="cursor-zoom-in object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {isOverlay && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-base font-bold text-white transition-colors group-hover:bg-black/65">
                    +{overlayCount} fotos
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {fullscreen &&
        createPortal(
          <div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Galería de fotos: ${alt}`}
            tabIndex={-1}
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
                  alt={`Foto ${index + 1} de ${alt}`}
                  sizes="(min-width: 1280px) 1024px, 100vw"
                  unoptimized={esImagenExterna(imagenes[index])}
                  {...blurProps(imagenes[index])}
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
