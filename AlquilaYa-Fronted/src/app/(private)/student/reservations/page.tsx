'use client';

import { Suspense } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SkeletonCard } from '@/components/shared/skeleton-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyReservationsIllustration } from '@/components/shared/illustrations';
import { ReservationCard } from '@/components/student/reservation-card';
import { useReservations } from '@/hooks/use-reservations';
import { useTabParam } from '@/hooks/use-tab-param';
import type { EstadoReserva } from '@/types/reserva';

type FiltroEstado = 'TODAS' | EstadoReserva;

const FILTROS: Array<{ value: FiltroEstado; label: string }> = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'SOLICITADA', label: 'Pendientes' },
  { value: 'APROBADA', label: 'Aprobadas' },
  { value: 'PAGADA', label: 'Confirmadas' },
  { value: 'FINALIZADA', label: 'Finalizadas' },
  { value: 'RECHAZADA', label: 'Rechazadas' },
  { value: 'CANCELADA', label: 'Canceladas' },
];

const FILTRO_VALUES = FILTROS.map((f) => f.value);

function StudentReservationsContent() {
  const [filtro, setFiltro] = useTabParam({ values: FILTRO_VALUES, defaultValue: 'TODAS' });
  // Ítem 234: el backend pagina DENTRO del filtro de estado activo — ya no se
  // trae todo de una vez para filtrar del lado del cliente.
  const estadoFiltro = filtro === 'TODAS' ? undefined : filtro;
  const { items, cargando, error, pagina, totalPaginas, refrescar, irAPagina, cancelar } =
    useReservations(estadoFiltro);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 space-y-2">
        <h1 className="text-h1">
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

      {!cargando && !error && items.length === 0 && (
        <EmptyState
          illustration={EmptyReservationsIllustration}
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

      {!cargando && !error && items.length > 0 && (
        <>
          <div className="space-y-4">
            {items.map((r) => (
              <ReservationCard key={r.id} reserva={r} onCancelar={cancelar} />
            ))}
          </div>

          {totalPaginas > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => irAPagina(pagina - 1)}
                disabled={pagina === 0}
                className="gap-1"
              >
                <ChevronLeft className="size-4" /> Anterior
              </Button>
              <span className="text-sm font-semibold text-muted-foreground">
                Página {pagina + 1} de {totalPaginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => irAPagina(pagina + 1)}
                disabled={pagina >= totalPaginas - 1}
                className="gap-1"
              >
                Siguiente <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function StudentReservationsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl space-y-3 px-4 py-8 md:px-8 md:py-12">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      }
    >
      <StudentReservationsContent />
    </Suspense>
  );
}
