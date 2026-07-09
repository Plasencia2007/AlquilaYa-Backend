import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

type Props = { params: Promise<{ id: string }> };

/**
 * Metadata + Open Graph por-propiedad para que compartir el link de una ficha muestre
 * título/descripción/imagen (F5). Se resuelve en el servidor SIN tocar la página cliente:
 * este layout server-component la envuelve de forma transparente.
 *
 * El fetch usa el gateway interno (BACKEND_INTERNAL_URL en prod) con timeout y try/catch:
 * si el backend está lento o caído, cae a metadata genérica y NO rompe la página.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const base = (process.env.BACKEND_INTERNAL_URL || 'http://localhost:8080').replace(/\/$/, '');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${base}/api/v1/propiedades/${id}/publico`, {
      signal: controller.signal,
      next: { revalidate: 300 }, // cachea 5 min: no golpea el backend en cada crawl/refresh
    });
    clearTimeout(timeout);
    if (!res.ok) return fallback();

    const p = await res.json();
    const titulo: string = p?.titulo || 'Propiedad en AlquilaYa';
    const desc: string = String(
      p?.descripcion ||
        `Cuarto en ${p?.direccion ?? 'zona universitaria'}${p?.precio ? ` desde S/ ${p.precio}` : ''}.`,
    ).slice(0, 200);
    const imagen: string | undefined =
      Array.isArray(p?.imagenes) && p.imagenes.length > 0 ? p.imagenes[0] : undefined;
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
        images: imagen ? [{ url: imagen }] : undefined,
      },
      twitter: {
        card: imagen ? 'summary_large_image' : 'summary',
        title: titulo,
        description: desc,
        images: imagen ? [imagen] : undefined,
      },
    };
  } catch {
    return fallback();
  }
}

function fallback(): Metadata {
  return {
    title: 'Propiedad | AlquilaYa',
    description: 'Encuentra y reserva cuartos cerca de tu universidad.',
  };
}

export default function PropertyDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
