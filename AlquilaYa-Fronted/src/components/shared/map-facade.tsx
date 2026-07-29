'use client';

import { MapPin } from 'lucide-react';

import { cn } from '@/lib/cn';

interface Props {
  className?: string;
  /** Si se pasa, la facade es clickeable y fuerza el montaje del mapa real sin esperar
   *  el scroll (accesible por teclado). Si se omite, es puramente decorativa. */
  onActivate?: () => void;
  label?: string;
}

/**
 * Ítem 421 — facade liviana para mapas Leaflet diferidos: se muestra hasta que la
 * sección entra en viewport (`useInView`) y recién ahí se monta el `dynamic(...,
 * {ssr:false})` real, así Leaflet + los tiles de OpenStreetMap no se descargan si el
 * usuario no llega a ver el mapa.
 */
export function MapFacade({ className, onActivate, label = 'Ver mapa' }: Props) {
  const contenido = (
    <>
      <MapPin className="size-7" aria-hidden />
      <span className="text-xs font-semibold">{label}</span>
    </>
  );
  const cls = cn(
    'flex w-full flex-col items-center justify-center gap-2 rounded-[inherit]',
    'bg-gradient-to-br from-muted to-muted/60 text-muted-foreground',
    onActivate && 'cursor-pointer transition-colors hover:text-foreground',
    className,
  );

  if (onActivate) {
    return (
      <button type="button" onClick={onActivate} className={cls}>
        {contenido}
      </button>
    );
  }
  return <div className={cls}>{contenido}</div>;
}
