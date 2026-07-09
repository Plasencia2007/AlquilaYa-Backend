import type { MetadataRoute } from 'next';

/**
 * Web App Manifest (PWA): permite "instalar" AlquilaYa en móvil y define nombre/colores/íconos.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AlquilaYa — Alquiler de cuartos para estudiantes',
    short_name: 'AlquilaYa',
    description: 'Encuentra y reserva cuartos cerca de tu universidad.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#8f0304',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/icon-192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
