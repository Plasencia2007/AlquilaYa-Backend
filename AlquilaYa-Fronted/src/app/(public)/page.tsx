'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  GraduationCap,
  Home as HomeIcon,
  MapPin,
  Search,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';
import { MOCK_PROPIEDADES } from '@/mocks/propiedades';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PropertyCarousel } from '@/components/student/property-carousel';
import { TIPOS_PROPIEDAD, type TipoPropiedadFiltro } from '@/schemas/search-schema';
import { distanciaAUpeuKm } from '@/lib/geo';

const TIPO_LABELS: Record<TipoPropiedadFiltro, string> = {
  CUARTO: 'Cuarto',
  DEPARTAMENTO: 'Departamento',
  ESTUDIO: 'Estudio',
  CASA: 'Casa',
};

export default function Home() {
  const { estaAutenticado, usuario, cargando } = useAuth();
  const { open: openAuthModal } = useAuthModal();
  const router = useRouter();

  useEffect(() => {
    if (cargando || !estaAutenticado || !usuario) return;
    if (usuario.rol === 'ARRENDADOR') router.replace('/landlord/dashboard');
    else if (usuario.rol === 'ADMIN') router.replace('/admin-master');
  }, [estaAutenticado, usuario, cargando, router]);

  const [zonaInput, setZonaInput] = useState('');
  const [tipoInput, setTipoInput] = useState<TipoPropiedadFiltro | ''>('');

  const destacados = MOCK_PROPIEDADES.filter((p) => p.disponible)
    .slice()
    .sort((a, b) => {
      const da = distanciaAUpeuKm(a.coordenadas) ?? Number.POSITIVE_INFINITY;
      const db = distanciaAUpeuKm(b.coordenadas) ?? Number.POSITIVE_INFINITY;
      return da - db;
    })
    .slice(0, 4);

  const requiereRedireccion = usuario && (usuario.rol === 'ARRENDADOR' || usuario.rol === 'ADMIN');

  const handleBuscar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const zona = zonaInput.trim();
    if (zona) params.set('zona', zona);
    if (tipoInput) params.set('tipo', tipoInput);
    router.push(params.toString() ? `/search?${params.toString()}` : '/search');
  };

  if (!cargando && estaAutenticado && requiereRedireccion) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
        <div className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <section className="relative flex min-h-screen items-center overflow-hidden rounded-b-[2rem] px-6 sm:px-12 md:rounded-b-[3rem]">
        <div className="absolute inset-0">
          <Image
            fill
            priority
            sizes="100vw"
            alt="Habitación universitaria amueblada"
            src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop"
            className="object-cover brightness-75"
          />
          {/* Gradiente denso hacia abajo + capa oscura para garantizar contraste WCAG AA */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-3xl py-24 text-white">
          <div className="mb-6 flex items-center gap-3">
            <span className="h-px w-10 bg-red-400" aria-hidden />
            <span className="inline-block rounded-full bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-red-200 backdrop-blur-sm">
              Residencias universitarias · Lima
            </span>
          </div>

          <h1 className="font-headline text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] text-white drop-shadow-lg sm:text-6xl md:text-[5.5rem]">
            El cuarto perfecto,
            <br />
            <span className="text-red-300">cerca de la UPeU.</span>
          </h1>

          <p className="mt-8 max-w-xl text-base font-medium leading-relaxed text-white/90 drop-shadow sm:text-lg">
            Cuartos verificados a 15 minutos de tu facultad. Reserva, paga y múdate sin
            perder un solo día de clases.
          </p>

          <form
            onSubmit={handleBuscar}
            className="mt-10 flex max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl bg-white p-1.5 shadow-2xl shadow-black/30 md:flex-row md:rounded-full"
          >
            <div className="flex flex-1 items-center gap-3 border-b border-stone-200 px-6 py-4 md:border-b-0 md:border-r">
              <MapPin className="size-5 shrink-0 text-red-700" aria-hidden />
              <input
                type="text"
                value={zonaInput}
                onChange={(e) => setZonaInput(e.target.value)}
                placeholder="¿En qué zona buscas?"
                aria-label="Zona"
                className="w-full border-none bg-transparent text-sm font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none"
              />
            </div>
            <div className="flex flex-1 items-center gap-3 px-6 py-4">
              <HomeIcon className="size-5 shrink-0 text-red-700" aria-hidden />
              <Select
                value={tipoInput}
                onValueChange={(v) => setTipoInput(v as TipoPropiedadFiltro)}
              >
                <SelectTrigger
                  aria-label="Tipo de cuarto"
                  className="h-auto w-full border-none bg-transparent p-0 text-sm font-medium text-stone-800 shadow-none focus:ring-0 focus:ring-offset-0 [&>span]:text-left [&>span:empty]:text-stone-400 [&>span:empty]:font-normal"
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
              className="h-14 w-full rounded-xl bg-red-700 px-12 text-sm font-bold text-white shadow-xl hover:bg-red-800 md:w-auto md:rounded-full"
            >
              <Search className="size-4" aria-hidden /> Buscar
            </Button>
          </form>
        </div>
      </section>

      {/* ── Habitaciones destacadas ── */}
      <section className="bg-background px-6 py-16 sm:px-12 md:py-24">
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

        <PropertyCarousel propiedades={destacados} />
      </section>

      {/* ── Tipos de usuario ── */}
      <section className="bg-card px-6 py-16 sm:px-12 md:py-24">
        <header className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
          <h2 className="mb-3 text-3xl font-extrabold leading-tight tracking-tighter text-foreground md:text-5xl">
            Diseñado para cada necesidad
          </h2>
          <p className="text-sm text-muted-foreground md:text-base">
            Una plataforma, tres experiencias personalizadas que conectan el futuro.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="group flex flex-col items-center p-6 text-center md:p-8">
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
                if (!estaAutenticado) openAuthModal('register');
                else router.push('/search');
              }}
            >
              {estaAutenticado ? 'Explorar' : 'Empezar a buscar'}
            </Button>
          </Card>

          <Card className="group relative flex flex-col items-center overflow-hidden border-none bg-primary p-6 text-center text-primary-foreground shadow-xl shadow-primary/25 md:p-8">
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
              size="sm"
              className="mt-auto h-11 w-full rounded-xl bg-white font-bold text-primary hover:bg-white/90"
              onClick={() => {
                if (!estaAutenticado) openAuthModal('register', 'ARRENDADOR');
                else router.push('/landlord/dashboard');
              }}
            >
              Publicar mi cuarto
            </Button>
          </Card>

          <Card className="group flex flex-col items-center p-6 text-center md:p-8">
            <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-secondary/10 text-secondary shadow-inner transition-transform group-hover:scale-110">
              <ShieldCheck className="size-8" aria-hidden />
            </div>
            <h3 className="mb-2 text-xl font-black text-foreground md:text-2xl">Administradores</h3>
            <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
              Control total sobre la plataforma. Valida usuarios y analiza métricas en tiempo real.
            </p>
            <ul className="mb-5 w-full space-y-3 border-t border-border pt-5 text-left">
              <li className="flex items-center gap-3 text-xs font-semibold text-foreground/80">
                <CheckCircle2 className="size-4 shrink-0 text-secondary" aria-hidden /> Moderación avanzada
              </li>
              <li className="flex items-center gap-3 text-xs font-semibold text-foreground/80">
                <CheckCircle2 className="size-4 shrink-0 text-secondary" aria-hidden /> Reportes de IA
              </li>
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="mt-auto h-11 w-full rounded-xl border-secondary font-bold text-secondary hover:bg-secondary hover:text-secondary-foreground"
            >
              Gestión central
            </Button>
          </Card>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="px-6 py-16 sm:px-12 md:py-24">
        <Card className="flex flex-col items-center overflow-hidden border-none bg-muted p-0 lg:flex-row">
          <div className="flex-1 p-8 text-center md:p-12 lg:p-14 lg:text-left">
            <h2 className="mb-4 text-3xl font-extrabold leading-tight tracking-tighter text-foreground md:text-5xl">
              Convierte tu espacio en ingresos.
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-lg lg:mx-0">
              Únete a cientos de proveedores que confían en AlquilaYa.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Button
                size="lg"
                className="h-12 w-full rounded-xl px-8 font-bold sm:w-auto"
                onClick={() => {
                  if (!estaAutenticado) openAuthModal('register', 'ARRENDADOR');
                  else router.push('/landlord/dashboard');
                }}
              >
                Publicar mi cuarto
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 w-full rounded-xl border-border bg-card px-8 font-bold sm:w-auto"
              >
                Guía completa
              </Button>
            </div>
          </div>
          <div className="relative h-[280px] w-full flex-1 lg:h-full lg:min-h-[480px]">
            <Image
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              alt="Proveedor satisfecho"
              src="https://images.unsplash.com/photo-1557053910-d9eadeed1c58?q=80&w=1974&auto=format&fit=crop"
              className="object-cover brightness-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-muted/80 via-transparent to-transparent lg:bg-gradient-to-l" />
          </div>
        </Card>
      </section>
    </main>
  );
}
