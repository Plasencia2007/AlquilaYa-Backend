'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/legacy-badge';
import { Button } from '@/components/ui/legacy-button';
import { ReservationCard } from '@/components/landlord/ReservationCard';
import { ConfirmActionModal } from '@/components/landlord/ConfirmActionModal';
import { useReservationsStore } from '@/stores/reservations-store';
import type { Reserva } from '@/types/reserva';

type AccionPendiente =
  | { tipo: 'aprobar'; reserva: Reserva }
  | { tipo: 'rechazar'; reserva: Reserva }
  | null;

function CardSkeleton() {
  return (
    <div className="rounded-[2.5rem] border border-on-surface/5 bg-surface-container-lowest p-0 overflow-hidden animate-pulse">
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-44 h-32 md:h-40 bg-on-surface/5" />
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

export default function ReservationsPendingPage() {
  const { reservas, loading, error, cargar, aprobar, rechazar } = useReservationsStore();
  const [accion, setAccion] = useState<AccionPendiente>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    cargar('SOLICITADA');
  }, [cargar]);

  const pendientes = useMemo(
    () => reservas.filter((r) => r.estado === 'SOLICITADA'),
    [reservas],
  );

  const handleConfirm = async (motivo?: string) => {
    if (!accion) return;
    setWorking(true);
    const ok =
      accion.tipo === 'aprobar'
        ? await aprobar(accion.reserva.id)
        : await rechazar(accion.reserva.id, motivo);
    setWorking(false);
    if (ok) setAccion(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <Badge variant="warning" className="mb-3">Pendientes</Badge>
          <h1 className="text-3xl font-black text-on-surface tracking-tighter opacity-90">
            Reservas por aprobar
          </h1>
          <p className="text-on-surface-variant text-[12px] font-medium mt-0.5 tracking-tight">
            Revisa y responde las solicitudes de tus estudiantes a tiempo.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cargar('SOLICITADA')}
          isLoading={loading}
          leftIcon={<span className="material-symbols-outlined text-[16px]">refresh</span>}
        >
          Actualizar
        </Button>
      </header>

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

      {!loading && pendientes.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-[2.5rem] border border-dashed border-on-surface/10 bg-surface-container-lowest">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-5">
            <span className="material-symbols-outlined text-3xl">inbox</span>
          </div>
          <h2 className="text-xl font-black text-on-surface tracking-tight">
            Sin solicitudes nuevas
          </h2>
          <p className="text-on-surface-variant text-sm font-medium mt-1 max-w-sm">
            Cuando un estudiante reserve uno de tus cuartos, aparecerá aquí para que la apruebes.
          </p>
          <Button asChild variant="dark" size="sm" className="mt-6">
            <Link href="/landlord/dashboard">Volver al resumen</Link>
          </Button>
        </div>
      )}

      {!loading && pendientes.length > 0 && (
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
        onConfirm={handleConfirm}
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
        onConfirm={handleConfirm}
        onCancel={() => !working && setAccion(null)}
      />
    </div>
  );
}
