'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Home as HomeIcon, MapPin, Navigation, Search } from 'lucide-react';

import { cn } from '@/lib/cn';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SlideUp } from '@/components/motion';
import { TIPOS_PROPIEDAD, type TipoPropiedadFiltro } from '@/schemas/search-schema';
import { HOME_HERO_IMAGE_URL, HOME_HERO_BLUR_DATA_URL } from '@/lib/home-assets';
import { getZonasCached } from '@/lib/zonas-cache';
import type { ZonaResolucion } from '@/services/universidad-service';
import { catalogosService, type ItemCatalogo } from '@/services/catalogos-service';

const TIPO_LABELS: Record<TipoPropiedadFiltro, string> = {
  CUARTO_INDIVIDUAL: 'Cuarto individual',
  CUARTO_COMPARTIDO: 'Cuarto compartido',
  DEPARTAMENTO: 'Departamento',
  MINI_DEPA: 'Mini depa',
  CASA: 'Casa',
  SUITE: 'Suite',
};

/** Subtítulo por defecto del hero: idéntico al histórico hardcodeado. Es lo que se
 *  muestra en el primer paint y lo que queda si no hay banner de hero o si falla la
 *  llamada al catálogo. El titular por defecto (con resalte de dos tonos) y la imagen
 *  (`HOME_HERO_IMAGE_URL`) viven directamente en el JSX / home-assets. */
const HERO_SUBTITULO_FALLBACK =
  'Cuartos verificados a 15 minutos de tu facultad. Reserva, paga y múdate sin perder un solo día de clases.';

/** El backend ya serializa `imagenUrl` en los ítems BANNER (entidad directa, migración
 *  V2), pero el tipo compartido `ItemCatalogo` aún no lo declara — lo augmentamos local. */
type BannerItem = ItemCatalogo & { imagenUrl?: string | null };

/**
 * El catálogo BANNER es multipropósito (también alimenta las tarjetas del dashboard del
 * estudiante), así que para el hero tomamos SOLO el banner cuya clave `valor` es
 * reconocible como "hero del home". Así un banner promocional cualquiera NO altera la
 * portada y el fallback sigue siendo transparente.
 *
 * Convención (documentada): crear un ítem BANNER activo con `valor` = `hero-home`
 * (o `home-hero` / `hero`). Mapeo de campos → hero:
 *   nombre      → titular (H1)
 *   descripcion → subtítulo
 *   imagenUrl   → imagen de fondo
 * Cada campo se aplica solo si viene con contenido; si falta, se conserva el default.
 */
const CLAVES_HERO = new Set(['hero-home', 'home-hero', 'hero']);

function seleccionarBannerHero(items: BannerItem[]): BannerItem | null {
  return items.find((it) => CLAVES_HERO.has((it.valor ?? '').trim().toLowerCase())) ?? null;
}

/**
 * Hero público autocontenido: imagen de fondo (con blur placeholder + Ken Burns),
 * gradientes de contraste WCAG AA, titular y buscador. El buscador combina un
 * Combobox de zonas del catálogo (MEJORAS.md #82), un Select de tipo de cuarto y
 * un acceso "Cerca de mí" que usa geolocalización. No recibe props.
 */
