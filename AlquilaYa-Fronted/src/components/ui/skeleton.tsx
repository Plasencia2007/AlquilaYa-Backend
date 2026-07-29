import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Texto para lectores de pantalla mientras el skeleton está visible (ítem
   * 409 de MEJORAS.md). Opcional a propósito: la mayoría de usos de
   * `<Skeleton>` son piezas puramente decorativas dentro de un layout más
   * grande (una card entera armada con 4-5 `<Skeleton>` apiladas) —
   * ponerle `aria-busy` + anuncio a CADA pieza sería ruido para el lector de
   * pantalla ("Cargando" repetido 4-5 veces por card).
   *
   * Pasa `label` solo en el `<Skeleton>` que representa el estado de carga
   * de una región completa y autocontenida. Si son varias piezas juntas,
   * preferí envolver el grupo con `<SkeletonGroup>` (más abajo) y dejar las
   * piezas individuales sin `label`.
   */
  label?: string;
}

function Skeleton({ className, label, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...(label ? { role: "status" as const, "aria-busy": true } : null)}
      {...props}
    >
      {label && <span className="sr-only">{label}</span>}
    </div>
  )
}

interface SkeletonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Anuncio único para lectores de pantalla mientras el grupo está cargando. */
  label?: string;
}

/**
 * Envuelve un grupo de `<Skeleton>` (ej. una card entera armada con varias
 * piezas, o una grilla de resultados) en una sola región `aria-busy` con un
 * único anuncio para lectores de pantalla — ítem 409 de MEJORAS.md. Preferí
 * esto sobre pasarle `label` a cada `<Skeleton>` suelto cuando son varias
 * piezas juntas representando la misma carga.
 *
 * No hace falta migrar todos los usos de `<Skeleton>` del proyecto a este
 * wrapper (son muchísimos) — se documenta como el patrón a seguir en código
 * nuevo y se aplica puntualmente en las zonas de más tráfico.
 */
function SkeletonGroup({ label = "Cargando…", className, children, ...props }: SkeletonGroupProps) {
  return (
    <div role="status" aria-busy="true" className={className} {...props}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

export { Skeleton, SkeletonGroup }
