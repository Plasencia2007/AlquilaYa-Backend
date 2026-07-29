'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { GoogleOneTap } from '@/components/auth/google-one-tap';
import { servicioPropiedades } from '@/services/property-service';
import type { Propiedad } from '@/types/propiedad';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { PropertyCard } from '@/components/student/property-card';
import { RevealOnScroll, Stagger } from '@/components/motion';
import { HOME_CTA_BANNER_IMAGE_URL } from '@/lib/home-assets';

import { HeroSection } from '@/components/home/hero-section';
import { PopularSearches } from '@/components/home/popular-searches';
import { UniversitiesRow } from '@/components/home/universities-row';
import { HowItWorks } from '@/components/home/how-it-works';
import { TrustBadges } from '@/components/home/trust-badges';
import { HomeMapSection } from '@/components/home/home-map-section';
import { EmailCapture } from '@/components/home/email-capture';

/*
 * Secciones bajo el fold: se difieren con next/dynamic para no cargar su JS en el
 * bundle inicial y así mejorar LCP/TTI del hero (MEJORAS.md #103). Cada una vive en
 * su propio chunk que baja tras la hidratación. `ssr: false` porque todas hidratan
 * sus datos en cliente (en el servidor solo renderizan null/skeleton) y no aportan
 * HTML crítico ni SEO al primer render.
 *
 * `HomeMapSection` NO se difiere aquí: ya carga Leaflet con next/dynamic({ssr:false})
 * + IntersectionObserver internamente (solo monta el mapa al acercarse al viewport),
 * así que envolverlo otra vez no aporta y arriesga un doble skeleton / layout shift.
 */
const PlatformStats = dynamic(
  () => import('@/components/home/platform-stats').then((m) => m.PlatformStats),
  // Renderiza null cuando el backend no expone stats; un skeleton de alto fijo colapsaría
  // a nada y provocaría el layout shift que buscamos evitar. Diferir su JS ya es la mejora.
  { ssr: false, loading: () => null },
);

const Testimonials = dynamic(
  () => import('@/components/home/testimonials').then((m) => m.Testimonials),
  // Igual que PlatformStats: es una sección opcional que se oculta si no hay reseñas.
  { ssr: false, loading: () => null },
);

const FeaturedZones = dynamic(
  () => import('@/components/home/featured-zones').then((m) => m.FeaturedZones),
  {
    ssr: false,
    // A diferencia de las otras dos, esta reserva su alto con un skeleton propio durante
    // la carga de datos; replicamos uno del MISMO tamaño mientras baja el chunk para que
    // no haya salto al montar.
    loading: () => (
      <section className="bg-background px-6 py-16 sm:px-12 md:py-24" aria-hidden>
        <div className="mb-8">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-9 w-72" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </section>
    ),
  },
);

/** El grid de destacados llega a 4 columnas en 2xl — el `sizes` por defecto del
 *  variant compact (pensado para carruseles) descargaría de más aquí (ítem 93). */
const DESTACADOS_SIZES =
  '(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw';

