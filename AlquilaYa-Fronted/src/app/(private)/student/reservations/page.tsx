'use client';

import { useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SkeletonCard } from '@/components/shared/skeleton-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { ReservationCard } from '@/components/student/reservation-card';
import { useReservations } from '@/hooks/use-reservations';
import type { EstadoReserva, Reserva } from '@/types/reserva';

type FiltroEstado = 'TODAS' | EstadoReserva;

const FILTROS: Array<{ value: FiltroEstado; label: string }> = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'SOLICITADA', label: 'Pendientes' },
  { value: 'APROBADA', label: 'Aprobadas' },
  { value: 'PAGADA', label: 'Confirmadas' },
  { value: 'RECHAZADA', label: 'Rechazadas' },
  { value: 'CANCELADA', label: 'Canceladas' },
];

export default function StudentReservationsPage() {
  const [filtro, setFiltro] = useState<FiltroEstado>('TODAS');
  const { items, cargando, error, refrescar, cancelar } = useReservations();

  const filtradas: Reserva[] = useMemo(() => {
    if (filtro === 'TODAS') return items;
    return items.filter((r) => r.estado === filtro);
  }, [items, filtro]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 space-y-2">
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          Mis reservas
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Gestiona el estado de tus solicitudes de cuarto.
        </p>
      </header>

      <Tabs value={filtro} onValueChange={(v) => setFiltro(v as FiltroEstado)} className="mb-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
          {FILTROS.map((f) => (
            <TabsTrigger
              key={f.value}
              value={f.value}
              className="rounded-full border border-border bg-card px-4 py-1.5 text-xs font-bold data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {cargando && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!cargando && error && (
        <ErrorState
          title="No pudimos cargar tus reservas"
          description="Inténtalo de nuevo en un momento."
          retryLabel="Reintentar"
          onRetry={refrescar}
        />
      )}

      {!cargando && !error && filtradas.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title={filtro === 'TODAS' ? 'No tienes reservas todavía' : 'Sin reservas en este estado'}
          description={
            filtro === 'TODAS'
              ? 'Cuando solicites un cuarto, aparecerá aquí.'
              : 'Cambia de filtro para ver otras reservas.'
          }
          action={
            filtro === 'TODAS'
              ? { type: 'link', label: 'Buscar cuartos', href: '/search' }
              : undefined
          }
        />
      )}

      {!cargando && !error && filtradas.length > 0 && (
        <div className="space-y-4">
          {filtradas.map((r) => (
            <ReservationCard key={r.id} reserva={r} onCancelar={cancelar} />
          ))}
        </div>
      )}
    </div>
  );
}
