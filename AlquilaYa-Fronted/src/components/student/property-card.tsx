'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Eye, MapPin, Navigation } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/cn';
import { distanciaHaversineKm, formatearDistancia, resolverZona } from '@/lib/geo';
import { formatPEN } from '@/lib/money';
import { getZonasCached } from '@/lib/zonas-cache';
import type { ZonaResolucion } from '@/services/universidad-service';
import type { Propiedad } from '@/types/propiedad';

import { FavoriteButton } from './favorite-button';
import { PropertyBadges } from './property-badges';
import { PropertyCardImageCarousel } from './property-card-image-carousel';
import { PropertyCardKebabMenu } from './property-card-kebab-menu';
import { PropertyPersonalizationBadges } from './property-personalization-badges';
import { PropertyRating } from './property-rating';
import { ServiceBadges } from './service-badges';

const PropertyQuickViewDrawer = dynamic(
  () =>
    import('./property-quick-view-drawer').then(
      (m) => m.PropertyQuickViewDrawer,
    ),
  { ssr: false },
);

/**
 * Etiqueta legible del tipo de propiedad para el `alt` accesible de la imagen
 * principal (ítem 397). Incluye los valores legacy que aparecen en mocks/UI
 * (`CUARTO`, `ESTUDIO`) además del enum real del backend.
 */
const TIPO_LABEL: Record<string, string> = {
  CUARTO_INDIVIDUAL: 'cuarto individual',
  CUARTO_COMPARTIDO: 'cuarto compartido',
  DEPARTAMENTO: 'departamento',
  MINI_DEPA: 'mini depa',
  CASA: 'casa',
  SUITE: 'suite',
  CUARTO: 'cuarto',
  ESTUDIO: 'estudio',
};

export type PropertyCardVariant = 'compact' | 'full' | 'feature';

