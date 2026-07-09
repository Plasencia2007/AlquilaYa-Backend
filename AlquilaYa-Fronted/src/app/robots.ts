import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * robots.txt: permite indexar las páginas públicas y bloquea las áreas privadas/de gestión.
 * La URL base se toma de NEXT_PUBLIC_SITE_URL (setéala al dominio real/ngrok en prod).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/student/', '/landlord/', '/admin-master/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
