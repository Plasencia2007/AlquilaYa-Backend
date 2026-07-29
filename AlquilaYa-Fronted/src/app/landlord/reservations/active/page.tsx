'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import Link from 'next/link';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { DayButton } from 'react-day-picker';
import { Badge } from '@/components/ui/legacy-badge';
import { Button } from '@/components/ui/legacy-button';
import { Button as CalendarButton } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ReservationCard } from '@/components/landlord/ReservationCard';
import { StudentProfileModal } from '@/components/landlord/StudentProfileModal';
import { useReservationsStore } from '@/stores/reservations-store';
import { useConfirm } from '@/hooks/use-confirm';
import { useTabParam } from '@/hooks/use-tab-param';
import type { Reserva, EstadoReserva } from '@/types/reserva';
import { catalogosService, type ItemCatalogo } from '@/services/catalogos-service';
import { cn } from '@/lib/cn';

type Tab = 'pendientes' | 'confirmadas' | 'calendario';

const TAB_VALUES: readonly Tab[] = ['pendientes', 'confirmadas', 'calendario'];

const FILTROS_CONFIRMADAS: { id: 'TODOS' | 'APROBADA' | 'PAGADA'; label: string }[] = [
  { id: 'TODOS',    label: 'Todas' },
  { id: 'APROBADA', label: 'Aprobadas' },
  { id: 'PAGADA',   label: 'Pagadas' },
];

const ESTADOS_CONFIRMADAS: EstadoReserva[] = ['APROBADA', 'PAGADA'];

/** Estados de reserva que ocupan de verdad el calendario (#325). Rechazadas/canceladas/
 * expiradas no bloquean fechas, así que se excluyen. */
const ESTADOS_CALENDARIO: { estado: EstadoReserva; label: string; badgeClass: string; dotClass: string }[] = [
  { estado: 'SOLICITADA', label: 'Solicitada', badgeClass: 'bg-warning/15 text-warning font-bold', dotClass: 'bg-warning' },
  { estado: 'APROBADA',   label: 'Aprobada',   badgeClass: 'bg-info/15 text-info font-bold',       dotClass: 'bg-info' },
  { estado: 'PAGADA',     label: 'Pagada',     badgeClass: 'bg-success/15 text-success font-bold', dotClass: 'bg-success' },
  { estado: 'FINALIZADA', label: 'Finalizada', badgeClass: 'bg-muted text-muted-foreground font-bold', dotClass: 'bg-muted-foreground' },
];
const ESTADOS_CALENDARIO_SET = new Set(ESTADOS_CALENDARIO.map((e) => e.estado));

/** `fechaInicio`/`fechaFin` llegan como "YYYY-MM-DD" (ver `reservation-service.ts`); sin
 * hora explícita, `new Date(...)` las interpreta en UTC y en Perú (UTC-5) corren un día. */
function parseFechaLocal(fecha: string): Date {
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(fecha);
  return soloFecha ? new Date(`${fecha}T00:00:00`) : new Date(fecha);
}

function claveDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Día custom con tooltip: reutiliza el patrón de `CalendarDayButton` (`ui/calendar.tsx`
 * líneas ~175-211) pero envuelto en un `Tooltip` que lista quién ocupa ese día (ítem 325,
 * bonus opcional). Se crea vía factory memoizada porque `DayPicker` no deja pasarle props
 * extra a `components.DayButton` — el mapa de ocupación viaja por clausura. */
function crearDayButtonConTooltip(reservasPorDia: Map<string, Reserva[]>) {
  function DayButtonConTooltip({ className, day, modifiers, ...props }: ComponentProps<typeof DayButton>) {
    const ref = useRef<HTMLButtonElement>(null);
    useEffect(() => {
      if (modifiers.focused) ref.current?.focus();
    }, [modifiers.focused]);

    const ocupantes = reservasPorDia.get(claveDia(day.date)) ?? [];

    const boton = (
      <CalendarButton
        ref={ref}
        variant="ghost"
        size="icon"
        data-day={day.date.toLocaleDateString()}
        className={cn(
          'flex aspect-square h-auto w-full min-w-[--cell-size] flex-col gap-1 font-normal leading-none',
          className,
        )}
        {...props}
      />
    );

    if (ocupantes.length === 0) return boton;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{boton}</TooltipTrigger>
        <TooltipContent className="max-w-56 space-y-1 text-xs">
          {ocupantes.map((r) => {
            const meta = ESTADOS_CALENDARIO.find((e) => e.estado === r.estado);
            return (
              <p key={r.id} className="font-medium">
                {meta?.label ?? r.estado} · {r.estudianteNombre ?? `Estudiante ${r.estudianteId}`}
              </p>
            );
          })}
        </TooltipContent>
      </Tooltip>
    );
  }
  return DayButtonConTooltip;
}