interface Props {
  propiedad: Propiedad;
  variant?: PropertyCardVariant;
  showFavorite?: boolean;
  showDistance?: boolean;
  priority?: boolean;
  className?: string;
  /**
   * Override del `sizes` de la imagen. El default por variant asume el carrusel
   * (compact) o el grid de búsqueda (full); un grid distinto —el del home, que
   * llega a 4 columnas— necesita el suyo o descarga tamaños de más (ítem 93).
   */
  sizes?: string;
  /**
   * Modo selección múltiple (ítem 232, ej. "Seleccionar" en favoritos): pinta un
   * checkbox sobre la imagen y hace que el click en la card alterne la selección
   * en vez de navegar al detalle. El backing store de qué está seleccionado vive
   * fuera de este componente (p.ej. `compare-store`) — este prop solo controla el pintado.
   */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

function PropertyCardImpl({
  propiedad,
  variant = 'full',
  showFavorite = true,
  showDistance = true,
  priority = false,
  className,
  sizes: sizesProp,
  selectable = false,
  selected = false,
  onToggleSelect,
}: Props) {
  const isFeature = variant === 'feature';
  const isCompact = variant === 'compact';

  // Hay rebaja si el precio anterior existe y es mayor al actual (ítem 133). No
  // dependemos del badge REBAJA: el precio real es la fuente de verdad y así
  // nunca pintamos un tachado/descuento inválido (precioAnterior <= precio).
  const hayRebaja =
    propiedad.precioAnterior != null && propiedad.precioAnterior > propiedad.precio;
  const descuentoPct = hayRebaja
    ? Math.round((1 - propiedad.precio / propiedad.precioAnterior!) * 100)
    : 0;

  const [zonas, setZonas] = useState<ZonaResolucion[]>([]);
  useEffect(() => {
    let cancelado = false;
    getZonasCached().then((z) => {
      if (!cancelado) setZonas(z);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const zonaProp = propiedad.coordenadas ? resolverZona(propiedad.coordenadas, zonas) : null;
  const campusProp =
    zonaProp && zonaProp.latitud != null && zonaProp.longitud != null
      ? { lat: zonaProp.latitud, lng: zonaProp.longitud }
      : null;
  const distancia =
    propiedad.coordenadas && campusProp
      ? distanciaHaversineKm(propiedad.coordenadas, campusProp)
      : null;
  const campusNombre = zonaProp?.universidadNombre ?? 'el campus';
  const href = `/property/${propiedad.id}`;

  // Alt descriptivo de la imagen principal (ítem 397): título + tipo + zona, en vez de
  // un alt genérico. `ubicacion` es el texto de zona/barrio que ya se muestra en la card.
  const tipoLabel = TIPO_LABEL[propiedad.tipo] ?? 'cuarto';
  const altPrincipal = `${propiedad.titulo} — ${tipoLabel} en ${propiedad.ubicacion}`;

  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const router = useRouter();

  // Prefetch del detalle al primer hover/focus (ítem 128). Un ref evita
  // relanzarlo en cada re-render o en cada movimiento del puntero: se dispara
  // una sola vez por card. La primera imagen ya carga eager en el carrusel,
  // así que con el route prefetch la navegación al detalle se siente instantánea.
  const prefetchedRef = useRef(false);
  const prefetchDetalle = useCallback(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    router.prefetch(href);
  }, [router, href]);

  // Ítem 418: breakpoints alineados a los grids reales donde vive cada variant
  // (antes usaban 768px como pivote "inventado" — ninguno de los dos grids
  // cambia de columnas ahí, así que entre 640-768px se pedía una imagen más
  // grande de lo que en verdad se pinta).
  // - compact: `PropertyCarousel` la monta en `w-[85vw] sm:w-[60vw] md:w-[380px]`.
  // - full: `ResultsGrid`/`.card-grid` pasan a 2 columnas en `sm` (640px) y a 3
  //   en `lg` (1024px), no en `md` (768px).
  const sizes =
    sizesProp ??
    (isCompact
      ? '(min-width: 768px) 380px, (min-width: 640px) 60vw, 85vw'
      : '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw');

  // Aspect ratio: feature = 16/9, resto = 4/3 (igual que Airbnb)
  const imageAspect = isFeature ? 'aspect-[16/9]' : 'aspect-[4/3]';

  return (
    <article
      onMouseEnter={prefetchDetalle}
      onFocus={prefetchDetalle}
      className={cn(
        '@container/pcard group relative flex h-full cursor-pointer select-none flex-col bg-transparent',
        isCompact && 'rounded-3xl border border-border bg-card p-3 shadow-card transition-shadow duration-200 ease-out-expo hover:shadow-popover',
        className,
      )}
    >
      {/* ── IMAGEN ── */}
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-2xl',
          imageAspect,
        )}
        onClick={() => {
          if (selectable) {
            onToggleSelect?.();
            return;
          }
          router.push(href);
        }}
      >
        <PropertyCardImageCarousel
          imagenes={propiedad.imagenes}
          alt={altPrincipal}
          sizes={sizes}
          priority={priority}
          aspect={imageAspect}
        />

        {/* No disponible */}
        {!propiedad.disponible && (
          <div className="pointer-events-none absolute inset-0 z-[7] flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-white/95 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
              No disponible
            </span>
          </div>
        )}

        {/* Checkbox de selección (ítem 232) — superior izquierda, desplaza los badges.
            Un solo <button> (mismo patrón que FavoriteButton/kebab) en vez del componente
            Checkbox de Radix: ese renderiza otro <button role="checkbox">, y anidarlo
            dentro de un control clicable propio duplicaría el toggle por evento. */}
        {selectable && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSelect?.();
            }}
            aria-pressed={selected}
            aria-label={selected ? 'Quitar de la selección' : 'Seleccionar propiedad'}
            className={cn(
              'absolute left-3 top-3 z-[9] flex size-7 items-center justify-center rounded-full shadow-md ring-1 ring-border transition-colors',
              selected ? 'bg-primary text-primary-foreground' : 'bg-white/95 text-transparent',
            )}
          >
            <Check className="size-4" aria-hidden />
          </button>
        )}

        {/* Badges — superior izquierda */}
        <div
          className={cn(
            'absolute left-3 top-3 z-[8] flex flex-col items-start gap-1.5',
            selectable && 'top-12',
          )}
        >
          <PropertyBadges badges={propiedad.badges} max={2} />
          <PropertyPersonalizationBadges propiedadId={propiedad.id} />
        </div>

