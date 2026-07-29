/**
 * Ítem 304: paleta de charts centralizada. Usa las CSS vars de `globals.css` directamente
 * (mismo patrón ya probado en `components/search/search-map.tsx` para los pines del mapa) en vez
 * de hardcodear un hex — así los charts respetan light/dark sin JS extra: `--primary` ya cambia
 * de `#8f0304` a `#c14b4c` entre temas, y los navegadores modernos resuelven `var(...)` en
 * atributos de presentación SVG (`fill`, `stroke`, `stopColor`) igual que en CSS.
 */
export const CHART_PRIMARY = 'var(--primary)';
export const CHART_PRIMARY_FOREGROUND = 'var(--primary-foreground)';
export const CHART_MUTED_FOREGROUND = 'var(--muted-foreground)';
