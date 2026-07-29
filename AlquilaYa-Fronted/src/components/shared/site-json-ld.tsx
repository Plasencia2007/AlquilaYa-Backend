const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * JSON-LD a nivel de sitio (ítem 104): `Organization` + `WebSite`.
 *
 * - `Organization`: identifica la marca (nombre + logo) para el Knowledge Graph
 *   de Google. El `logo` apunta al icono generado por Next en `/apple-icon`
 *   (180×180, supera el mínimo de 112px que pide Search). No se declara `sameAs`
 *   porque el proyecto no tiene URLs reales de redes sociales; inventarlas
 *   perjudicaría el SEO.
 * - `WebSite` + `potentialAction: SearchAction`: habilita el *sitelinks
 *   searchbox* (una caja de búsqueda del sitio en los resultados de Google). El
 *   buscador usa el parámetro `zona` como texto libre (ver `parseFiltros` en
 *   `lib/search-url.ts` y `filtrosSchema` en `schemas/search-schema.ts`), así
 *   que el `target` apunta a `/search?zona={search_term_string}`.
 *
 * Server component: no lleva `'use client'` porque sólo emite markup estático.
 */
export function SiteJsonLd() {
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AlquilaYa',
    url: SITE_URL,
    logo: `${SITE_URL}/apple-icon`,
  };

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'AlquilaYa',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search?zona={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  );
}
