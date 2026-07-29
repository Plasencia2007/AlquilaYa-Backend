'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, MapPin } from 'lucide-react';

import {
  universidadService,
  type ZonaCobertura,
} from '@/services/universidad-service';
import { servicioPropiedades } from '@/services/property-service';
import { formatPEN } from '@/lib/money';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';

const MAX_ZONAS = 6;
const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

interface ZonaCard {
  id: number;
  nombre: string;
  color?: string | null;
}

interface Conteo {
  total: number;
  precioMin: number;
}

export function FeaturedZones() {
  const [zonas, setZonas] = useState<ZonaCard[]>([]);
  const [cargando, setCargando] = useState(true);
  // null = conteos aún no disponibles (o fallaron): las cards se muestran igual, solo sin el número.
  const [conteos, setConteos] = useState<Record<number, Conteo> | null>(null);

  useEffect(() => {
    let cancelado = false;
    universidadService
      .listarActivas()
      .then((universidades) => {
        if (cancelado) return;
        // Zonas activas de todas las universidades activas, aplanadas y priorizadas.
        const activas = universidades
          .filter((u) => u.activo !== false)
          .flatMap((u) => u.zonas ?? [])
          .filter((z): z is ZonaCobertura & { id: number } => z.activo !== false && z.id != null)
          .sort((a, b) => (a.ordenPrioridad ?? 0) - (b.ordenPrioridad ?? 0))
          .slice(0, MAX_ZONAS)
          .map<ZonaCard>((z) => ({
            id: z.id,
            nombre: z.nombre,
            color: z.color,
          }));
        setZonas(activas);
      })
      .catch(() => {
        if (!cancelado) setZonas([]);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // Conteo por zona como MEJORA PROGRESIVA: las cards ya se renderizaron desde el catálogo
  // (ligero); el conteo se resuelve en segundo plano con UNA sola petición agregada al backend
  // (GET /propiedades/conteo-por-zona), que ya agrupa por zonaId con el mismo criterio que la
  // búsqueda pública. Si tarda o falla, la card queda con su CTA neutro. No bloquea el render.
  useEffect(() => {
    if (zonas.length === 0) return;
    let cancelado = false;
    servicioPropiedades
      .conteoPorZona()
      .then((filas) => {
        if (cancelado) return;
        const acc: Record<number, Conteo> = {};
        for (const f of filas) {
          // Nunca mostramos "0 cuartos": solo registramos zonas con al menos un aviso visible.
          if (f.zonaId == null || f.total <= 0) continue;
          acc[f.zonaId] = { total: f.total, precioMin: f.precioMin };
        }
        setConteos(acc);
      })
      .catch(() => {
        // Sin conteos: las cards siguen siendo útiles (nombre + acceso a la búsqueda filtrada).
      });
    return () => {
      cancelado = true;
    };
  }, [zonas]);

  const subtitulo = useMemo(
    () => (id: number): string => {
      if (conteos === null) return 'Ver cuartos disponibles';
      const c = conteos[id];
      if (!c || c.total === 0) return 'Explora esta zona';
      const n = c.total === 1 ? '1 cuarto' : `${c.total} cuartos`;
      return `${n} · desde ${formatPEN(c.precioMin)}`;
    },
    [conteos],
  );

  if (cargando) {
    return (
      <section className="bg-background px-6 py-16 sm:px-12 md:py-24">
        <div className="mb-8">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-9 w-72" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: MAX_ZONAS }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  // Una sección de "zonas destacadas" sin zonas es peor que ausente.
  if (zonas.length === 0) return null;

  return (
    <section className="bg-background px-6 py-16 sm:px-12 md:py-24">
      <header className="mb-8 max-w-2xl md:mb-10">
        <span className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">
          <span className="h-px w-8 bg-primary" aria-hidden />
          Zonas de cobertura
        </span>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">
          Zonas destacadas cerca del campus
        </h2>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Cada zona con sus tarifas y disponibilidad. Elige la tuya y filtra la búsqueda al instante.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {zonas.map((z) => {
          const hasColor = typeof z.color === 'string' && HEX_RE.test(z.color);
          return (
            <Link
              key={z.id}
              href={`/search?zonaId=${z.id}`}
              // Sin fotos por zona en el catálogo: fondo con el color de la zona (o token
              // `primary` como respaldo) + degradado oscuro para garantizar contraste del texto.
              style={hasColor ? { backgroundColor: z.color as string } : undefined}
              className={cn(
                'group relative flex min-h-40 flex-col justify-end overflow-hidden rounded-2xl p-4 text-white shadow-sm ring-1 ring-black/5 transition-transform hover:-translate-y-0.5 hover:shadow-md',
                !hasColor && 'bg-primary',
              )}
            >
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10"
                aria-hidden
              />
              <MapPin
                className="absolute right-3 top-3 size-5 text-white/70 transition-transform group-hover:scale-110"
                aria-hidden
              />
              <div className="relative">
                <h3 className="text-base font-black leading-tight drop-shadow-sm">{z.nombre}</h3>
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-white/90">
                  {subtitulo(z.id)}
                  <ArrowUpRight
                    className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden
                  />
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