export default function Home() {
  const { estaAutenticado } = useAuth();
  const router = useRouter();

  // El home es público para TODOS los roles (MEJORAS.md #102): un arrendador/admin
  // puede ver cómo lucen los anuncios y usar el buscador. La redirección por rol
  // ocurre SOLO post-login (en login-form.tsx), no en cada visita a `/`.

  // El resultado guarda a qué intento pertenece: así "cargando" se deriva en vez de
  // setearse al inicio del effect (un setState síncrono ahí causa render en cascada).
  const [resultado, setResultado] = useState<
    { intento: number; ok: boolean; datos: Propiedad[] } | null
  >(null);
  const [reintentoDestacados, setReintentoDestacados] = useState(0);

  useEffect(() => {
    let cancelado = false;
    servicioPropiedades
      .obtenerDestacadas(4)
      .then((props) => {
        if (!cancelado) setResultado({ intento: reintentoDestacados, ok: true, datos: props });
      })
      .catch(() => {
        // Sin mocks: si el backend falla mostramos un estado de error accionable (no
        // falsas que enlazaban a /property/[id] → 404 en prod).
        if (!cancelado) setResultado({ intento: reintentoDestacados, ok: false, datos: [] });
      });
    return () => {
      cancelado = true;
    };
  }, [reintentoDestacados]);

  const vigente = resultado?.intento === reintentoDestacados ? resultado : null;
  const cargandoDestacados = vigente === null;
  const errorDestacados = vigente !== null && !vigente.ok;
  const destacados = vigente?.datos ?? [];

  return (
    <main className="min-h-screen bg-background">
      <HeroSection />

      <PopularSearches />

      <UniversitiesRow />

      {/* ── Habitaciones destacadas ── */}
      <section className="bg-background px-6 py-16 sm:px-12 md:py-24">
        <RevealOnScroll>
          <header className="mb-8 flex flex-col items-start justify-between gap-4 md:mb-10 md:flex-row md:items-end">
            <div>
              <span className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">
                <span className="h-px w-8 bg-primary" aria-hidden />
                Top picks UPeU
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">
                Habitaciones destacadas
              </h2>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground md:text-base">
                Los 4 cuartos mejor valorados y más cercanos a tu facultad.
              </p>
            </div>
            <Link
              href="/search"
              className="group flex items-center gap-2 self-start text-sm font-bold text-primary transition-all md:self-auto"
            >
              Explorar todos
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </header>
        </RevealOnScroll>

        {cargandoDestacados ? (
          <div className="card-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/3] rounded-2xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : errorDestacados ? (
          <ErrorState
            title="No pudimos cargar las habitaciones destacadas"
            description="Ocurrió un error al conectar con el servidor. Intenta de nuevo."
            onRetry={() => setReintentoDestacados((n) => n + 1)}
          />
        ) : destacados.length === 0 ? (
          <EmptyState
            title="Todavía no hay cuartos destacados"
            description="Sé el primero en explorar todas las publicaciones disponibles."
            action={{ type: 'link', label: 'Explorar cuartos', href: '/search' }}
          />
        ) : (
          <Stagger className="card-grid">
            {destacados.map((p) => (
              <PropertyCard
                key={p.id}
                propiedad={p}
                variant="compact"
                sizes={DESTACADOS_SIZES}
                showFavorite
                showDistance
              />
            ))}
          </Stagger>
        )}
      </section>

      <HowItWorks />

      <TrustBadges />

      <PlatformStats />

      <HomeMapSection />

      <FeaturedZones />

      <Testimonials />

      {/* ── Tipos de usuario ── */}
      <section className="bg-card px-6 py-16 sm:px-12 md:py-24">
        <RevealOnScroll>
          <header className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
            <h2 className="mb-3 text-3xl font-extrabold leading-tight tracking-tighter text-foreground md:text-5xl">
              Diseñado para cada necesidad
            </h2>
            <p className="text-sm text-muted-foreground md:text-base">
              Una plataforma, dos experiencias personalizadas que conectan el futuro.
            </p>
          </header>
        </RevealOnScroll>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <RevealOnScroll className="h-full">
            <Card className="group flex h-full flex-col items-center p-6 text-center md:p-8">
              <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner transition-transform group-hover:scale-110">
                <GraduationCap className="size-8" aria-hidden />
              </div>
              <h3 className="mb-2 text-xl font-black text-foreground md:text-2xl">Estudiantes</h3>
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                Encuentra el cuarto ideal cerca de tu universidad. Filtra por precio y reseñas reales.
              </p>
              <ul className="mb-5 w-full space-y-3 border-t border-border pt-5 text-left">
                <li className="flex items-center gap-3 text-xs font-semibold text-foreground/80">
                  <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden /> Búsqueda inteligente
                </li>
                <li className="flex items-center gap-3 text-xs font-semibold text-foreground/80">
                  <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden /> Filtros universitarios
                </li>
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-auto h-11 w-full rounded-xl font-bold"
                onClick={() => {
                  if (!estaAutenticado) router.push('/register');
                  else router.push('/search');
                }}
              >
                {estaAutenticado ? 'Explorar' : 'Empezar a buscar'}
              </Button>
            </Card>
          </RevealOnScroll>

          <RevealOnScroll delay={0.1} className="h-full">
            <Card className="group relative flex h-full flex-col items-center overflow-hidden border-none bg-primary p-6 text-center text-primary-foreground shadow-xl shadow-primary/25 md:p-8">
              <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-3xl" />
              <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-white/20 text-white shadow-inner backdrop-blur-md transition-transform group-hover:rotate-6">
                <Building2 className="size-8" aria-hidden />
              </div>
              <h3 className="mb-2 text-xl font-black md:text-2xl">Proveedores</h3>
              <p className="mb-5 text-sm leading-relaxed opacity-80">
                Monetiza tus espacios vacíos de forma profesional y eficiente desde tu celular.
              </p>
              <ul className="mb-5 w-full space-y-3 border-t border-white/15 pt-5 text-left">
                <li className="flex items-center gap-3 text-xs font-semibold">
                  <CheckCircle2 className="size-4 shrink-0 opacity-70" aria-hidden /> Dashboard de gestión
                </li>
                <li className="flex items-center gap-3 text-xs font-semibold">
                  <CheckCircle2 className="size-4 shrink-0 opacity-70" aria-hidden /> Pagos automatizados
                </li>
              </ul>
              <Button
                asChild
                size="sm"
                className="mt-auto h-11 w-full rounded-xl bg-white font-bold text-primary hover:bg-white/90"
              >
                <Link href="/arrendadores">Publicar mi cuarto</Link>
              </Button>
            </Card>
          </RevealOnScroll>
        </div>
      </section>

      <EmailCapture />

      {/* ── CTA banner ── */}
      <section className="px-6 py-16 sm:px-12 md:py-24">
        <RevealOnScroll>
          <Card className="flex flex-col items-center overflow-hidden border-none bg-muted p-0 lg:flex-row">
            <div className="flex-1 p-8 text-center md:p-12 lg:p-14 lg:text-left">
              <h2 className="mb-4 text-3xl font-extrabold leading-tight tracking-tighter text-foreground md:text-5xl">
                Convierte tu espacio en ingresos.
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-lg lg:mx-0">
                Únete a cientos de proveedores que confían en AlquilaYa.
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Button asChild size="lg" className="h-12 w-full rounded-xl px-8 font-bold sm:w-auto">
                  <Link href="/arrendadores">Publicar mi cuarto</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 w-full rounded-xl border-border bg-card px-8 font-bold sm:w-auto"
                >
                  <Link href="/search">Explorar cuartos</Link>
                </Button>
              </div>
            </div>
            <div className="relative h-[280px] w-full flex-1 lg:h-full lg:min-h-[480px]">
              <Image
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                alt="Proveedor satisfecho"
                src={HOME_CTA_BANNER_IMAGE_URL}
                className="object-cover brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-muted/80 via-transparent to-transparent lg:bg-gradient-to-l" />
            </div>
          </Card>
        </RevealOnScroll>
      </section>

      {/* Google One Tap (ítem 182): no dibuja nada, solo activa el prompt flotante de Google */}
      <GoogleOneTap />
    </main>
  );
}
