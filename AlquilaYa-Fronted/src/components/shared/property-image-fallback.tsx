import { cn } from '@/lib/cn';

interface PropertyImageFallbackProps {
  src?: string;
  alt: string;
  /** Nombre de Material Symbol para el placeholder. */
  icon?: string;
  label?: string;
  className?: string;
  imgClassName?: string;
}

/**
 * Imagen de propiedad con fallback visual cuando no hay `src` (ítem 45 de
 * MEJORAS.md) — antes cada card de propiedad (landlord, y el componente
 * huérfano en components/landlord) reimplementaba este mismo condicional.
 */
export function PropertyImageFallback({
  src,
  alt,
  icon = 'bed',
  label = 'Sin imagen',
  className,
  imgClassName,
}: PropertyImageFallbackProps) {
  if (!src) {
    return (
      <div className={cn('flex h-full w-full flex-col items-center justify-center gap-2 bg-primary/10', className)}>
        <span className="material-symbols-outlined text-[64px] text-primary/40" aria-hidden>
          {icon}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-primary/50">{label}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        'h-full w-full object-cover transition-transform duration-700 group-hover:scale-110',
        imgClassName,
      )}
    />
  );
}
