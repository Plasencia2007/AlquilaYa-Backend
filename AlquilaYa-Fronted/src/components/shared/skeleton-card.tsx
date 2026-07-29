import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';

/**
 * Skeleton de tarjeta de propiedad. Replica la estructura de `PropertyCard`
 * variant="full" (imagen 4:3 `rounded-2xl` sin borde ni padding + bloque de
 * info con `mt-3` + precio anclado al fondo con `mt-auto pt-3`) para que el
 * swap skeleton→card no produzca salto de layout en los grids de búsqueda y
 * favoritos (ítem 138).
 */
export function SkeletonCard() {
  return (
    <div className="flex h-full flex-col">
      {/* Imagen — mismo aspect-ratio (4:3) y radio (rounded-2xl) que la card */}
      <Skeleton className="aspect-[4/3] w-full rounded-2xl" />

      {/* Info — mismo mt-3 y jerarquía de líneas que la card */}
      <div className="mt-3 flex flex-1 flex-col">
        <div className="flex flex-col gap-2">
          {/* Título (izq.) + rating (der.) */}
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-[18px] w-3/4 rounded" />
            <Skeleton className="h-[18px] w-9 shrink-0 rounded" />
          </div>
          {/* Ubicación */}
          <Skeleton className="h-4 w-1/2 rounded" />
          {/* Servicios */}
          <div className="flex gap-1.5 pt-1">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>

        {/* Precio anclado al fondo — igual que el `mt-auto pt-3` de la card */}
        <div className="mt-auto pt-3">
          <Skeleton className="h-5 w-32 rounded" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    // Ítem 409: una sola región `aria-busy` + un único anuncio para lectores de
    // pantalla ("Cargando propiedades…"), en vez de que cada `<Skeleton>` suelto
    // (varias por card, varias cards) anuncie "Cargando" por separado.
    <SkeletonGroup label="Cargando propiedades…" className="card-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </SkeletonGroup>
  );
}
