'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

import { useCompareStore } from '@/stores/compare-store';

const PropertyCompareBar = dynamic(
  () =>
    import('@/components/student/property-compare-bar').then(
      (m) => m.PropertyCompareBar,
    ),
  { ssr: false },
);

/**
 * Ítem 439: `PropertyCompareBar` (Leaflet-free pero igual con su propio peso de bundle)
 * antes se montaba SIEMPRE en toda página pública, aunque el comparador estuviera vacío
 * (el caso común). Este wrapper lee el store — liviano, sin descargar el componente
 * pesado — y solo monta el `dynamic(...)` real cuando hay algo que comparar.
 */
export function ClientChrome() {
  const [hidratado, setHidratado] = useState(false);
  const cantidad = useCompareStore((s) => s.selectedIds.length);

  useEffect(() => {
    useCompareStore.persist.rehydrate()?.then(() => setHidratado(true));
  }, []);

  if (!hidratado || cantidad === 0) return null;
  return <PropertyCompareBar />;
}
