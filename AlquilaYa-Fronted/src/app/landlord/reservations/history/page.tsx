'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/legacy-badge';
import { Button } from '@/components/ui/legacy-button';
import { ReservationCard } from '@/components/landlord/ReservationCard';
import { useReservationsStore } from '@/stores/reservations-store';
import type { EstadoReserva } from '@/types/reserva';

const ESTADOS_HISTORICO: EstadoReserva[] = ['FINALIZADA', 'RECHAZADA', 'CANCELADA'];
const TAMANO_PAGINA = 10;

const FILTROS_ESTADO: { id: 'TODOS' | EstadoReserva; label: string }[] = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'FINALIZADA', label: 'Finalizadas' },
  { id: 'RECHAZADA', label: 'Rechazadas' },
  { id: 'CANCELADA', label: 'Canceladas' },
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

export default function ReservationsHistoryPage() {
  const { reservas, loading, error, cargar } = useReservationsStore();
  const [filtro, setFiltro] = useState<'TODOS' | EstadoReserva>('TODOS');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pagina, setPagina] = useState(0);

  useEffect(() => {
    // El endpoint sólo acepta un estado a la vez, así que cargamos todas
    // las reservas y filtramos client-side a estados terminales.
    cargar();
  }, [cargar]);

  const historico = useMemo(
    () => reservas.filter((r) => ESTADOS_HISTORICO.includes(r.estado)),
    [reservas],
  );

  const filtradas = useMemo(() => {
    let resultado = historico;
    if (filtro !== 'TODOS') {
      resultado = resultado.filter((r) => r.estado === filtro);
    }
    if (desde) {
      const desdeMs = new Date(desde).getTime();
      resultado = resultado.filter((r) => new Date(r.fechaInicio).getTime() >= desdeMs);
    }
    if (hasta) {
      const hastaMs = new Date(hasta).getTime();
      resultado = resultado.filter((r) => new Date(r.fechaFin).getTime() <= hastaMs);
    }
    return resultado.slice().sort((a, b) => {
      // Más recientes primero por fechaCreacion
      const aMs = new Date(a.fechaCreacion).getTime();
      const bMs = new Date(b.fechaCreacion).getTime();
      return bMs - aMs;
    });
  }, [historico, filtro, desde, hasta]);

  // Reset página cuando cambian los filtros
  useEffect(() => {
    setPagina(0);
  }, [filtro, desde, hasta]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / TAMANO_PAGINA));
  const paginadas = filtradas.slice(
    pagina * TAMANO_PAGINA,
    pagina * TAMANO_PAGINA + TAMANO_PAGINA,
  );

  const limpiarFiltros = () => {
    setFiltro('TODOS');
    setDesde('');
    setHasta('');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <Badge variant="surface" className="mb-3">Historial</Badge>
          <h1 className="text-3xl font-black text-on-surface tracking-tighter opacity-90">
            Historial de reservas
          </h1>
          <p className="text-on-surface-variant text-[12px] font-medium mt-0.5 tracking-tight">
            Reservas finalizadas, rechazadas o canceladas. Solo lectura.
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

      <div className="rounded-3xl border border-on-surface/5 bg-surface-container-lowest p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {FILTROS_ESTADO.map((f) => {
            const total =
              f.id === 'TODOS'
                ? historico.length
                : historico.filter((r) => r.estado === f.id).length;
            const activo = filtro === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                className={
                  'inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all ' +
                  (activo
                    ? 'bg-on-surface text-surface'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container')
                }
              >
                {f.label}
                <span
                  className={
                    'rounded-full px-2 py-0.5 text-[9px] font-black ' +
                    (activo ? 'bg-surface/25 text-surface' : 'bg-on-surface/5')
                  }
                >
                  {total}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <label className="block">
            <span className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-70 mb-1.5">
              Desde
            </span>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full rounded-2xl bg-surface-container-low border border-on-surface/10 px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-70 mb-1.5">
              Hasta
            </span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full rounded-2xl bg-surface-container-low border border-on-surface/10 px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </label>
          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={limpiarFiltros}
              className="w-full"
            >
              Limpiar filtros
            </Button>
          </div>
        </div>
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
          <div className="w-16 h-16 rounded-full bg-on-surface/5 text-on-surface-variant flex items-center justify-center mb-5">
            <span className="material-symbols-outlined text-3xl">history</span>
          </div>
          <h2 className="text-xl font-black text-on-surface tracking-tight">
            Sin registros en el historial
          </h2>
          <p className="text-on-surface-variant text-sm font-medium mt-1 max-w-sm">
            Cuando una reserva concluya, aparecerá en esta lista.
          </p>
        </div>
      )}

      {!loading && filtradas.length > 0 && (
        <>
          <div className="space-y-4">
            {paginadas.map((reserva) => (
              <ReservationCard key={reserva.id} reserva={reserva} readOnly />
            ))}
          </div>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-[11px] text-on-surface-variant font-medium">
                Página <span className="font-black text-on-surface">{pagina + 1}</span> de{' '}
                <span className="font-black text-on-surface">{totalPaginas}</span> ·{' '}
                {filtradas.length} registros
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pagina === 0}
                  onClick={() => setPagina((p) => Math.max(0, p - 1))}
                  leftIcon={<span className="material-symbols-outlined text-[16px]">chevron_left</span>}
                >
                  Anterior
                </Button>
                <Button
                  variant="dark"
                  size="sm"
                  disabled={pagina + 1 >= totalPaginas}
                  onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                  rightIcon={<span className="material-symbols-outlined text-[16px]">chevron_right</span>}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
