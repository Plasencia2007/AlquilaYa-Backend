import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { MapPin, Search } from 'lucide-react';

import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { formatPEN } from '@/lib/money';
import type { PropiedadPublicoDTO } from '@/services/property-service';

import { buscarPorZona, obtenerZonasActivas, resolverZonaPorSlug, slugifyZona } from './data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const MAX_LISTINGS = 12;

type Props = { params: Promise<{ zona: string }> };

/**
 * Ítem 134 (MEJORAS.md): landings programáticas SEO por zona del catálogo.
 * Server Component con SSR REAL de los primeros resultados (HTML indexable) +
 * CTA al buscador interactivo `/search?zonaId=`.
 *
 * Prerender: `generateStaticParams` genera una ruta por zona activa. Si el
 * backend no está disponible en build, devuelve [] y las rutas se renderizan
 * on-demand (SSR) la primera vez (dynamicParams por defecto = true).
 */
export async function generateStaticParams(): Promise<{ zona: string }[]> {
  const zonas = await obtenerZonasActivas();
  const vistos = new Set<string>();
  const params: { zona: string }[] = [];
  for (const z of zonas) {
    const slug = slugifyZona(z.nombre);
    if (slug && !vistos.has(slug)) {
      vistos.add(slug);
      params.push({ zona: slug });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { zona: slug } = await params;
  const zona = await resolverZonaPorSlug(slug);

  if (!zona) {
    return {
      title: 'Cuartos por zona · AlquilaYa',
      description: 'Encuentra cuartos para estudiantes cerca de tu universidad con AlquilaYa.',
    };
  }

  const universidad = zona.universidadNombre || 'tu universidad';
  const title = `Cuartos en ${zona.nombre} cerca de ${universidad} | AlquilaYa`;
  const description = `Alquila cuartos y habitaciones para estudiantes en ${zona.nombre}, cerca de ${universidad}. Compara precios, servicios y distancia al campus, y reserva en línea con AlquilaYa.`;
  const canonical = `${SITE_URL}/cuartos/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function CuartosZonaPage({ params }: Props) {
  const { zona: slug } = await params;
  const zona = await resolverZonaPorSlug(slug);
  if (!zona) notFound();

  const universidad = zona.universidadNombre || 'tu universidad';
  const resultados = await buscarPorZona(zona.id);
  const listados = resultados.slice(0, MAX_LISTINGS);
  const searchHref = `/search?zonaId=${zona.id}`;

  // JSON-LD ItemList de los primeros cuartos (rich results en buscadores).
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Cuartos en ${zona.nombre}`,
    itemListElement: listados.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/property/${p.id}`,
      name: p.titulo,
    })),
  };

  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-24 sm:px-12 md:pt-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />

      <PageBreadcrumb
        className="mb-4"
        items={[
          { label: 'Inicio', href: '/' },
          { label: 'Explorar', href: '/search' },
          { label: `Cuartos en ${zona.nombre}` },
        ]}
      />

      <header className="max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden />
          {universidad}
        </span>
        <h1 className="mt-4 font-headline text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Cuartos en {zona.nombre} cerca de {universidad}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {zona.descripcion?.trim()
            ? zona.descripcion
            : `Encuentra cuartos y habitaciones para estudiantes en ${zona.nombre}, a pocos minutos de ${universidad}. Compara precios, servicios y distancia al campus, y reserva en línea de forma segura con AlquilaYa.`}
        </p>
        <div className="mt-6">
          <Link
            href={searchHref}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
          >
            <Search className="size-4" aria-hidden />
            Ver todos en el buscador
          </Link>
        </div>
      </header>

      <section className="mt-12" aria-label={`Cuartos disponibles en ${zona.nombre}`}>
        <h2 className="font-headline text-2xl font-bold tracking-tight text-foreground">
          {listados.length > 0
            ? `Cuartos disponibles en ${zona.nombre}`
            : `Aún no hay cuartos publicados en ${zona.nombre}`}
        </h2>

        {listados.length > 0 ? (
          <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listados.map((p) => (
              <li key={p.id}>
                <ListingCard propiedad={p} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Todavía no publicamos cuartos en esta zona.{' '}
            <Link href={searchHref} className="font-semibold text-primary hover:underline">
              Explora otras opciones en el buscador
            </Link>
            .
          </p>
        )}
      </section>

      {listados.length > 0 && (
        <section className="mt-12 rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="font-headline text-xl font-bold tracking-tight text-foreground">
            ¿Buscas algo más específico en {zona.nombre}?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Usa el buscador para filtrar por precio, servicios, distancia al campus y más, y guarda
            tus favoritos.
          </p>
          <Link
            href={searchHref}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
          >
            <Search className="size-4" aria-hidden />
            Buscar en {zona.nombre}
          </Link>
        </section>
      )}
    </main>
  );
}

/** Card SSR ligera (HTML puro + next/image) — todo el contenido queda indexable. */
function ListingCard({ propiedad }: { propiedad: PropiedadPublicoDTO }) {
  const img = propiedad.imagenes?.[0];
  return (
    <Link
      href={`/property/${propiedad.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {img ? (
          <Image
            src={img}
            alt={propiedad.titulo}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-muted-foreground">
            Sin imagen
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{propiedad.titulo}</h3>
        {propiedad.direccion && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden />
            <span className="line-clamp-1">{propiedad.direccion}</span>
          </p>
        )}
        <p className="tnum mt-auto pt-2 text-base font-bold text-foreground">
          {formatPEN(Number(propiedad.precio ?? 0))}
          <span className="text-xs font-normal text-muted-foreground"> /mes</span>
        </p>
      </div>
    </Link>
  );
}
