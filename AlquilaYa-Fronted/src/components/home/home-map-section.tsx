'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowRight, MapPin } from 'lucide-react';

import { servicioPropiedades } from '@/services/property-service';
import type { Propiedad } from '@/types/propiedad';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Leaflet rompe en SSR (accede a `window`): se carga diferido en el cliente con
 * `ssr:false` + skeleton, replicando el patrón de `/search` (components/search/map-results).
 * `PropertiesMap` ya se centra en el campus vía `universidadService.obtenerCampusPrincipal()`
 * y pinta las zonas de cobertura internamente, así que aquí solo aportamos los pines.
 */
const PropertiesMap = dynamic(() => import('@/components/shared/PropertiesMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

// La distancia al campus es EL diferencial del producto; el mapa lo hace tangible.
const MAX_PINES = 60;

export function HomeMapSection() {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  // Sin IntersectionObserver (navegador viejo, jsdom) no hay forma de diferir: se
  // monta de entrada. Se resuelve en el inicializador y no en el effect, porque un
  // setState síncrono dentro del effect provoca un render en cascada.
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);

  // El mapa (bundle de Leaflet + tiles + fetch de propiedades) es pesado: no lo montamos
  // ni pedimos datos hasta que la sección se acerca al viewport, para no penalizar el LCP.
  useEffect(() => {
    if (visible) return;
    const el = contenedorRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelado = false;
    servicioPropiedades
      .buscar({})
      .then((props) => {
        if (cancelado) return;
        setPropiedades(props.filter((p) => p.disponible && p.coordenadas).slice(0, MAX_PINES));
      })
      .catch(() => {
        // El mapa sigue mostrando el campus y las zonas de cobertura aunque no haya pines.
      });
    return () => {
      cancelado = true;
    };
  }, [visible]);

  return (
    <section className="bg-background px-6 py-16 sm:px-12 md:py-24">
      <header className="mb-8 flex flex-col items-start justify-between gap-4 md:mb-10 md:flex-row md:items-end">
        <div>
          <span className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">
            <span className="h-px w-8 bg-primary" aria-hidden />
            Explora por ubicación
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Cada cuarto, su distancia real
          </h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground md:text-base">
            Ubica los cuartos disponibles alrededor de tu campus y mide de un vistazo qué tan cerca
            quedas de tus clases.
          </p>
        </div>
        <Link
          href="/search?view=mapa"
          className="group flex items-center gap-2 self-start text-sm font-bold text-primary transition-all md:self-auto"
        >
          Ver mapa completo
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
        </Link>
      </header>

      <div
        ref={contenedorRef}
        className="relative h-[420px] w-full overflow-hidden rounded-3xl border border-border shadow-sm md:h-[520px]"
      >
        {visible ? (
          <PropertiesMap propiedades={propiedades} className="h-full w-full" />
        ) : (
          <Skeleton className="h-full w-full" />
        )}

        {/* CTA flotante para saltar al mapa completo desde la propia superficie del mapa. */}
        <Link
          href="/search?view=mapa"
          className="pointer-events-auto absolute bottom-4 left-4 z-[500] inline-flex items-center gap-2 rounded-full bg-background/95 px-4 py-2 text-xs font-bold text-foreground shadow-lg ring-1 ring-border backdrop-blur transition-colors hover:bg-background"
        >
          <MapPin className="size-4 text-primary" aria-hidden />
          Ver mapa completo
        </Link>
      </div>
    </section>
  );
}
