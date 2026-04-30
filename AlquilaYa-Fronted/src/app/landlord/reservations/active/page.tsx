'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/legacy-badge';
import { Button } from '@/components/ui/legacy-button';
import { ReservationCard } from '@/components/landlord/ReservationCard';
import { ConfirmActionModal } from '@/components/landlord/ConfirmActionModal';
import { useReservationsStore } from '@/stores/reservations-store';
import type { Reserva, EstadoReserva } from '@/types/reserva';

type Tab = 'pendientes' | 'confirmadas';
type AccionPendiente =
  | { tipo: 'aprobar'; reserva: Reserva }
  | { tipo: 'rechazar'; reserva: Reserva }
  | null;

const FILTROS_CONFIRMADAS: { id: 'TODOS' | 'APROBADA' | 'PAGADA'; label: string }[] = [
  { id: 'TODOS',    label: 'Todas' },
  { id: 'APROBADA', label: 'Aprobadas' },
  { id: 'PAGADA',   label: 'Pagadas' },
];

const ESTADOS_CONFIRMADAS: EstadoReserva[] = ['APROBADA', 'PAGADA'];

function CardSkeleton() {
  return (
    <div className="rounded-[2.5rem] border border-on-surface/5 bg-surface-container-lowest p-0 overflow-hidden animate-pulse">
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-44 h-32 md:h-40 bg-on-surface/5" />
        <div className="flex-1 p-5 space-y-3">
          <div className="h-4 w-1/2 bg-on-surface/5 rounded-full" />
          <div className="h-3 w-1/3 bg-on-surface/5 rounded-full" />
          <div className="grid grid-cols-4 gap-3 pt-2">
            {[1,2,3,4].map((i) => <div key={i} className="h-8 bg-on-surface/5 rounded-xl" />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReservationsActivePage() {
  const { reservas, loading, error, cargar, aprobar, rechazar, finalizar } = useReservationsStore();
  const [tab, setTab] = useState<Tab>('pendientes');
  const [accion, setAccion] = useState<AccionPendiente>(null);
  const [seleccion, setSeleccion] = useState<Reserva | null>(null);
  const [working, setWorking] = useState(false);
  const [filtroConf, setFiltroConf] = useState<'TODOS' | 'APROBADA' | 'PAGADA'>('TODOS');

  useEffect(() => { cargar(); }, [cargar]);

  const pendientes = useMemo(
    () => reservas.filter((r) => r.estado === 'SOLICITADA'),
    [reservas],
  );

  const confirmadas = useMemo(
    () => reservas.filter((r) => ESTADOS_CONFIRMADAS.includes(r.estado)),
    [reservas],
  );

  const confirmadasFiltradas = useMemo(() => {
    if (filtroConf === 'TODOS') return confirmadas;
    return confirmadas.filter((r) => r.estado === filtroConf);
  }, [confirmadas, filtroConf]);

  const handleConfirmAprobarRechazar = async (motivo?: string) => {
    if (!accion) return;
    setWorking(true);
    const ok =
      accion.tipo === 'aprobar'
        ? await aprobar(accion.reserva.id)
        : await rechazar(accion.reserva.id, motivo);
    setWorking(false);
    if (ok) setAccion(null);
  };

  const handleFinalizar = async () => {
    if (!seleccion) return;
    setWorking(true);
    const ok = await finalizar(seleccion.id);
    setWorking(false);
    if (ok) setSeleccion(null);
  };

  const TABS: { id: Tab; label: string; count: number; badge: React.ReactNode }[] = [
    {
      id: 'pendientes',
      label: 'Pendientes',
      count: pendientes.length,
      badge: <Badge variant="warning">Pendientes</Badge>,
    },
    {
      id: 'confirmadas',
      label: 'Confirmadas',
      count: confirmadas.length,
      badge: <Badge variant="success">Confirmadas</Badge>,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          {TABS.find((t) => t.id === tab)?.badge}
          <h1 className="text-3xl font-black text-on-surface tracking-tighter opacity-90 mt-3">
            Reservas activas
          </h1>
          <p className="text-on-surface-variant text-[12px] font-medium mt-0.5 tracking-tight">
            {tab === 'pendientes'
              ? 'Revisa y responde las solicitudes de tus estudiantes a tiempo.'
              : 'Estudiantes con tu aprobación o que ya completaron el pago.'}
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-on-surface/10 pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              'relative px-5 py-2.5 text-[12px] font-black uppercase tracking-wider transition-all rounded-t-xl ' +
              (tab === t.id
                ? 'bg-surface text-primary border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low')
            }
          >
            {t.label}
            {t.count > 0 && (
              <span className={
                'ml-2 rounded-full px-2 py-0.5 text-[9px] font-black ' +
                (tab === t.id ? 'bg-primary/10 text-primary' : 'bg-on-surface/5 text-on-surface-variant')
              }>
                {t.count}
              </span>
            )}
          </button>
        ))}
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

      {/* ── Tab Pendientes ─────────────────────────────────── */}
      {!loading && tab === 'pendientes' && (
        <>
          {pendientes.length === 0 && !error ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-[2.5rem] border border-dashed border-on-surface/10 bg-surface-container-lowest">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-3xl">inbox</span>
              </div>
              <h2 className="text-xl font-black text-on-surface tracking-tight">Sin solicitudes nuevas</h2>
              <p className="text-on-surface-variant text-sm font-medium mt-1 max-w-sm">
                Cuando un estudiante reserve uno de tus cuartos, aparecerá aquí.
              </p>
              <Button asChild variant="dark" size="sm" className="mt-6">
                <Link href="/landlord/dashboard">Volver al resumen</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {pendientes.map((reserva) => (
                <ReservationCard
                  key={reserva.id}
                  reserva={reserva}
                  onAprobar={(r) => setAccion({ tipo: 'aprobar', reserva: r })}
                  onRechazar={(r) => setAccion({ tipo: 'rechazar', reserva: r })}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Tab Confirmadas ────────────────────────────────── */}
      {!loading && tab === 'confirmadas' && (
        <>
          <div className="flex flex-wrap gap-2">
            {FILTROS_CONFIRMADAS.map((f) => {
              const total = f.id === 'TODOS' ? confirmadas.length : confirmadas.filter((r) => r.estado === f.id).length;
              const activo = filtroConf === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroConf(f.id)}
                  className={
                    'inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all ' +
                    (activo
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container')
                  }
                >
                  {f.label}
                  <span className={'rounded-full px-2 py-0.5 text-[9px] font-black ' + (activo ? 'bg-white/25' : 'bg-on-surface/5')}>
                    {total}
                  </span>
                </button>
              );
            })}
          </div>

          {confirmadasFiltradas.length === 0 && !error ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-[2.5rem] border border-dashed border-on-surface/10 bg-surface-container-lowest">
              <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-3xl">verified</span>
              </div>
              <h2 className="text-xl font-black text-on-surface tracking-tight">Sin reservas confirmadas</h2>
              <p className="text-on-surface-variant text-sm font-medium mt-1 max-w-sm">
                Aprueba las solicitudes pendientes para verlas aquí.
              </p>
              <Button type="button" variant="dark" size="sm" className="mt-6" onClick={() => setTab('pendientes')}>
                Ver pendientes
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {confirmadasFiltradas.map((reserva) => (
                <ReservationCard key={reserva.id} reserva={reserva} onFinalizar={(r) => setSeleccion(r)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Modals aprobar / rechazar */}
      <ConfirmActionModal
        open={accion?.tipo === 'aprobar'}
        title="¿Aprobar esta reserva?"
        description={
          accion?.tipo === 'aprobar'
            ? `Confirmarás la solicitud de ${accion.reserva.estudianteNombre ?? 'el estudiante'} para ${accion.reserva.propiedadTitulo ?? 'tu propiedad'}.`
            : undefined
        }
        confirmLabel="Sí, aprobar"
        tone="success"
        isLoading={working}
        onConfirm={handleConfirmAprobarRechazar}
        onCancel={() => !working && setAccion(null)}
      />
      <ConfirmActionModal
        open={accion?.tipo === 'rechazar'}
        title="Rechazar reserva"
        description={
          accion?.tipo === 'rechazar'
            ? 'Comparte un motivo claro. El estudiante recibirá esta respuesta.'
            : undefined
        }
        confirmLabel="Rechazar reserva"
        tone="danger"
        requireReason
        reasonPlaceholder="Ej. Las fechas ya no están disponibles…"
        isLoading={working}
        onConfirm={handleConfirmAprobarRechazar}
        onCancel={() => !working && setAccion(null)}
      />

      {/* Modal finalizar */}
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
