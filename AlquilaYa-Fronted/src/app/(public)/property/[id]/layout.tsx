import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

type Props = { params: Promise<{ id: string }> };

interface PropiedadMeta {
  titulo: string;
  descripcion: string;
  imagen: string | undefined;
  precio: number | undefined;
  calificacion: number | undefined;
  numResenas: number | undefined;
  disponible: boolean | undefined;
}

/**
 * Fetch compartido por `generateMetadata` (OG/Twitter) y el JSON-LD Product/Offer
 * (ítem 168) del layout, para no duplicar la llamada al backend ni su manejo de
 * timeout/error. Usa el gateway interno (BACKEND_INTERNAL_URL en prod) con timeout y
 * try/catch: si el backend está lento o caído, ambos caen a su fallback y NO rompen
 * la página.
 */
async function obtenerPropiedadMeta(id: string): Promise<PropiedadMeta | null> {
  const base = (process.env.BACKEND_INTERNAL_URL || 'http://localhost:8080').replace(/\/$/, '');
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${base}/api/v1/propiedades/${id}/publico`, {
      signal: controller.signal,
      next: { revalidate: 300 }, // cachea 5 min: no golpea el backend en cada crawl/refresh
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const p = await res.json();
    return {
      titulo: p?.titulo || 'Propiedad en AlquilaYa',
      descripcion: String(
        p?.descripcion ||
          `Cuarto en ${p?.direccion ?? 'zona universitaria'}${p?.precio ? ` desde S/ ${p.precio}` : ''}.`,
      ).slice(0, 200),
      imagen: Array.isArray(p?.imagenes) && p.imagenes.length > 0 ? p.imagenes[0] : undefined,
      precio: typeof p?.precio === 'number' ? p.precio : undefined,
      calificacion: typeof p?.calificacion === 'number' ? p.calificacion : undefined,
      numResenas: typeof p?.numResenas === 'number' ? p.numResenas : undefined,
      disponible: typeof p?.estaDisponible === 'boolean' ? p.estaDisponible : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Metadata + Open Graph por-propiedad para que compartir el link de una ficha muestre
 * título/descripción/imagen (F5). Se resuelve en el servidor SIN tocar la página cliente:
 * este layout server-component la envuelve de forma transparente.
 *
 * Si la propiedad no tiene foto, se omite `images` por completo (no se manda `undefined`
 * explícito) para que Next.js use el fallback generado por `opengraph-image.tsx`/
 * `twitter-image.tsx` de este mismo segmento (ítem 152) en vez de compartir sin imagen.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const meta = await obtenerPropiedadMeta(id);
  if (!meta) return fallback();

  const { titulo, descripcion: desc, imagen } = meta;
  const canonical = `${SITE_URL}/property/${id}`;

  return {
    title: `${titulo} | AlquilaYa`,
    description: desc,
    alternates: { canonical },
    openGraph: {
      title: titulo,
      description: desc,
      url: canonical,
      type: 'website',
      ...(imagen ? { images: [{ url: imagen }] } : {}),
    },
    twitter: {
      card: imagen ? 'summary_large_image' : 'summary',
      title: titulo,
      description: desc,
      ...(imagen ? { images: [imagen] } : {}),
    },
  };
}

function fallback(): Metadata {
  return {
    title: 'Propiedad | AlquilaYa',
    description: 'Encuentra y reserva cuartos cerca de tu universidad.',
  };
}

/**
 * JSON-LD Product/Offer/AggregateRating (ítem 168): ayuda a que los resultados de
 * búsqueda de Google muestren precio/disponibilidad/rating (rich snippets).
 * `AggregateRating` se omite si no hay reseñas (Google penaliza rating sin `reviewCount`).
 */
function propiedadJsonLd(id: string, meta: PropiedadMeta) {
  const url = `${SITE_URL}/property/${id}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: meta.titulo,
    description: meta.descripcion,
    url,
    ...(meta.imagen ? { image: [meta.imagen] } : {}),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'PEN',
      ...(meta.precio != null ? { price: meta.precio } : {}),
      availability: meta.disponible === false
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
    },
    ...(meta.calificacion != null && meta.numResenas
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: meta.calificacion,
            reviewCount: meta.numResenas,
          },
        }
      : {}),
  };
}

export default async function PropertyDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meta = await obtenerPropiedadMeta(id);

  return (
    <>
      {meta && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(propiedadJsonLd(id, meta)) }}
        />
      )}
      {children}
    </>
  );
}
