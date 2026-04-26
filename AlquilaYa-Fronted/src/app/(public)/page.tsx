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
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="relative z-10 max-w-3xl py-24 text-white">
          <div className="mb-6 flex items-center gap-3">
            <span className="h-px w-10 bg-primary" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">
              Residencias universitarias · Lima
            </span>
          </div>

          <h1 className="font-headline text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] text-white sm:text-6xl md:text-[5.5rem]">
            El cuarto perfecto,
            <br />
            <span className="text-primary">cerca de la UPeU.</span>
          </h1>

          <p className="mt-8 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
            Cuartos verificados a 15 minutos de tu facultad. Reserva, paga y múdate sin
            perder un solo día de clases.
          </p>

          <form
            onSubmit={handleBuscar}
            className="mt-10 flex max-w-3xl flex-col gap-0 rounded-2xl bg-background p-1.5 shadow-2xl md:flex-row md:rounded-full"
          >
            <div className="flex flex-1 items-center gap-3 border-b border-primary/10 px-6 py-4 md:border-b-0 md:border-r">
              <MapPin className="size-5 text-primary" aria-hidden />
              <input
                type="text"
                value={zonaInput}
                onChange={(e) => setZonaInput(e.target.value)}
                placeholder="¿En qué zona buscas?"
                aria-label="Zona"
                className="w-full border-none bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <div className="flex flex-1 items-center gap-3 px-6 py-4">
              <HomeIcon className="size-5 text-primary" aria-hidden />
              <Select
                value={tipoInput}
                onValueChange={(v) => setTipoInput(v as TipoPropiedadFiltro)}
              >
                <SelectTrigger
                  aria-label="Tipo de cuarto"
                  className="h-auto w-full border-none bg-transparent p-0 text-sm font-medium text-foreground shadow-none focus:ring-0 focus:ring-offset-0 [&>span]:text-left"
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
              className="h-14 w-full rounded-xl px-12 text-sm font-bold shadow-xl shadow-primary/20 md:w-auto md:rounded-full"
            >
              <Search className="size-4" aria-hidden /> Buscar
            </Button>
          </form>
        </div>
      </section>

      {/* ── Habitaciones destacadas ── */}
      <section className="bg-background px-6 py-16 sm:px-12 md:py-24">
        <header className="mb-10 flex flex-col items-start justify-between gap-6 md:mb-12 md:flex-row md:items-end">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">
              <span className="h-px w-8 bg-primary" aria-hidden />
              Top picks UPeU
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Habitaciones destacadas
            </h2>
            <p className="mt-3 max-w-lg text-base text-muted-foreground md:text-lg">
              Los 4 cuartos mejor valorados y más cercanos a tu facultad.
            </p>
          </div>
          <Link
            href="/search"
            className="group flex items-center gap-2 self-start text-sm font-bold text-primary transition-all md:self-auto md:text-base"
          >
            Explorar todos
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </header>

        <PropertyCarousel propiedades={destacados} />
      </section>

      {/* ── Tipos de usuario ── */}
      <section className="bg-card px-6 py-20 sm:px-12 md:py-32">
        <header className="mx-auto mb-16 max-w-3xl text-center md:mb-24">
          <h2 className="mb-6 text-4xl font-extrabold leading-tight tracking-tighter text-foreground md:text-6xl">
            Diseñado para cada necesidad
          </h2>
          <p className="text-base text-muted-foreground md:text-xl">
            Una plataforma, tres experiencias personalizadas que conectan el futuro.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <Card className="group flex flex-col items-center p-10 text-center">
            <div className="mb-10 flex size-20 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-inner transition-transform group-hover:scale-110">
              <GraduationCap className="size-9" aria-hidden />
            </div>
            <h3 className="mb-4 text-2xl font-black text-foreground md:text-3xl">Estudiantes</h3>
            <p className="mb-10 text-sm leading-relaxed text-muted-foreground md:text-lg">
              Encuentra el cuarto ideal cerca de tu universidad. Filtra por precio y reseñas reales.
            </p>
            <ul className="mb-10 w-full space-y-4 border-t border-border pt-8 text-left">
              <li className="flex items-center gap-4 text-xs font-semibold text-foreground/80 md:text-sm">
                <CheckCircle2 className="size-4 text-primary" aria-hidden /> Búsqueda inteligente
              </li>
              <li className="flex items-center gap-4 text-xs font-semibold text-foreground/80 md:text-sm">
                <CheckCircle2 className="size-4 text-primary" aria-hidden /> Filtros universitarios
              </li>
            </ul>
            <Button
              variant="outline"
              size="lg"
              className="h-14 w-full rounded-xl text-base font-bold"
              onClick={() => {
                if (!estaAutenticado) openAuthModal('register');
                else router.push('/search');
              }}
            >
              {estaAutenticado ? 'Explorar' : 'Empezar a buscar'}
            </Button>
          </Card>

          <Card className="group relative flex flex-col items-center overflow-hidden border-none bg-primary p-10 text-center text-primary-foreground shadow-2xl shadow-primary/30">
            <div className="absolute -right-12 -top-12 size-48 rounded-full bg-white/10 blur-3xl" />
            <div className="mb-10 flex size-20 items-center justify-center rounded-3xl bg-white/20 text-white shadow-inner backdrop-blur-md transition-transform group-hover:rotate-6">
              <Building2 className="size-9" aria-hidden />
            </div>
            <h3 className="mb-4 text-2xl font-black md:text-3xl">Proveedores</h3>
            <p className="mb-10 text-sm leading-relaxed opacity-80 md:text-lg">
              Monetiza tus espacios vacíos de forma profesional y eficiente desde tu celular.
            </p>
            <ul className="mb-10 w-full space-y-4 border-t border-white/15 pt-8 text-left">
              <li className="flex items-center gap-4 text-xs font-semibold md:text-sm">
                <CheckCircle2 className="size-4 opacity-70" aria-hidden /> Dashboard de gestión
              </li>
              <li className="flex items-center gap-4 text-xs font-semibold md:text-sm">
                <CheckCircle2 className="size-4 opacity-70" aria-hidden /> Pagos automatizados
              </li>
            </ul>
            <Button
              size="lg"
              className="h-14 w-full rounded-xl bg-white text-base font-bold text-primary hover:bg-white/90"
              onClick={() => {
                if (!estaAutenticado) openAuthModal('register', 'ARRENDADOR');
                else router.push('/landlord/dashboard');
              }}
            >
              Publicar mi cuarto
            </Button>
          </Card>

          <Card className="group flex flex-col items-center p-10 text-center">
            <div className="mb-10 flex size-20 items-center justify-center rounded-3xl bg-secondary/10 text-secondary shadow-inner transition-transform group-hover:scale-110">
              <ShieldCheck className="size-9" aria-hidden />
            </div>
            <h3 className="mb-4 text-2xl font-black text-foreground md:text-3xl">Administradores</h3>
            <p className="mb-10 text-sm leading-relaxed text-muted-foreground md:text-lg">
              Control total sobre la plataforma. Valida usuarios y analiza métricas en tiempo real.
            </p>
            <ul className="mb-10 w-full space-y-4 border-t border-border pt-8 text-left">
              <li className="flex items-center gap-4 text-xs font-semibold text-foreground/80 md:text-sm">
                <CheckCircle2 className="size-4 text-secondary" aria-hidden /> Moderación avanzada
              </li>
              <li className="flex items-center gap-4 text-xs font-semibold text-foreground/80 md:text-sm">
                <CheckCircle2 className="size-4 text-secondary" aria-hidden /> Reportes de IA
              </li>
            </ul>
            <Button
              variant="outline"
              size="lg"
              className="h-14 w-full rounded-xl border-secondary text-base font-bold text-secondary hover:bg-secondary hover:text-secondary-foreground"
            >
              Gestión central
            </Button>
          </Card>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="relative overflow-hidden px-6 py-20 sm:px-12 md:py-32">
        <Card className="flex flex-col items-center overflow-hidden border-none bg-muted p-0 lg:flex-row">
          <div className="flex-1 p-10 text-center md:p-20 lg:text-left">
            <h2 className="mb-8 text-4xl font-extrabold leading-[1.1] tracking-tighter text-foreground md:text-[5rem]">
              Convierte tu espacio en ingresos.
            </h2>
            <p className="mx-auto mb-12 max-w-xl text-base italic leading-relaxed text-muted-foreground md:text-2xl lg:mx-0">
              Únete a cientos de proveedores que confían en AlquilaYa.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
              <Button
                size="lg"
                className="h-14 w-full rounded-xl px-10 text-base font-bold sm:w-auto"
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
                className="h-14 w-full rounded-xl border-border bg-card px-10 text-base font-bold sm:w-auto"
              >
                Guía completa
              </Button>
            </div>
          </div>
          <div className="relative h-[350px] w-full flex-1 lg:h-full lg:min-h-[600px]">
            <Image
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              alt="Proveedor satisfecho"
              src="https://images.unsplash.com/photo-1557053910-d9eadeed1c58?q=80&w=1974&auto=format&fit=crop"
              className="object-cover"
            />
          </div>
        </Card>
      </section>
    </main>
  );
}
