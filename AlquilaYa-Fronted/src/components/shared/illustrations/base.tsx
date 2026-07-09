import type { ReactNode, SVGProps } from 'react';

interface IllustrationBaseProps extends SVGProps<SVGSVGElement> {
  children: ReactNode;
  /** Oculta el óvalo de "piso" — útil si la escena ya tiene su propia base. */
  sinPiso?: boolean;
}

/**
 * Envoltorio común de las ilustraciones de estado vacío/error (ítem 29).
 * viewBox 160×160, óvalo de piso en `--muted`, resto en `--primary`/`--border`
 * vía currentColor — así heredan el tema claro/oscuro sin arte duplicado.
 */
export function IllustrationBase({ children, sinPiso, className, ...props }: IllustrationBaseProps) {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      className={className}
      role="img"
      aria-hidden
      {...props}
    >
      {!sinPiso && (
        <ellipse cx="80" cy="136" rx="46" ry="8" className="fill-muted" />
      )}
      {children}
    </svg>
  );
}
