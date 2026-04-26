'use client';

import { use, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ArrowLeft,
  BedDouble,
  Building2,
  CalendarCheck,
  MapPin,
  MessageCircle,
  Ruler,
  ShowerHead,
  Star,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { PropertyGallery } from '@/components/property/property-gallery';
import { ServiceBadges } from '@/components/student/service-badges';
import { FavoriteButton } from '@/components/student/favorite-button';
import { ReservationFormDialog } from '@/components/student/reservation-form-dialog';
import { ContactLandlordDialog } from '@/components/student/contact-landlord-dialog';
import { servicioPropiedades } from '@/services/property-service';
import { distanciaAUpeuKm, formatearDistancia } from '@/lib/geo';
import { useHistory } from '@/hooks/use-history';
import type { Propiedad } from '@/types/propiedad';

const PropertiesMap = dynamic(() => import('@/components/shared/PropertiesMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full rounded-2xl" />,
});

interface Props {
  params: Promise<{ id: string }>;
}

export default function PropertyDetailPage({ params }: Props) {
  const { id } = use(params);
  const [propiedad, setPropiedad] = useState<Propiedad | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'no-encontrado' | 'error'>('cargando');
  const { registrar } = useHistory();

  useEffect(() => {
    let cancelado = false;
    servicioPropiedades
      .obtenerPorId(id)
      .then((p) => {
        if (cancelado) return;
        if (!p) setEstado('no-encontrado');
        else {
          setPropiedad(p);
          setEstado('ok');
          registrar(id);
        }
      })
      .catch(() => {
        if (cancelado) return;
        setEstado('error');
      });
    return () => {
      cancelado = true;
    };
  }, [id, registrar]);

  if (estado === 'cargando') {
    return (
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-28 sm:px-12">
        <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </main>
    );
  }

  if (estado === 'no-encontrado') {
    return (
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-28 sm:px-12">
        <ErrorState
          title="Cuarto no encontrado"
          description="El cuarto que buscas ya no está disponible o el enlace es incorrecto."
          retryLabel="Volver a explorar"
          onRetry={() => {
            window.location.href = '/search';
          }}
        />
      </main>
    );
  }

  if (estado === 'error' || !propiedad) {
    return (
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-28 sm:px-12">
        <ErrorState
          title="No pudimos cargar este cuarto"
          description="Inténtalo de nuevo en un momento."
          retryLabel="Reintentar"
          onRetry={() => window.location.reload()}
        />
      </main>
    );
  }

  const distancia = distanciaAUpeuKm(propiedad.coordenadas);

  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-24 sm:px-12 md:pt-28">
      <Link
        href="/search"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden /> Volver a la búsqueda
      </Link>

      <PropertyGallery imagenes={propiedad.imagenes} alt={propiedad.titulo} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <header className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                  {propiedad.titulo}
                </h1>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4" aria-hidden /> {propiedad.direccion}
                  {distancia !== null && (
                    <span className="font-semibold text-primary">
                      · a {formatearDistancia(distancia)} de UPeU
                    </span>
                  )}
                </p>
              </div>
              <FavoriteButton propiedadId={propiedad.id} size="lg" />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 font-bold text-foreground">
                <Star className="size-4 fill-yellow-500 text-yellow-500" aria-hidden />
                {propiedad.calificacion.toFixed(1)}
                <span className="font-normal text-muted-foreground">
                  ({propiedad.reseñas} reseñas)
                </span>
              </span>
              <span aria-hidden className="text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">
                Publicado por <strong className="text-foreground">{propiedad.propietarioNombre}</strong>
              </span>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-4">
            <Stat icon={BedDouble} value={`${propiedad.habitaciones}`} label="Habitación" />
            <Stat icon={ShowerHead} value={`${propiedad.baños}`} label="Baño" />
            <Stat icon={Ruler} value={`${propiedad.area} m²`} label="Área" />
            <Stat icon={Building2} value={propiedad.tipo} label="Tipo" />
          </section>

          <section className="space-y-3">
            <h2 className="font-headline text-xl font-bold">Sobre este cuarto</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{propiedad.descripcion}</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-headline text-xl font-bold">Servicios incluidos</h2>
            <ServiceBadges
              servicios={propiedad.servicios}
              max={propiedad.servicios.length}
              variant="plain"
            />
          </section>

          {propiedad.coordenadas && (
            <section className="space-y-3">
              <h2 className="font-headline text-xl font-bold">Ubicación</h2>
              <div className="overflow-hidden rounded-2xl border border-border">
                <PropertiesMap propiedades={[propiedad]} className="h-[320px] w-full" />
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">Precio mensual</p>
            <p className="mt-1 text-3xl font-black text-primary">
              S/ {propiedad.precio.toLocaleString('es-PE')}
              <span className="ml-1 text-sm font-normal text-muted-foreground">/mes</span>
            </p>

            <ReservationFormDialog
              propiedad={propiedad}
              trigger={
                <Button
                  size="lg"
                  className="mt-5 h-12 w-full rounded-full text-sm font-bold shadow-lg shadow-primary/20"
                >
                  <CalendarCheck className="size-4" aria-hidden /> Reservar cuarto
                </Button>
              }
            />

            <ContactLandlordDialog
              propiedad={propiedad}
              trigger={
                <Button
                  variant="outline"
                  size="lg"
                  className="mt-3 h-12 w-full rounded-full text-sm font-bold"
                >
                  <MessageCircle className="size-4" aria-hidden /> Contactar arrendador
                </Button>
              }
            />

            <p className="mt-4 text-xs text-muted-foreground">
              Sin cargos hasta confirmar. La reserva se concreta al pagar el primer mes.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof BedDouble;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-bold text-foreground">{value}</p>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
