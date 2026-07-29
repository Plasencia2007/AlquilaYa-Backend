'use client';

import { useEffect, useMemo, useState } from 'react';
import { Info } from 'lucide-react';

import { Card } from '@/components/ui/legacy-card';
import { Money } from '@/components/ui/money';
import { cn } from '@/lib/cn';
import { notify } from '@/lib/notify';
import { formatearFecha } from '@/lib/relative-time';
import { desembolsoService, type Desembolso, type EstadoDesembolso } from '@/services/desembolso-service';

const ESTADO_META: Record<EstadoDesembolso, { label: string; className: string }> = {
  PENDIENTE: { label: 'Pendiente', className: 'bg-warning-light text-warning' },
  PROCESADO: { label: 'Procesado', className: 'bg-success-light text-success' },
  FALLIDO: { label: 'Fallido', className: 'bg-destructive/10 text-destructive' },
};

export default function LandlordFinancesPayoutsPage() {
  const [desembolsos, setDesembolsos] = useState<Desembolso[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    // `cargando` ya inicializa en `true` y este efecto corre una sola vez (deps `[]`) — evita
    // el setState síncrono al inicio del efecto (regla `react-hooks/set-state-in-effect`).
    desembolsoService
      .misDesembolsos()
      .then((data) => {
        if (!cancelado) setDesembolsos(data);
      })
      .catch((err) => notify.error(err, 'No se pudieron cargar tus desembolsos'))
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const totalPendiente = useMemo(
    () =>
      desembolsos
        .filter((d) => d.estado === 'PENDIENTE')
        .reduce((acc, d) => acc + d.montoTotal, 0),
    [desembolsos],
  );
  const totalProcesado = useMemo(
    () =>
      desembolsos
        .filter((d) => d.estado === 'PROCESADO')
        .reduce((acc, d) => acc + d.montoTotal, 0),
    [desembolsos],
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter opacity-90">
            Mis desembolsos
          </h1>
          <p className="text-muted-foreground text-[12px] font-medium mt-0.5 tracking-tight">
            Historial de los pagos que la plataforma te ha transferido (o tiene pendiente transferirte).
          </p>
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Pendiente
            </p>
            <Money value={totalPendiente} size="lg" className="text-warning" />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Ya procesado
            </p>
            <Money value={totalProcesado} size="lg" className="text-primary" />
          </div>
        </div>
      </header>

      <Card className="bg-info-light/40 border border-info/30 p-4">
        <div className="flex gap-3">
          <Info className="size-5 shrink-0 text-info" aria-hidden />
          <div className="text-[13px] leading-relaxed text-foreground/80">
            <p className="font-bold text-foreground">Cómo funciona el desembolso hoy (v1)</p>
            <p className="mt-1">
              Cuando un estudiante paga una reserva tuya, ese ingreso queda registrado como{' '}
              <span className="font-semibold">saldo pendiente</span>. El proceso de pago{' '}
              <span className="font-semibold">no es automático ni instantáneo</span>: un
              administrador de AlquilaYa agrupa periódicamente tu saldo pendiente en un
              desembolso y te transfiere el dinero por fuera de la plataforma (banco/Yape/etc.),
              marcándolo luego como <span className="font-semibold">Procesado</span> con el
              método y la referencia usados. Si algo falla en la transferencia, el desembolso
              queda como <span className="font-semibold">Fallido</span> con el motivo. No esperes
              el pago inmediatamente después de una reserva pagada.
            </p>
          </div>
        </div>
      </Card>

      <Card padding="none" className="bg-white/40 border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground text-[10px] uppercase tracking-widest">
            <tr>
              <th className="text-left px-6 py-3 font-black">Creado</th>
              <th className="text-right px-6 py-3 font-black">Monto</th>
              <th className="text-left px-6 py-3 font-black">Estado</th>
              <th className="text-left px-6 py-3 font-black">Método</th>
              <th className="text-left px-6 py-3 font-black">Referencia / motivo</th>
              <th className="text-left px-6 py-3 font-black">Procesado</th>
            </tr>
          </thead>
          <tbody>
            {desembolsos.map((d) => {
              const meta = ESTADO_META[d.estado];
              return (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-6 py-3 text-muted-foreground">{formatearFecha(d.fechaCreacion, true)}</td>
                  <td className="px-6 py-3 text-right">
                    <Money value={d.montoTotal} size="sm" className="text-primary" />
                  </td>
                  <td className="px-6 py-3">
                    <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold', meta.className)}>
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-medium text-foreground/80">{d.metodoPago ?? '—'}</td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {d.estado === 'FALLIDO' ? (d.motivoFallo ?? '—') : (d.referencia ?? '—')}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {d.fechaProcesado ? formatearFecha(d.fechaProcesado, true) : '—'}
                  </td>
                </tr>
              );
            })}
            {desembolsos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-center text-muted-foreground">
                  {cargando ? 'Cargando…' : 'Aún no tienes desembolsos registrados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
