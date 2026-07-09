import { cn } from '@/lib/cn';

interface WordmarkProps {
  className?: string;
  /** Color fijo (para el hero de foto, donde el header es siempre blanco). */
  variant?: 'themed' | 'onDark';
}

/**
 * Texto "AlquilaYa" con el mismo tratamiento en toda la app — antes cada
 * consumidor del <Logo/> lo reescribía a mano con colores distintos
 * (top-bar.tsx vs mobile-nav.tsx tenían dos versiones diferentes).
 */
export function Wordmark({ className, variant = 'themed' }: WordmarkProps) {
  if (variant === 'onDark') {
    return (
      <span className={cn('text-xl font-black tracking-tighter text-white', className)}>
        AlquilaYa
      </span>
    );
  }
  return (
    <span className={cn('text-xl font-black tracking-tighter', className)}>
      <span className="text-primary">Alquila</span>
      <span className="text-foreground">Ya</span>
    </span>
  );
}
