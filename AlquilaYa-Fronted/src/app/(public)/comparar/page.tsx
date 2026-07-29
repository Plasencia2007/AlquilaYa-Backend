import type { Metadata } from 'next';

import { CompararClient } from './comparar-client';

export const metadata: Metadata = {
  title: 'Comparar cuartos · AlquilaYa',
  description:
    'Compara hasta 4 cuartos lado a lado: precio, distancia a la universidad, servicios, reglas, calificación y política de cancelación.',
};

/**
 * Ítem 121 (MEJORAS.md): página dedicada de comparación. El estado (ids
 * seleccionados) vive en `compare-store` (sessionStorage), así que la lógica
 * interactiva se delega a un Client Component; esta página server solo aporta
 * el `metadata` para SEO.
 */
export default function CompararPage() {
  return <CompararClient />;
}
