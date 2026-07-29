/**
 * Config de Lighthouse CI (ítem 432 de MEJORAS.md).
 *
 * El workflow `.github/workflows/lighthouse.yml` hace `next build` y arranca
 * `next start` en background ANTES de correr `lhci autorun`, así que este
 * archivo NO usa `collect.startServerCommand` (el server ya está arriba
 * cuando `lhci` empieza a recolectar) — sólo la lista fija de `url`.
 *
 * Rutas auditadas (las 3 que pide el ítem 432): home, búsqueda y detalle de
 * propiedad.
 *
 * OJO con `/property/1`: el runner de CI sólo levanta el frontend (no hay
 * docker-compose con los microservicios/BD ahí, ver AGENTS.md) — esa página
 * hace fetch client-side a la API y va a renderizar sin datos reales (su
 * estado de error/vacío, ver `ErrorState` en property/[id]/page.tsx). Igual
 * sirve para medir performance/accesibilidad del shell de la página (layout,
 * fuentes, JS inicial); para una medición 100% representativa con datos
 * reales haría falta apuntar esta URL a un entorno de preview con el backend
 * arriba, lo cual queda fuera del alcance de este ítem (tooling/instrumentación,
 * no infraestructura de preview).
 */
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/search',
        'http://localhost:3000/property/1',
      ],
      numberOfRuns: 3,
      settings: {
        // Chrome headless en el runner de GitHub Actions no tiene sandbox de
        // usuario disponible; sin este flag, el launch de Chrome falla.
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
      },
    },
    assert: {
      assertions: {
        // Ítem 432: umbrales que rompen el job si no se cumplen. `minScore` en
        // lhci es un mínimo inclusivo (score >= minScore pasa), que es la
        // forma en que la herramienta expresa "performance > 0.85" /
        // "accessibility > 0.95" del ítem.
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        // Ítem 422: presupuesto de "First Load JS" < 250KB en rutas públicas.
        // Se implementa acá (resource-summary de Lighthouse) en vez de un
        // script nuevo que parsee el reporte de @next/bundle-analyzer, para
        // no duplicar tooling — ver next.config.ts / package.json#analyze
        // para el analyzer visual (uso manual, no gatea el CI).
        'resource-summary:script:size': ['error', { maxNumericValue: 256000 }],
      },
    },
    upload: {
      // Sin secretos ni servidor propio: sube el reporte a un storage
      // temporal público de Google y deja el link en el log del job (dura
      // ~7 días, suficiente para revisar un PR).
      target: 'temporary-public-storage',
    },
  },
};
