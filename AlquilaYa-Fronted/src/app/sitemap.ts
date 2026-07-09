import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * Sitemap con las rutas públicas estáticas. Las fichas de propiedad (`/property/[id]`) son
 * dinámicas: para incluirlas habría que listar todos los IDs desde el backend (endpoint de
 * "todas las propiedades públicas"), lo cual queda como mejora futura.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
  ];
}
