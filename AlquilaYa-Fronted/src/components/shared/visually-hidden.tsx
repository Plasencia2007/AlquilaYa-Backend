import type { ElementType, ReactNode } from 'react';

interface VisuallyHiddenProps {
  children: ReactNode;
  /** Elemento HTML a renderizar. Por defecto `span` (no rompe flujo inline). */
  as?: ElementType;
  className?: string;
}

/**
 * Texto presente en el DOM y anunciado por lectores de pantalla, pero
 * invisible en pantalla (ítem 413 de MEJORAS.md). Forma preferida sobre
 * repetir `<span className="sr-only">…</span>` inline en cada componente:
 * un solo punto para ajustar la técnica de ocultamiento visual si alguna vez
 * hace falta (hoy delega en la utilidad `sr-only` que trae Tailwind por
 * defecto — no requiere declararla en `globals.css`).
 *
 * Uso típico: texto de contexto junto a un ícono sin label visible.
 *   <button><Trash2 aria-hidden /><VisuallyHidden>Eliminar</VisuallyHidden></button>
 */
export function VisuallyHidden({ children, as: Component = 'span', className }: VisuallyHiddenProps) {
  return <Component className={className ? `sr-only ${className}` : 'sr-only'}>{children}</Component>;
}
