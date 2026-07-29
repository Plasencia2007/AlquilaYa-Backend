'use client';

import { useEffect, useState } from 'react';
import {
  Bus,
  Footprints,
  GraduationCap,
  Landmark,
  Pill,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { UPEU_COORDS, formatearDistancia } from '@/lib/geo';
import {
  obtenerLugaresCercanos,
  obtenerTiempoCaminando,
  type LugarCercano,
} from '@/services/property-service';

/* ─────────────────────────────── Tipos ─────────────────────────────── */

type CategoriaId = LugarCercano['categoria'];

interface CategoriaInfo {
  id: CategoriaId;
  label: string;
  icon: LucideIcon;
}

type NearbyByCategory = Partial<Record<CategoriaId, LugarCercano[]>>;

interface WalkingInfo {
  minutos: number;
  distanciaKm: number;
  destinoNombre: string;
  aproximado: boolean;
}

interface Props {
  /** Id de la propiedad — el backend resuelve lat/lng y cachea por este id (#157/#158). */
  propiedadId: number;
  lat: number;
  lng: number;
  className?: string;
}

/* ────────────────────────────── Constantes ─────────────────────────── */

const CATEGORIAS: CategoriaInfo[] = [
  { id: 'universidad', label: 'Universidad', icon: GraduationCap },
  { id: 'mercado', label: 'Mercado/Supermercado', icon: ShoppingCart },
  { id: 'farmacia', label: 'Farmacia', icon: Pill },
  { id: 'banco', label: 'Banco', icon: Landmark },
  { id: 'paradero', label: 'Paradero', icon: Bus },
];

function agrupar(lugares: LugarCercano[]): NearbyByCategory {
  const acc: NearbyByCategory = {};
  for (const l of lugares) {
    const lista = acc[l.categoria] ?? [];
    lista.push(l);
    acc[l.categoria] = lista;
  }
  return acc;
}

/* ────────────────────────────── Componente ──────────────────────────── */

/**
 * Alrededores de la propiedad (#157) + tiempo real caminando a la universidad más cercana
 * (#158). Ambos datos vienen de un proxy cacheado en el backend (Overpass API / OSRM) — el
 * navegador ya no golpea esas APIs públicas directamente (evita exponer sus límites de uso
 * a cada visitante).
 */
export function PropertyNearbyPlaces({ propiedadId, lat, lng, className }: Props) {
  const [grouped, setGrouped] = useState<NearbyByCategory | null>(null);
  const [walking, setWalking] = useState<WalkingInfo | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    obtenerLugaresCercanos(propiedadId)
      .then((lugares) => {
        if (cancelado) return lugares;
        const data = agrupar(lugares);
        setGrouped(data);
        return lugares;
      })
      .then((lugares) => {
        if (cancelado) return null;
        const universidadCercana = lugares.find((l) => l.categoria === 'universidad');
        const destino = universidadCercana
          ? { lat: universidadCercana.lat, lng: universidadCercana.lng }
          : UPEU_COORDS;
        const destinoNombre = universidadCercana?.nombre ?? 'la universidad';
        return obtenerTiempoCaminando(propiedadId, destino.lat, destino.lng).then((info) =>
          info ? { ...info, destinoNombre } : null,
        );
      })
      .then((info) => {
        if (!cancelado && info) setWalking(info);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [propiedadId, lat, lng]);

  if (cargando) {
    return (
      <div className={cn('space-y-3', className)}>
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const categoriasConDatos = CATEGORIAS.filter((c) => (grouped?.[c.id]?.length ?? 0) > 0);

  if (categoriasConDatos.length === 0 && !walking) return null;

  return (
    <section className={cn('space-y-3', className)}>
      <h2 className="text-h2">Alrededores</h2>

      {walking && (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
          <Footprints className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="text-muted-foreground">
            <span className="font-bold text-foreground">~{walking.minutos} min</span> caminando a{' '}
            {walking.destinoNombre}
            <span className="text-muted-foreground/70"> · {formatearDistancia(walking.distanciaKm)}</span>
            {walking.aproximado && <span className="text-muted-foreground/70"> (aprox.)</span>}
          </span>
        </div>
      )}

      {categoriasConDatos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {categoriasConDatos.map((cat) => (
            <div key={cat.id} className="space-y-2 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <cat.icon className="size-4" aria-hidden />
                </span>
                <p className="text-sm font-bold text-foreground">{cat.label}</p>
              </div>
              <ul className="space-y-1.5">
                {grouped![cat.id]!.map((place) => (
                  <li key={`${place.lat},${place.lng}`} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-muted-foreground">{place.nombre}</span>
                    <span className="shrink-0 font-semibold text-foreground">
                      {formatearDistancia(place.distanciaM / 1000)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
