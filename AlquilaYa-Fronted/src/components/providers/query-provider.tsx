'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

/**
 * Ítem 423: arranque de la migración a TanStack Query para el data-fetching client-side.
 * Ver `docs/TANSTACK-QUERY.md` para la convención de `queryKey`, `staleTime` por tipo de
 * dato e invalidación tras mutaciones que deben seguir las páginas migradas gradualmente.
 *
 * `staleTime` global de 30s: dato razonable "por defecto" para la mayoría de listados de
 * este proyecto (propiedades, reservas) — cada página puede sobreescribirlo en su propio
 * `useQuery`/`useInfiniteQuery` según qué tan "vivo" necesite el dato (ver tabla en el doc).
 *
 * El `QueryClient` se crea una sola vez por sesión de navegador vía `useState(() => ...)`
 * (patrón recomendado por TanStack para App Router): si se creara en cada render se perdería
 * la caché completa cada vez que este componente se re-renderiza.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Evita refetch agresivo al simple volver a enfocar la pestaña; cada página que
            // necesite datos "en vivo" (p.ej. mensajería) puede sobreescribirlo puntualmente.
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* No-op y se elimina automáticamente en el build de producción (ver docs de TanStack). */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
