import type { ReactNode } from 'react';

interface SkipLinkProps {
  /** Ancla del `<main>` al que salta. Por defecto `#contenido`. */
  href?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * Enlace "saltar al contenido" (ítem 394 de MEJORAS.md). Invisible hasta que
 * recibe foco por teclado — momento en el que aparece fijo en la esquina
 * superior izquierda — para que un usuario de teclado o lector de pantalla no
 * tenga que recorrer navbar/sidebar completos en cada carga de página antes
 * de llegar al contenido real.
 *
 * Debe montarse como uno de los primeros elementos enfocables del árbol
 * (primer hijo de `<body>` en el layout raíz público; primer hijo del
 * contenedor en los layouts privados anidados, que ya viven dentro del
 * `<body>` del layout raíz) y apuntar a un `<main id="contenido">`.
 *
 * Usa las utilidades `sr-only`/`not-sr-only` que trae Tailwind CSS por
 * defecto — no hace falta declararlas en `globals.css`.
 */
export function SkipLink({ href = '#contenido', children = 'Saltar al contenido', className }: SkipLinkProps) {
  const classes = [
    'sr-only focus:not-sr-only',
    'focus:fixed focus:top-3 focus:left-3 focus:z-[999]',
    'focus:rounded-md focus:bg-primary focus:px-4 focus:py-2',
    'focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-overlay',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <a href={href} className={classes}>
      {children}
    </a>
  );
}
