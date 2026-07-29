/**
 * @deprecated Movido a `@/components/shared/reputation-badge` (#74 de MEJORAS.md —
 * agrega variantes de tamaño `sm|md|lg` y tooltip explicando el cálculo del nivel).
 * Este archivo queda como shim de compatibilidad porque `app/(public)/property/[id]/page.tsx`
 * está fuera de este cambio; importa desde la ruta nueva en código nuevo y, si tocas
 * ese archivo, actualiza su import y borra este shim.
 */
export { ReputationBadge } from '@/components/shared/reputation-badge';
