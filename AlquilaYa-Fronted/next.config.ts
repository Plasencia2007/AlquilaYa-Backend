import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
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
};

export default withNextIntl(nextConfig);