function CardSkeleton() {
  return (
    <div className="rounded-[2.5rem] border border-border bg-card p-0 overflow-hidden animate-pulse">
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-44 h-32 md:h-40 bg-muted" />
        <div className="flex-1 p-5 space-y-3">
          <div className="h-4 w-1/2 bg-muted rounded-full" />
          <div className="h-3 w-1/3 bg-muted rounded-full" />
          <div className="grid grid-cols-4 gap-3 pt-2">
            {[1,2,3,4].map((i) => <div key={i} className="h-8 bg-muted rounded-xl" />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReservationsActiveContent() {
  const { reservas, loading, error, cargar, aprobar, rechazar, finalizar } = useReservationsStore();
  const { confirm, ConfirmDialog } = useConfirm();
  const [tab, setTab] = useTabParam({ values: TAB_VALUES, defaultValue: 'pendientes' });
  const [filtroConf, setFiltroConf] = useState<'TODOS' | 'APROBADA' | 'PAGADA'>('TODOS');
  const [perfilEstudiante, setPerfilEstudiante] = useState<Reserva | null>(null);
  const [motivosRechazo, setMotivosRechazo] = useState<ItemCatalogo[]>([]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    catalogosService.obtenerPorTipo('MOTIVO_RECHAZO')
      .then(setMotivosRechazo)
      .catch((err) => console.error('Error cargando motivos de rechazo:', err));
  }, []);

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

  // ── Calendario de ocupación (#325) ─────────────────────────────────────
  // Un `DateRange` por reserva y por estado — mismo patrón que
  // `components/student/availability-panel.tsx` (modifiers + modifiersClassNames).
  const rangosPorEstado = useMemo(() => {
    const mapa = new Map<EstadoReserva, DateRange[]>();
    for (const r of reservas) {
      if (!ESTADOS_CALENDARIO_SET.has(r.estado)) continue;
      const from = parseFechaLocal(r.fechaInicio);
      const to = parseFechaLocal(r.fechaFin);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) continue;
      const lista = mapa.get(r.estado) ?? [];
      lista.push({ from, to });
      mapa.set(r.estado, lista);
    }
    return mapa;
  }, [reservas]);

  const modifiers = useMemo(() => {
    const obj: Record<string, DateRange[]> = {};
    for (const { estado } of ESTADOS_CALENDARIO) obj[estado] = rangosPorEstado.get(estado) ?? [];
    return obj;
  }, [rangosPorEstado]);

  const modifiersClassNames = useMemo(() => {
    const obj: Record<string, string> = {};
    for (const { estado, badgeClass } of ESTADOS_CALENDARIO) obj[estado] = badgeClass;
    return obj;
  }, []);

  // Mapa día → reservas que lo ocupan, solo para el tooltip (bonus opcional). Expande
  // cada rango día a día con un tope defensivo ante datos corruptos (rango absurdamente largo).
  const reservasPorDia = useMemo(() => {
    const mapa = new Map<string, Reserva[]>();
    for (const r of reservas) {
      if (!ESTADOS_CALENDARIO_SET.has(r.estado)) continue;
      const desde = parseFechaLocal(r.fechaInicio);
      const hasta = parseFechaLocal(r.fechaFin);
      if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) continue;
      const cursor = new Date(desde);
      let guard = 0;
      while (cursor <= hasta && guard < 400) {
        const clave = claveDia(cursor);
        const lista = mapa.get(clave) ?? [];
        lista.push(r);
        mapa.set(clave, lista);
        cursor.setDate(cursor.getDate() + 1);
        guard++;
      }
    }
    return mapa;
  }, [reservas]);

  const dayButtonConTooltip = useMemo(
    () => crearDayButtonConTooltip(reservasPorDia),
    [reservasPorDia],
  );

  const handleAprobar = (reserva: Reserva) => {
    confirm({
      title: '¿Aprobar esta reserva?',
      description: `Confirmarás la solicitud de ${reserva.estudianteNombre ?? 'el estudiante'} para ${reserva.propiedadTitulo ?? 'tu propiedad'}.`,
      confirmLabel: 'Sí, aprobar',
      tone: 'success',
      onConfirm: () => aprobar(reserva.id),
    });
  };

  const handleRechazar = (reserva: Reserva) => {
    confirm({
      title: 'Rechazar reserva',
      description: 'Comparte un motivo claro. El estudiante recibirá esta respuesta.',
      confirmLabel: 'Rechazar reserva',
      tone: 'danger',
      requireReason: true,
      predefinedReasons: motivosRechazo,
      reasonPlaceholder: 'Ej. Las fechas ya no están disponibles…',
      onConfirm: (motivo) => rechazar(reserva.id, motivo),
    });
  };

  const handleFinalizar = (reserva: Reserva) => {
    confirm({
      title: '¿Finalizar reserva?',
      description: `Marcarás como cerrada la estancia de ${reserva.estudianteNombre ?? 'el estudiante'} en ${reserva.propiedadTitulo ?? 'tu propiedad'}. Esta acción no se puede deshacer.`,
      confirmLabel: 'Sí, finalizar',
      tone: 'neutral',
      onConfirm: () => finalizar(reserva.id),
    });
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
    {
      id: 'calendario',
      label: 'Calendario',
      count: 0,
      badge: <Badge variant="surface">Calendario</Badge>,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          {TABS.find((t) => t.id === tab)?.badge}
          <h1 className="text-3xl font-black text-foreground tracking-tighter opacity-90 mt-3">
            Reservas activas
          </h1>
          <p className="text-muted-foreground text-[12px] font-medium mt-0.5 tracking-tight">
            {tab === 'pendientes'
              ? 'Revisa y responde las solicitudes de tus estudiantes a tiempo.'
              : tab === 'confirmadas'
                ? 'Estudiantes con tu aprobación o que ya completaron el pago.'
                : 'Vista mensual de ocupación de tus propiedades por estado de reserva.'}
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
      <div className="flex gap-2 border-b border-border pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              'relative px-5 py-2.5 text-[12px] font-black uppercase tracking-wider transition-all rounded-t-xl ' +
              (tab === t.id
                ? 'bg-background text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted')
            }
          >
            {t.label}
            {t.count > 0 && (
              <span className={
                'ml-2 rounded-full px-2 py-0.5 text-[9px] font-black ' +
                (tab === t.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')
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
            <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-[2.5rem] border border-dashed border-border bg-card">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-3xl">inbox</span>
              </div>
              <h2 className="text-xl font-black text-foreground tracking-tight">Sin solicitudes nuevas</h2>
              <p className="text-muted-foreground text-sm font-medium mt-1 max-w-sm">
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
                  onAprobar={handleAprobar}
                  onRechazar={handleRechazar}
                  onVerPerfil={(r) => setPerfilEstudiante(r)}
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
                      : 'bg-muted text-muted-foreground hover:bg-muted')
                  }
                >
                  {f.label}
                  <span className={'rounded-full px-2 py-0.5 text-[9px] font-black ' + (activo ? 'bg-white/25' : 'bg-muted')}>
                    {total}
                  </span>
                </button>
              );
            })}
          </div>

          {confirmadasFiltradas.length === 0 && !error ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-[2.5rem] border border-dashed border-border bg-card">
              <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-3xl">verified</span>
              </div>
              <h2 className="text-xl font-black text-foreground tracking-tight">Sin reservas confirmadas</h2>
              <p className="text-muted-foreground text-sm font-medium mt-1 max-w-sm">
                Aprueba las solicitudes pendientes para verlas aquí.
              </p>
              <Button type="button" variant="dark" size="sm" className="mt-6" onClick={() => setTab('pendientes')}>
                Ver pendientes
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {confirmadasFiltradas.map((reserva) => (
                <ReservationCard
                  key={reserva.id}
                  reserva={reserva}
                  onFinalizar={handleFinalizar}
                  onVerPerfil={(r) => setPerfilEstudiante(r)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Tab Calendario ─────────────────────────────────── */}
      {!loading && tab === 'calendario' && (
        <div className="space-y-4 rounded-[2.5rem] border border-border bg-card p-6">
          <TooltipProvider delayDuration={150}>
            <Calendar
              locale={es}
              showOutsideDays={false}
              defaultMonth={new Date()}
              modifiers={modifiers}
              modifiersClassNames={modifiersClassNames}
              components={{ DayButton: dayButtonConTooltip }}
              className="mx-auto"
            />
          </TooltipProvider>

          <div className="flex flex-wrap items-center justify-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
            {ESTADOS_CALENDARIO.map(({ estado, label, dotClass }) => (
              <span key={estado} className="inline-flex items-center gap-1.5">
                <span className={cn('size-2 rounded-full', dotClass)} aria-hidden />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {ConfirmDialog}

      {/* Modal ver perfil estudiante */}
      <StudentProfileModal
        open={!!perfilEstudiante}
        reserva={perfilEstudiante}
        onClose={() => setPerfilEstudiante(null)}
      />
    </div>
  );
}

export default function ReservationsActivePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      }
    >
      <ReservationsActiveContent />
    </Suspense>
  );
}
