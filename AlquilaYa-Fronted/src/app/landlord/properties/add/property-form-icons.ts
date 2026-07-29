// =============================================================================
// Font Awesome → Material Symbols mapper
// El backend almacena íconos como "fa-wifi", "fa-paw", etc.
// Material Symbols (Google) usa nombres distintos como "wifi", "pets", etc.
//
// El mapa FA→Material vive ahora únicamente en `@/lib/icons` (antes estaba
// triplicado en student/page.tsx, CatalogosTable.tsx y este archivo — ítem 203
// de MEJORAS.md). Este módulo solo reexpone un wrapper de compatibilidad: el
// wizard (`property-form-primitives.tsx`) hace `{resolveIcon(item.icono) && ...}`
// para OMITIR el chip de ícono cuando no hay ninguno, así que necesitamos
// devolver `undefined` en ese caso — a diferencia del `resolveIcon` canónico,
// que devuelve el fallback `'label'` para mantener siempre un ícono visible.
// =============================================================================

import { resolveIcon as resolveIconCanonico } from '@/lib/icons';

export function resolveIcon(icon: string | undefined): string | undefined {
  if (!icon) return undefined;
  return resolveIconCanonico(icon);
}
