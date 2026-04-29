'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/legacy-badge';
import { Button } from '@/components/ui/legacy-button';
import { ReservationCard } from '@/components/landlord/ReservationCard';
import { ConfirmActionModal } from '@/components/landlord/ConfirmActionModal';
import { useReservationsStore } from '@/stores/reservations-store';
import type { Reserva, EstadoReserva } from '@/types/reserva';

const FILTROS: { id: 'TODOS' | 'APROBADA' | 'PAGADA'; label: string }[] = [
  { id: 'TODOS', label: 'Todas' },
  { id: 'APROBADA', label: 'Aprobadas' },
  { id: 'PAGADA', label: 'Pagadas' },
];

function CardSkeleton() {
  return (
    <div className="rounded-[2.5rem] border border-on-surface/5 bg-surface-container-lowest p-0 overflow-hidden animate-pulse">
      <div className="flex">
        <div className="w-44 h-40 bg-on-surface/5 hidden md:block" />
        <div className="flex-1 p-5 space-y-3">
          <div className="h-4 w-1/2 bg-on-surface/5 rounded-full" />
          <div className="h-3 w-1/3 bg-on-surface/5 rounded-full" />
          <div className="grid grid-cols-4 gap-3 pt-2">
            <div className="h-8 bg-on-surface/5 rounded-xl" />
            <div className="h-8 bg-on-surface/5 rounded-xl" />
            <div className="h-8 bg-on-surface/5 rounded-xl" />
            <div className="h-8 bg-on-surface/5 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

const ESTADOS_CONFIRMADAS: EstadoReserva[] = ['APROBADA', 'PAGADA'];

export default function ReservationsConfirmedPage() {
  const { reservas, loading, error, cargar, finalizar } = useReservationsStore();
  const [filtro, setFiltro] = useState<'TODOS' | 'APROBADA' | 'PAGADA'>('TODOS');
  const [seleccion, setSeleccion] = useState<Reserva | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    // Carga sin filtro: el endpoint no acepta múltiples estados, así que
    // bajamos todo y filtramos client-side a APROBADA + PAGADA.
    cargar();
  }, [cargar]);

  const confirmadas = useMemo(
    () => reservas.filter((r) => ESTADOS_CONFIRMADAS.includes(r.estado)),
    [reservas],
  );

  const filtradas = useMemo(() => {
    if (filtro === 'TODOS') return confirmadas;
    return confirmadas.filter((r) => r.estado === filtro);
  }, [confirmadas, filtro]);

  const handleFinalizar = async () => {
    if (!seleccion) return;
    setWorking(true);
    const ok = await finalizar(seleccion.id);
    setWorking(false);
    if (ok) setSeleccion(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <Badge variant="success" className="mb-3">Confirmadas</Badge>
          <h1 className="text-3xl font-black text-on-surface tracking-tighter opacity-90">
            Reservas activas
          </h1>
          <p className="text-on-surface-variant text-[12px] font-medium mt-0.5 tracking-tight">
            Estudiantes con tu aprobación o que ya completaron el pago.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cargar()}
          isLoading={loading}
          leftIcon={<span className="material-symbols-outlined text-[16px]">refresh</span>}
        >
          Actualizar
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const total =
            f.id === 'TODOS'
              ? confirmadas.length
              : confirmadas.filter((r) => r.estado === f.id).length;
          const activo = filtro === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={
                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all ' +
                (activo
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container')
              }
            >
              {f.label}
              <span
                className={
                  'rounded-full px-2 py-0.5 text-[9px] font-black ' +
                  (activo ? 'bg-white/25' : 'bg-on-surface/5')
                }
              >
                {total}
              </span>
            </button>
          );
        })}
      </div>

      {error && !loading && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-600 font-medium">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {!loading && filtradas.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-[2.5rem] border border-dashed border-on-surface/10 bg-surface-container-lowest">
          <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mb-5">
            <span className="material-symbols-outlined text-3xl">verified</span>
          </div>
          <h2 className="text-xl font-black text-on-surface tracking-tight">
            Aún no hay reservas confirmadas
          </h2>
          <p className="text-on-surface-variant text-sm font-medium mt-1 max-w-sm">
            Aprueba las solicitudes pendientes para verlas aquí.
          </p>
          <Button asChild variant="dark" size="sm" className="mt-6">
            <Link href="/landlord/reservations/pending">Revisar pendientes</Link>
          </Button>
        </div>
      )}

      {!loading && filtradas.length > 0 && (
        <div className="space-y-4">
          {filtradas.map((reserva) => (
            <ReservationCard
              key={reserva.id}
              reserva={reserva}
              onFinalizar={(r) => setSeleccion(r)}
            />
          ))}
        </div>
      )}

      <ConfirmActionModal
        open={!!seleccion}
        title="¿Finalizar reserva?"
        description={
          seleccion
            ? `Marcarás como cerrada la estancia de ${seleccion.estudianteNombre ?? 'el estudiante'} en ${seleccion.propiedadTitulo ?? 'tu propiedad'}. Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Sí, finalizar"
        tone="neutral"
        isLoading={working}
        onConfirm={handleFinalizar}
        onCancel={() => !working && setSeleccion(null)}
      />
    </div>
  );
}