        {/* Kebab + Favorito — superior derecha */}
        <div
          className="absolute right-3 top-3 z-[8] flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {!isCompact && (
            <PropertyCardKebabMenu propiedadId={propiedad.id} titulo={propiedad.titulo} />
          )}
          {showFavorite && (
            <FavoriteButton propiedadId={propiedad.id} size={isCompact ? 'sm' : 'md'} />
          )}
        </div>

        {/* Quick-view — inferior derecha, solo en hover */}
        {!isCompact && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setQuickViewOpen(true);
            }}
            aria-label="Vista rápida"
            className={cn(
              'absolute bottom-3 right-3 z-[8] flex size-8 items-center justify-center rounded-full bg-white/95 text-foreground shadow-md',
              'opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none',
              // Container query (no viewport): en un contenedor angosto (sidebar de
              // "similares", carruseles chicos) el botón de vista rápida no cabe bien —
              // se oculta solo por ancho REAL de la card, sin necesitar otra variant.
              '@max-[200px]/pcard:hidden',
            )}
          >
            <Eye className="size-3.5" aria-hidden />
          </button>
        )}
      </div>

      {/* ── INFO ── */}
      <Link
        href={href}
        className="flex flex-1 flex-col focus-visible:outline-none"
        tabIndex={-1}
        onClick={(e) => {
          if (selectable) {
            e.preventDefault();
            onToggleSelect?.();
          }
        }}
      >
          {/* Info superior: título, ubicación, distancia, servicios */}
          <div className="mt-3 flex flex-col" style={{ gap: '3px' }}>
            <div className="flex items-start justify-between gap-3">
              <h3
                className={cn(
                  'flex-1 text-[15px] font-[500] leading-[19px] text-foreground',
                  // Container query: si la card se renderiza muy ancha (spotlight a
                  // futuro), el título crece solo — no afecta a los grids actuales,
                  // que nunca llegan a ese ancho por columna.
                  '@min-[500px]/pcard:text-xl @min-[500px]/pcard:leading-6',
                  isFeature ? 'line-clamp-2 text-xl font-semibold' : 'line-clamp-2',
                )}
              >
                {propiedad.titulo}
              </h3>
              <PropertyRating
                calificacion={propiedad.calificacion}
                totalResenas={propiedad.reseñas}
                fechaCreacion={propiedad.fechaCreacion}
                size="sm"
              />
            </div>

            <p className="flex items-center gap-1 text-[14px] leading-[18px] text-muted-foreground">
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{propiedad.ubicacion}</span>
            </p>

            {showDistance && distancia !== null && (
              <p className="truncate text-[13px] leading-[17px] text-muted-foreground">
                a {formatearDistancia(distancia)} de {campusNombre}
              </p>
            )}

            {/* Solo presente cuando el resultado viene de "Cerca de mí"
                (GET /propiedades/buscar/cerca), con la distancia real a tu ubicación. */}
            {propiedad.distanciaKm != null && (
              <p className="flex items-center gap-1 truncate text-[13px] leading-[17px] text-primary">
                <Navigation className="size-3 shrink-0" aria-hidden />
                a {formatearDistancia(propiedad.distanciaKm)} de ti
              </p>
            )}

            {!isCompact && (propiedad.servicios?.length ?? 0) > 0 && (
              <ServiceBadges
                servicios={propiedad.servicios}
                max={3}
                variant="plain"
                className="mt-1"
              />
            )}
          </div>

          {/* Precio — anclado al fondo del card con mt-auto */}
          <div className="mt-auto flex items-baseline gap-1.5 pt-3">
            {hayRebaja && (
              <span className="tnum text-[14px] text-muted-foreground line-through">
                {formatPEN(propiedad.precioAnterior!)}
              </span>
            )}
            <span
              className={cn(
                'tnum text-[15px] font-bold leading-[19px]',
                hayRebaja ? 'text-primary' : 'text-foreground',
                isFeature && 'text-lg',
              )}
            >
              {formatPEN(propiedad.precio)}
            </span>
            {hayRebaja && descuentoPct > 0 && (
              <span className="self-center rounded-md bg-success/15 px-1.5 py-0.5 text-[11px] font-bold leading-none text-success">
                -{descuentoPct}%
              </span>
            )}
            <span className="text-[14px] text-muted-foreground">por mes</span>
          </div>
      </Link>

      {!isCompact && quickViewOpen && (
        <PropertyQuickViewDrawer
          propiedad={propiedad}
          open={quickViewOpen}
          onClose={() => setQuickViewOpen(false)}
        />
      )}
    </article>
  );
}

export const PropertyCard = memo(PropertyCardImpl);
