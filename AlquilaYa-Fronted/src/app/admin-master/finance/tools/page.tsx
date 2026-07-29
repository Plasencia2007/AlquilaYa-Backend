'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, RefreshCcw, Search, Wrench } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { notify } from '@/lib/notify';
import { formatPEN } from '@/lib/money';
import { adminPagoService, type EstadoPagoResponse, type PagoFallido, type ReconciliacionResumen } from '@/services/pago-service';
import { reservationService, type CuotaRenta } from '@/services/reservation-service';

/**
 * Ítem 370 + 371: caja de herramientas admin de pagos/reservas.
 *
 * Dos secciones independientes que comparten página porque ninguna justifica su propia
 * pantalla de detalle de reserva todavía (fuera de alcance de este batch, ver MEJORAS.md):
 *  - Reconciliación (G5): buscar el estado real de un pago y re-conciliarlo contra Mercado Pago.
 *  - Cronograma de cuotas (G2): (re)generar el calendario de renta mensual de una reserva.
 */

function fmtFecha(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const ESTADO_PAGO_BADGE: Record<string, string> = {
  PAGADO: 'bg-success-light text-success border-transparent',
  PENDIENTE: 'bg-warning-light text-warning border-transparent',
  PENDIENTE_REVISION: 'bg-warning-light text-warning border-transparent',
  DISCREPANCIA: 'bg-destructive/10 text-destructive border-transparent',
  RECHAZADO: 'bg-destructive/10 text-destructive border-transparent',
  EXPIRADO: 'bg-muted text-muted-foreground border-transparent',
  SIN_PAGO: 'bg-muted text-muted-foreground border-transparent',
  REEMBOLSADO: 'bg-info-light text-info border-transparent',
  REEMBOLSO_FALLIDO: 'bg-destructive/10 text-destructive border-transparent',
};

function ReconciliacionSection() {
  const [reservaId, setReservaId] = useState('');
  const [estado, setEstado] = useState<EstadoPagoResponse | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [reconciliando, setReconciliando] = useState(false);
  const [resumen, setResumen] = useState<ReconciliacionResumen | null>(null);
  const [fallidos, setFallidos] = useState<PagoFallido[]>([]);
  const [cargandoFallidos, setCargandoFallidos] = useState(true);

  useEffect(() => {
    adminPagoService
      .listarPagosFallidos()
      .then(setFallidos)
      .catch((err) => notify.error(err, 'No se pudo cargar el listado de pagos con problemas'))
      .finally(() => setCargandoFallidos(false));
  }, []);

  const buscar = async (id: string, e?: FormEvent) => {
    e?.preventDefault();
    const idLimpio = id.trim();
    if (!idLimpio || Number.isNaN(Number(idLimpio))) {
      notify.warning('Ingresa un ID de reserva numérico válido');
      return;
    }
    setReservaId(idLimpio);
    setResumen(null);
    setBuscando(true);
    try {
      const data = await adminPagoService.getEstadoPagoAdmin(idLimpio);
      setEstado(data);
    } catch (err) {
      notify.error(err, 'No se pudo consultar el estado del pago');
      setEstado(null);
    } finally {
      setBuscando(false);
    }
  };

  const reconciliar = async () => {
    if (!reservaId) return;
    setReconciliando(true);
    try {
      const r = await adminPagoService.reconciliarReserva(reservaId);
      setResumen(r);
      notify.success(
        'Reconciliación ejecutada',
        `${r.conciliados} conciliado(s) · ${r.sinCambio} sin cambio · ${r.revisionManual} para revisión manual`,
      );
      // refresca el estado local del pago con el diff real post-reconciliación
      const actualizado = await adminPagoService.getEstadoPagoAdmin(reservaId);
      setEstado(actualizado);
    } catch (err) {
      notify.error(err, 'No se pudo reconciliar la reserva');
    } finally {
      setReconciliando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
          <RefreshCcw className="size-5 text-primary" aria-hidden />
          Reconciliación de pagos
        </CardTitle>
        <CardDescription>
          Vuelve a consultar Mercado Pago para los pagos de una reserva que quedaron en
          PENDIENTE_REVISION o DISCREPANCIA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={(e) => buscar(reservaId, e)} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label htmlFor="reservaIdReconciliar">ID de reserva</Label>
            <Input
              id="reservaIdReconciliar"
              inputMode="numeric"
              placeholder="Ej. 231"
              value={reservaId}
              onChange={(e) => setReservaId(e.target.value)}
            />
          </div>
          <Button type="submit" className="gap-1.5" loading={buscando} disabled={buscando}>
            <Search className="size-4" aria-hidden />
            Ver estado
          </Button>
        </form>

        {estado && (
          <div className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={ESTADO_PAGO_BADGE[estado.estado] ?? ''}>
                  {estado.estado}
                </Badge>
                <div className="text-sm">
                  <p className="font-bold text-foreground">
                    {estado.monto != null ? formatPEN(estado.monto, { decimales: true }) : 'Sin monto'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    paymentId: {estado.paymentId ?? '—'} · pagado: {fmtFecha(estado.fechaPago)}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={reconciliar}
                loading={reconciliando}
                disabled={reconciliando}
              >
                <RefreshCcw className="size-3.5" aria-hidden />
                Reconciliar con MP
              </Button>
            </div>

            {resumen && (
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4 sm:grid-cols-5">
                {[
                  { label: 'Escaneados', valor: resumen.escaneados },
                  { label: 'Conciliados', valor: resumen.conciliados },
                  { label: 'Sin cambio', valor: resumen.sinCambio },
                  { label: 'Revisión manual', valor: resumen.revisionManual },
                  { label: 'Fallidos', valor: resumen.fallidos },
                ].map((c) => (
                  <div key={c.label} className="rounded-lg bg-muted px-3 py-2 text-center">
                    <p className="text-lg font-black text-foreground">{c.valor}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      {c.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            <AlertTriangle className="size-3.5" aria-hidden />
            Pagos con problemas ({cargandoFallidos ? '…' : fallidos.length})
          </h3>
          {cargandoFallidos ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : fallidos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ningún pago requiere atención manual ahora mismo.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground text-[10px] uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-2 text-left font-black">Reserva</th>
                    <th className="px-4 py-2 text-right font-black">Monto</th>
                    <th className="px-4 py-2 text-left font-black">Estado</th>
                    <th className="px-4 py-2 text-left font-black">Creado</th>
                    <th className="px-4 py-2 text-right font-black">·</th>
                  </tr>
                </thead>
                <tbody>
                  {fallidos.map((f) => (
                    <tr key={f.id} className="border-t border-border">
                      <td className="px-4 py-2 font-semibold text-foreground">#{f.reservaId}</td>
                      <td className="px-4 py-2 text-right">{formatPEN(f.monto, { decimales: true })}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className={ESTADO_PAGO_BADGE[f.estado] ?? ''}>
                          {f.estado}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{fmtFecha(f.fechaCreacion)}</td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => buscar(String(f.reservaId))}
                        >
                          Usar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CuotasSection() {
  const [reservaId, setReservaId] = useState('');
  const [cuotas, setCuotas] = useState<CuotaRenta[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState<{ cuotasCreadas: number } | null>(null);

  const buscar = async (e?: FormEvent) => {
    e?.preventDefault();
    const id = reservaId.trim();
    if (!id || Number.isNaN(Number(id))) {
      notify.warning('Ingresa un ID de reserva numérico válido');
      return;
    }
    setUltimoResultado(null);
    setCargando(true);
    try {
      const data = await reservationService.obtenerCuotas(id);
      setCuotas(data);
    } catch (err) {
      notify.error(err, 'No se pudo cargar el cronograma de la reserva');
      setCuotas(null);
    } finally {
      setCargando(false);
    }
  };

  const generar = async () => {
    if (!reservaId.trim()) return;
    setGenerando(true);
    try {
      const r = await reservationService.generarCuotas(reservaId.trim());
      setUltimoResultado({ cuotasCreadas: r.cuotasCreadas });
      notify.success(
        r.cuotasCreadas > 0 ? 'Cronograma generado' : 'Sin cambios',
        r.cuotasCreadas > 0
          ? `${r.cuotasCreadas} cuota(s) nueva(s) creada(s).`
          : 'El cronograma ya existía (operación idempotente).',
      );
      const data = await reservationService.obtenerCuotas(reservaId.trim());
      setCuotas(data);
    } catch (err) {
      notify.error(err, 'No se pudo generar el cronograma');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
          <CalendarClock className="size-5 text-primary" aria-hidden />
          Cronograma de cuotas
        </CardTitle>
        <CardDescription>
          (Re)genera el calendario de renta mensual de una reserva ya PAGADA. Idempotente: no
          duplica cuotas ya creadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={buscar} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label htmlFor="reservaIdCuotas">ID de reserva</Label>
            <Input
              id="reservaIdCuotas"
              inputMode="numeric"
              placeholder="Ej. 231"
              value={reservaId}
              onChange={(e) => setReservaId(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" className="gap-1.5" loading={cargando} disabled={cargando}>
            <Search className="size-4" aria-hidden />
            Ver cronograma
          </Button>
          <Button
            type="button"
            className="gap-1.5"
            onClick={generar}
            loading={generando}
            disabled={generando || !reservaId.trim()}
          >
            Generar cronograma
          </Button>
        </form>

        {ultimoResultado && (
          <p className="text-sm text-muted-foreground">
            Última corrida: <span className="font-bold text-foreground">{ultimoResultado.cuotasCreadas}</span>{' '}
            cuota(s) creada(s).
          </p>
        )}

        {cuotas && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-2 text-left font-black">#</th>
                  <th className="px-4 py-2 text-left font-black">Periodo</th>
                  <th className="px-4 py-2 text-right font-black">Monto</th>
                  <th className="px-4 py-2 text-left font-black">Vence</th>
                  <th className="px-4 py-2 text-left font-black">Estado</th>
                </tr>
              </thead>
              <tbody>
                {cuotas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      Sin cuotas todavía. Usa &quot;Generar cronograma&quot;.
                    </td>
                  </tr>
                ) : (
                  cuotas.map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-4 py-2 font-semibold text-foreground">{c.numeroCuota}</td>
                      <td className="px-4 py-2 text-muted-foreground">{c.periodo}</td>
                      <td className="px-4 py-2 text-right">{formatPEN(c.monto, { decimales: true })}</td>
                      <td className="px-4 py-2 text-muted-foreground">{c.fechaVencimiento}</td>
                      <td className="px-4 py-2">
                        <Badge
                          variant="outline"
                          className={
                            c.estado === 'PAGADA'
                              ? 'bg-success-light text-success border-transparent'
                              : c.estado === 'VENCIDA'
                                ? 'bg-destructive/10 text-destructive border-transparent'
                                : 'bg-warning-light text-warning border-transparent'
                          }
                        >
                          {c.estado}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminFinanceToolsPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="mb-8">
        <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-primary">
          Finanzas · G5 / G2
        </span>
        <h1 className="flex items-center gap-2 text-3xl font-bold leading-none tracking-tight text-foreground">
          <Wrench className="size-7 text-primary" aria-hidden />
          Herramientas
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Utilidades puntuales sobre una reserva: reconciliar su pago contra Mercado Pago o
          (re)generar su cronograma de cuotas mensuales.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReconciliacionSection />
        <CuotasSection />
      </div>
    </div>
  );
}
