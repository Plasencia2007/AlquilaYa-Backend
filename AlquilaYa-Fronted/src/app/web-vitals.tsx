'use client';

import { useReportWebVitals } from 'next/web-vitals';

import { track } from '@/lib/analytics';

/**
 * Ítem 431 de MEJORAS.md: reporta las Core Web Vitals (LCP, CLS, INP, FCP,
 * TTFB) reutilizando el sink de analítica que YA existe (`track()`, ver
 * `src/lib/analytics.ts`) en vez de montar un sistema de telemetría nuevo.
 * `track()` ya se encarga de encolar/mandar el evento al backend (ítem 455).
 *
 * La referencia del callback se define FUERA del componente a propósito: la
 * doc de `useReportWebVitals` (node_modules/next/dist/docs/01-app/03-api-reference/
 * 04-functions/use-report-web-vitals.md) advierte que si la referencia cambia
 * entre renders, se pueden reportar métricas duplicadas.
 */
type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

const handleWebVitals: ReportWebVitalsCallback = (metric) => {
  track('web_vital', {
    nombre: metric.name,
    valor: metric.value,
    id: metric.id,
  });
};

/**
 * Client Component dedicado: `useReportWebVitals` exige `'use client'`, y
 * aislarlo acá (en vez de marcar todo el layout raíz como cliente) confina
 * el boundary de cliente sólo a esto — patrón recomendado por la doc de
 * Next.js. No renderiza nada.
 */
export function WebVitals() {
  useReportWebVitals(handleWebVitals);
  return null;
}
