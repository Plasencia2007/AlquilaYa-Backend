'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CalendarDays, MapPin } from 'lucide-react';

import { CenteredSpinner } from '@/components/shared/centered-spinner';
import { ErrorState } from '@/components/shared/error-state';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { ReservationStatusBadge } from '@/components/shared/reservation-status-badge';
import { ContractActions } from '@/components/student/contract-actions';
import { DepositStatusCard } from '@/components/student/deposit-status-card';
import { ReservationExpiryCountdown } from '@/components/student/reservation-expiry-countdown';
import { ReservationInstallmentsTable } from '@/components/student/reservation-installments-table';
import { formatearFecha, formatRango } from '@/lib/relative-time';
import { formatPEN } from '@/lib/money';
import { reservationService } from '@/services/reservation-service';
import type { Reserva } from '@/types/reserva';

export default function ReservaDetallePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'no-encontrado' | 'error'>('cargando');
  // Se incrementa para forzar un nuevo intento de carga (ver `reintentar`) sin duplicar la
  // lógica de fetch: el efecto de abajo corre de nuevo porque cambia su dependencia.
  const [intento, setIntento] = useState(0);
  // true una vez que YA se cargó la reserva con éxito alguna vez: distingue el fallo inicial
  // (pantalla en blanco) de un refresh en segundo plano (tras firmar el contrato, etc.), que
  // no debe tapar la página ya cargada con un estado de error.
  const cargadoRef = useRef(false);

  const reintentar = () => {
    setEstado('cargando');
    setIntento((n) => n + 1);
  };

  // Mismo patrón que `property/[id]/page.tsx`: fetch encadenado con `.then()/.catch()` dentro
  // del propio efecto (nada de invocar una función que setea estado por fuera) — así el setState
  // solo ocurre dentro del callback de la promesa, nunca de forma síncrona en el cuerpo del efecto.
  useEffect(() => {
    if (!id) return;
    let cancelado = false;
    reservationService
      .obtenerPorId(id)
      .then((r) => {
        if (cancelado) return;
        if (!r) {
          if (!cargadoRef.current) setEstado('no-encontrado');
          return;
        }
        cargadoRef.current = true;
        setReserva(r);
        setEstado('ok');
      })
      .catch(() => {
        if (cancelado) return;
        if (!cargadoRef.current) setEstado('error');
      });
    return () => {
      cancelado = true;
    };
  }, [id, intento]);

  if (estado === 'cargando') {
    return <CenteredSpinner className="py-24" />;
  }

  if (estado === 'no-encontrado') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
        <ErrorState
          title="Reserva no encontrada"
          description="Es posible que la reserva ya no exista o el enlace sea incorrecto."
          retryLabel="Volver a mis reservas"
          onRetry={() => {
            window.location.href = '/student/reservations';
          }}
        />
      </div>
    );
  }

  if (estado === 'error' || !reserva) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
        <ErrorState
          title="No pudimos cargar la reserva"
          description="Ocurrió un problema de conexión. Inténtalo de nuevo."
          retryLabel="Reintentar"
          onRetry={reintentar}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
      <PageBreadcrumb
        className="mb-4"
        items={[
          { label: 'Mi panel', href: '/student' },
          { label: 'Mis reservas', href: '/student/reservations' },
          { label: reserva.propiedadTitulo || `Reserva #${reserva.id}` },
        ]}
      />

      {/* Encabezado */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-h1 truncate">{reserva.propiedadTitulo || `Reserva #${reserva.id}`}</h1>
            <Link href={`/property/${reserva.propiedadId}`} className="text-sm font-semibold text-primary hover:underline">
              Ver propiedad
            </Link>
            {reserva.propiedadUbicacion && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" /> {reserva.propiedadUbicacion}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <ReservationStatusBadge estado={reserva.estado} />
            {reserva.estado === 'APROBADA' && reserva.fechaExpiracion && (
              <ReservationExpiryCountdown fechaExpiracion={reserva.fechaExpiracion} />
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Estadía</p>
            <p className="mt-0.5 flex items-center gap-1.5 font-semibold text-foreground">
              <CalendarDays className="size-3.5 text-muted-foreground" aria-hidden />
              {formatRango(reserva.fechaInicio, reserva.fechaFin)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="tnum mt-0.5 font-black text-primary">{formatPEN(reserva.montoTotal)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reservada el</p>
            <p className="mt-0.5 font-semibold text-foreground">{formatearFecha(reserva.fechaCreacion)}</p>
          </div>
        </div>

        {reserva.estado === 'RECHAZADA' && reserva.motivoRechazo && (
          <div className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            <strong className="font-bold">Motivo de rechazo:</strong> {reserva.motivoRechazo}
          </div>
        )}
        {reserva.estado === 'CANCELADA' && reserva.motivoCancelacion && (
          <div className="mt-4 rounded-xl border border-border bg-muted p-3 text-sm text-muted-foreground">
            <strong className="font-semibold">Motivo de cancelación:</strong> {reserva.motivoCancelacion}
          </div>
        )}
      </div>

      {/* Contrato: ver y firmar (ítems 236-237) */}
      <div className="mt-4">
        <ContractActions reserva={reserva} onFirmado={setReserva} />
      </div>

      {/* Depósito de garantía (ítem 243) */}
      <div className="mt-4">
        <DepositStatusCard reservaId={reserva.id} />
      </div>

      {/* Cronograma completo de cuotas (ítem 242) */}
      <div className="mt-4">
        <ReservationInstallmentsTable reservaId={reserva.id} />
      </div>
    </div>
  );
}