export function HeroSection() {
  const router = useRouter();

  const [zonaId, setZonaId] = useState('');
  const [tipoInput, setTipoInput] = useState<TipoPropiedadFiltro | ''>('');
  const [zonas, setZonas] = useState<ZonaResolucion[]>([]);
  const [cargandoZonas, setCargandoZonas] = useState(true);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);

  // Contenido del hero gestionable desde el catálogo (MEJORAS.md #105). Arranca en null
  // para que el primer paint use SIEMPRE el contenido por defecto (above-the-fold, imagen
  // con priority); solo se reemplaza si llega un banner de hero válido. Si no hay banner o
  // la llamada falla, degrada en silencio al fallback.
  const [heroBanner, setHeroBanner] = useState<BannerItem | null>(null);

  useEffect(() => {
    let cancelado = false;
    catalogosService
      .obtenerPorTipo('BANNER')
      .then((items) => {
        if (cancelado) return;
        const hero = seleccionarBannerHero(items);
        if (hero) setHeroBanner(hero);
      })
      .catch(() => {
        // Silencio deliberado: el hero conserva el contenido por defecto ya renderizado.
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    getZonasCached()
      .then((data) => {
        if (!cancelado) setZonas(data);
      })
      .finally(() => {
        if (!cancelado) setCargandoZonas(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // Zonas del catálogo como opciones del Combobox. Si un nombre se repite entre
  // universidades (roadmap multi-universidad), se desambigua con la universidad.
  const zonaOptions = useMemo<ComboboxOption[]>(() => {
    const repetidos = new Map<string, number>();
    zonas.forEach((z) => repetidos.set(z.nombre, (repetidos.get(z.nombre) ?? 0) + 1));
    return zonas.map((z) => ({
      value: String(z.id),
      label:
        (repetidos.get(z.nombre) ?? 0) > 1 ? `${z.nombre} · ${z.universidadNombre}` : z.nombre,
    }));
  }, [zonas]);

  const handleBuscar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const zona = zonas.find((z) => String(z.id) === zonaId);
    if (zona) {
      // Filtro por universidad + zona del catálogo: el mismo formato que consume el
      // buscador (WhereSearch), más preciso que el texto libre `zona`.
      params.set('universidadId', String(zona.universidadId));
      params.set('zonaId', String(zona.id));
    }
    if (tipoInput) params.set('tipo', tipoInput);
    const qs = params.toString();
    router.push(qs ? `/search?${qs}` : '/search');
  };

  const handleCercaDeMi = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      notify.error('Tu navegador no soporta geolocalización.', 'No disponible');
      return;
    }
    setBuscandoUbicacion(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setBuscandoUbicacion(false);
        // Las coords no viajan en la URL (privacidad + URLs idempotentes del buscador);
        // se navega con `orden=cercania`, formato que el buscador ya entiende y que allí
        // re-solicita la ubicación para ordenar por tu posición real.
        router.push('/search?orden=cercania');
      },
      () => {
        setBuscandoUbicacion(false);
        notify.error(
          'No pudimos obtener tu ubicación. Activa el permiso e inténtalo de nuevo.',
          'Ubicación',
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const zonaPlaceholder = cargandoZonas
    ? 'Cargando zonas…'
    : zonaOptions.length === 0
      ? 'Zonas no disponibles'
      : '¿En qué zona buscas?';

  // Contenido efectivo del hero: cada campo cae al default por separado para tolerar
  // banners parciales (p.ej. un banner con titular pero sin imagen conserva la de fondo).
  const heroTitulo = heroBanner?.nombre?.trim() || null;
  const heroSubtitulo = heroBanner?.descripcion?.trim() || HERO_SUBTITULO_FALLBACK;
  const heroImagen = heroBanner?.imagenUrl?.trim() || HOME_HERO_IMAGE_URL;
  const heroImagenAlt = heroTitulo || 'Habitación universitaria amueblada';

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden rounded-b-[2rem] px-6 sm:px-12 md:rounded-b-[3rem]">
      <div className="absolute inset-0">
        <Image
          fill
          priority
          sizes="100vw"
          placeholder="blur"
          blurDataURL={HOME_HERO_BLUR_DATA_URL}
          alt={heroImagenAlt}
          src={heroImagen}
          className="animate-ken-burns object-cover brightness-75"
        />
        {/* Gradiente denso hacia la izquierda + capa oscura para garantizar contraste WCAG AA
            (>=4.5:1 incluso sobre el punto más claro de la foto, con margen). */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
      </div>

      <SlideUp className="relative z-10 max-w-3xl py-24 text-white">
        <div className="mb-6 flex items-center gap-3">
          <span className="h-px w-10 bg-brand-400" aria-hidden />
          <span className="inline-block rounded-full bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-200 backdrop-blur-sm">
            Residencias universitarias · Lima
          </span>
        </div>

        <h1 className="text-display text-white drop-shadow-lg">
          {heroTitulo ?? (
            <>
              El cuarto perfecto,
              <br />
              <span className="text-brand-400">cerca de la UPeU.</span>
            </>
          )}
        </h1>

        <p className="mt-8 max-w-xl text-base font-medium leading-relaxed text-white/90 drop-shadow sm:text-lg">
          {heroSubtitulo}
        </p>

        <form
          onSubmit={handleBuscar}
          className="mt-10 flex max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl bg-white p-1.5 shadow-2xl shadow-black/30 md:flex-row md:rounded-full"
        >
          <div className="flex flex-1 items-center gap-3 border-b border-cream-300 px-6 py-4 md:border-b-0 md:border-r">
            <MapPin className="size-5 shrink-0 text-brand-700" aria-hidden />
            <Combobox
              options={zonaOptions}
              value={zonaId}
              onChange={setZonaId}
              placeholder={zonaPlaceholder}
              searchPlaceholder="Buscar zona…"
              emptyText="Sin coincidencias en el catálogo"
              disabled={cargandoZonas || zonaOptions.length === 0}
              className="h-auto min-w-0 flex-1 justify-between border-none bg-transparent p-0 text-sm font-medium text-cream-900 shadow-none hover:bg-transparent hover:text-cream-900 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <div className="flex flex-1 items-center gap-3 px-6 py-4">
            <HomeIcon className="size-5 shrink-0 text-brand-700" aria-hidden />
            <Select
              value={tipoInput}
              onValueChange={(v) => setTipoInput(v as TipoPropiedadFiltro)}
            >
              <SelectTrigger
                aria-label="Tipo de cuarto"
                className="h-auto w-full border-none bg-transparent p-0 text-sm font-medium text-cream-900 shadow-none focus:ring-0 focus:ring-offset-0 [&>span]:text-left [&>span:empty]:text-cream-500 [&>span:empty]:font-normal"
              >
                <SelectValue placeholder="Tipo de cuarto" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_PROPIEDAD.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-14 w-full rounded-xl px-12 text-sm font-bold shadow-xl md:w-auto md:rounded-full"
          >
            <Search className="size-4" aria-hidden /> Buscar
          </Button>
        </form>

        <button
          type="button"
          onClick={handleCercaDeMi}
          disabled={buscandoUbicacion}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/30 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/45 disabled:opacity-60"
        >
          <Navigation
            className={cn('size-4', buscandoUbicacion && 'animate-pulse')}
            aria-hidden
          />
          {buscandoUbicacion ? 'Ubicándote…' : 'Cerca de mí'}
        </button>
      </SlideUp>
    </section>
  );
}
