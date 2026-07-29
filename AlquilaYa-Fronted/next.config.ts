import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import bundleAnalyzer from '@next/bundle-analyzer';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
// Ítem 422 de MEJORAS.md: reporte visual del bundle (`npm run analyze`), apagado
// por defecto para no afectar `next build`/`next dev` normales.
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Ítem 37 de MEJORAS.md: habilita el soporte de Next para el componente
    // <ViewTransition> de React (transiciones animadas entre rutas, ej. la
    // foto de una card "viajando" al hero del detalle). El flag en sí es
    // inofensivo, pero NO produce ningún efecto todavía: ese componente es
    // parte de la API experimental de React y esta versión instalada
    // (react@19.2.4, release estable) no lo exporta — solo lo tienen los
    // builds canary/experimental de React. Subir de canal de React es un
    // cambio de mayor riesgo que no se hizo acá; el flag queda activado
    // para cuando el proyecto migre a esa versión.
    viewTransition: true,
  },
  images: {
    remotePatterns: [
      // Hosts propios -> se optimizan normalmente.
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      // Imágenes externas por URL (las pega el arrendador). Comodín para que NO revienten
      // en ninguna pantalla; en card/ficha/quick-view van con `unoptimized` (carga directa,
      // sin pasar por el optimizador). El backend ya valida que sean https + imagen directa.
      { protocol: 'https', hostname: '**' },
    ],
  },
  async redirects() {
    return [
      { source: '/landlord/profile/personal', destination: '/landlord/profile', permanent: true },
      { source: '/landlord/profile/docs',     destination: '/landlord/profile', permanent: true },
      { source: '/landlord/profile/security', destination: '/landlord/profile', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // El service worker (PWA) no debe cachearse: así el navegador siempre
        // toma la última versión y no se queda pegado a un SW viejo.
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
