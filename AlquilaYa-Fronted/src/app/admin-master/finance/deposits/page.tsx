'use client';

import { type FormEvent, useState } from 'react';
import { PiggyBank, Search, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/shared/empty-state';
import { useConfirm } from '@/hooks/use-confirm';
import { notify } from '@/lib/notify';
import { formatPEN } from '@/lib/money';
import { adminDepositoService } from '@/services/admin-deposito-service';
import type { Deposito, EstadoDeposito } from '@/services/deposito-service';

/**
 * Ítem 369: panel admin del depósito de garantía (G3, `DepositoController`). Sin listado
 * global — se busca por `reservaId` (0 o 1 depósito) o por `arrendadorId` (historial completo),
 * igual que exponen los dos únicos GET admin del backend.
 */

const ESTADO_BADGE: Record<EstadoDeposito, string> = {
  PENDIENTE: 'bg-warning-light text-warning border-transparent',
  RETENIDO: 'bg-info-light text-info border-transparent',
  DEVUELTO: 'bg-success-light text-success border-transparent',
  RETENIDO_PARCIAL: 'bg-warning-light text-warning border-transparent',
  PERDIDO: 'bg-destructive/10 text-destructive border-transparent',
};

const ESTADO_LABEL: Record<EstadoDeposito, string> = {
  PENDIENTE: 'Pendiente de captura',
  RETENIDO: 'Retenido',
  DEVUELTO: 'Devuelto',
  RETENIDO_PARCIAL: 'Retención parcial',
  PERDIDO: 'Perdido',
};

function fmtFecha(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminDepositsPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [modo, setModo] = useState<'reserva' | 'arrendador'>('reserva');
  const [query, setQuery] = useState('');
  const [depositos, setDepositos] = useState<Deposito[] | null>(null);
  const [reservaBuscada, setReservaBuscada] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [buscoAlgunaVez, setBuscoAlgunaVez] = useState(false);

  const [crearOpen, setCrearOpen] = useState(false);
  const [montoCrear, setMontoCrear] = useState('');
  const [creando, setCreando] = useState(false);

  const [capturarFor, setCapturarFor] = useState<Deposito | null>(null);
  const [paymentIdCapturar, setPaymentIdCapturar] = useState('');
  const [capturando, setCapturando] = useState(false);

  const [retenerFor, setRetenerFor] = useState<Deposito | null>(null);
  const [montoRetenido, setMontoRetenido] = useState('');
  const [motivoRetener, setMotivoRetener] = useState('');
  const [reteniendo, setReteniendo] = useState(false);

  const actualizarEnLista = (actualizado: Deposito) => {
    setDepositos((prev) => (prev ? prev.map((d) => (d.id === actualizado.id ? actualizado : d)) : prev));
  };

  const handleBuscar = async (e?: FormEvent) => {
    e?.preventDefault();
    const id = query.trim();
    if (!id || Number.isNaN(Number(id))) {
      notify.warning('Ingresa un ID numérico válido');
      return;
    }
    setBuscando(true);
    setBuscoAlgunaVez(true);
    try {
      const data =
        modo === 'reserva' ? await adminDepositoService.porReserva(id) : await adminDepositoService.porArrendador(id);
      setDepositos(data);
      setReservaBuscada(modo === 'reserva' ? id : null);
    } catch (err) {
      notify.error(err, 'No se pudo buscar depósitos');
      setDepositos(null);
    } finally {
      setBuscando(false);
    }
  };

  const confirmarCrear = async () => {
    const monto = Number(montoCrear);
    if (!reservaBuscada || !monto || monto <= 0) return;
    setCreando(true);
    try {
      const nuevo = await adminDepositoService.crear({ reservaId: reservaBuscada, monto });
      setDepositos((prev) => [nuevo, ...(prev ?? [])]);
      notify.success('Depósito registrado', `#${nuevo.id} · ${formatPEN(nuevo.monto, { decimales: true })}`);
      setCrearOpen(false);
      setMontoCrear('');
    } catch (err) {
      notify.error(err, 'No se pudo registrar el depósito');
    } finally {
      setCreando(false);
    }
  };

  const confirmarCapturar = async () => {
    if (!capturarFor) return;
    setCapturando(true);
    try {
      const actualizado = await adminDepositoService.capturar(
        capturarFor.id,
        paymentIdCapturar.trim() ? { paymentId: paymentIdCapturar.trim() } : undefined,
      );
      actualizarEnLista(actualizado);
      notify.success('Depósito capturado');
      setCapturarFor(null);
    } catch (err) {
      notify.error(err, 'No se pudo capturar el depósito');
    } finally {
      setCapturando(false);
    }
  };

  const handleDevolver = (d: Deposito) => {
    confirm({
      title: `¿Devolver el depósito #${d.id} completo?`,
      description: `Se devuelven ${formatPEN(d.monto, { decimales: true })} al estudiante${
        d.paymentId ? ' (reembolso real vía Mercado Pago).' : '.'
      }`,
      confirmLabel: 'Devolver',
      tone: 'success',
      onConfirm: async () => {
        try {
          const actualizado = await adminDepositoService.devolver(d.id);
          actualizarEnLista(actualizado);
          notify.success('Depósito devuelto');
        } catch (err) {
          notify.error(err, 'No se pudo devolver el depósito');
          return false;
        }
      },
    });
  };

  const handlePerder = (d: Deposito) => {
    confirm({
      title: `¿Marcar el depósito #${d.id} como perdido?`,
      description: 'El arrendador se queda con el depósito íntegro. Esta acción es irreversible.',
      confirmLabel: 'Marcar perdido',
      tone: 'danger',
      requireReason: true,
      reasonPlaceholder: 'Ej. Daños graves en la habitación…',
      onConfirm: async (motivo) => {
        try {
          const actualizado = await adminDepositoService.perder(d.id, { motivo: motivo! });
          actualizarEnLista(actualizado);
          notify.success('Depósito marcado como perdido');
        } catch (err) {
          notify.error(err, 'No se pudo marcar como perdido');
          return false;
        }
      },
    });
  };

  const confirmarRetener = async () => {
    if (!retenerFor) return;
    const monto = Number(montoRetenido);
    if (!monto || monto <= 0 || monto >= retenerFor.monto || !motivoRetener.trim()) {
      notify.warning('Revisa el monto (debe ser mayor a 0 y menor al depósito total) y el motivo');
      return;
    }
    setReteniendo(true);
    try {
      const actualizado = await adminDepositoService.retenerParcial(retenerFor.id, {
        montoRetenido: monto,
        motivo: motivoRetener.trim(),
      });
      actualizarEnLista(actualizado);
      notify.success('Retención parcial registrada');
      setRetenerFor(null);
    } catch (err) {
      notify.error(err, 'No se pudo registrar la retención');
    } finally {
      setReteniendo(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="mb-8">
        <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-primary">
          Finanzas · G3
        </span>
        <h1 className="text-3xl font-bold leading-none tracking-tight text-foreground">Depósitos de garantía</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Busca por reserva o por arrendador para capturar, devolver, retener parcialmente o dar por
          perdido un depósito.
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleBuscar} className="flex flex-wrap items-end gap-3">
            <div className="flex rounded-lg border border-border p-1">
              <button
                type="button"
                onClick={() => setModo('reserva')}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  modo === 'reserva' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                Por reserva
              </button>
              <button
                type="button"
                onClick={() => setModo('arrendador')}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  modo === 'arrendador' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                Por arrendador
              </button>
            </div>
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <Label htmlFor="query">{modo === 'reserva' ? 'ID de reserva' : 'ID de arrendador'}</Label>
              <Input
                id="query"
                inputMode="numeric"
                placeholder="Ej. 128"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button type="submit" className="gap-1.5" loading={buscando} disabled={buscando}>
              <Search className="size-4" aria-hidden />
              Buscar
            </Button>
          </form>
        </CardContent>
      </Card>

      {!buscoAlgunaVez ? (
        <EmptyState
          icon={PiggyBank}
          title="Busca una reserva o un arrendador"
          description="Los resultados de depósitos aparecerán acá."
        />
      ) : depositos && depositos.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Sin depósitos"
          description={
            modo === 'reserva'
              ? 'Esta reserva no tiene depósito de garantía registrado todavía.'
              : 'Este arrendador no tiene depósitos registrados.'
          }
          action={
            modo === 'reserva'
              ? { type: 'button', label: 'Registrar depósito', onClick: () => setCrearOpen(true) }
              : undefined
          }
        />
      ) : depositos ? (
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl font-black tracking-tight">
              {depositos.length} depósito(s) encontrado(s)
            </CardTitle>
            {modo === 'reserva' && (
              <CardDescription>
                <Button variant="link" className="h-auto p-0 text-xs" onClick={() => setCrearOpen(true)}>
                  + Registrar otro depósito para esta reserva
                </Button>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground text-[10px] uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-3 text-left font-black">Depósito</th>
                    <th className="px-6 py-3 text-left font-black">Reserva</th>
                    <th className="px-6 py-3 text-right font-black">Monto</th>
                    <th className="px-6 py-3 text-left font-black">Estado</th>
                    <th className="px-6 py-3 text-left font-black">Registrado</th>
                    <th className="px-6 py-3 text-right font-black">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {depositos.map((d) => (
                    <tr key={d.id} className="border-t border-border align-top">
                      <td className="px-6 py-3 font-bold text-foreground">#{d.id}</td>
                      <td className="px-6 py-3 text-muted-foreground">#{d.reservaId}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="font-bold text-foreground">{formatPEN(d.monto, { decimales: true })}</div>
                        {d.montoDevuelto != null && (
                          <div className="text-[11px] text-muted-foreground">
                            devuelto: {formatPEN(d.montoDevuelto, { decimales: true })}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant="outline" className={ESTADO_BADGE[d.estado]}>
                          {ESTADO_LABEL[d.estado]}
                        </Badge>
                        {d.motivoRetencion && (
                          <p className="mt-1 max-w-[220px] text-[11px] text-muted-foreground">
                            {d.motivoRetencion}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{fmtFecha(d.fechaCreacion)}</td>
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {d.estado === 'PENDIENTE' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCapturarFor(d);
                                setPaymentIdCapturar('');
                              }}
                            >
                              Capturar
                            </Button>
                          )}
                          {d.estado === 'RETENIDO' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleDevolver(d)}>
                                Devolver
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRetenerFor(d);
                                  setMontoRetenido('');
                                  setMotivoRetener('');
                                }}
                              >
                                Retener parcial
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-destructive/30 text-destructive hover:bg-destructive/10"
                                onClick={() => handlePerder(d)}
                              >
                                Perder
                              </Button>
                            </>
                          )}
                          {(d.estado === 'DEVUELTO' || d.estado === 'RETENIDO_PARCIAL' || d.estado === 'PERDIDO') && (
                            <span className="text-[11px] text-muted-foreground">Sin más acciones</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Crear depósito */}
      <Dialog open={crearOpen} onOpenChange={setCrearOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Registrar depósito de garantía</DialogTitle>
            <DialogDescription>Reserva #{reservaBuscada}. Queda en estado PENDIENTE hasta capturarlo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="montoCrear">Monto (S/)</Label>
            <Input
              id="montoCrear"
              type="number"
              min="0.01"
              step="0.01"
              value={montoCrear}
              onChange={(e) => setMontoCrear(e.target.value)}
              disabled={creando}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCrearOpen(false)} disabled={creando}>
              Cancelar
            </Button>
            <Button onClick={confirmarCrear} loading={creando} disabled={!montoCrear || creando}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Capturar */}
      <Dialog open={!!capturarFor} onOpenChange={(next) => !next && setCapturarFor(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Capturar depósito #{capturarFor?.id}</DialogTitle>
            <DialogDescription>
              Confirma que el depósito ya se cobró (junto con la renta o por un canal externo).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="paymentIdCapturar">Payment ID de Mercado Pago (opcional)</Label>
            <Input
              id="paymentIdCapturar"
              placeholder="Déjalo vacío si se cobró fuera de MP"
              value={paymentIdCapturar}
              onChange={(e) => setPaymentIdCapturar(e.target.value)}
              disabled={capturando}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCapturarFor(null)} disabled={capturando}>
              Cancelar
            </Button>
            <Button onClick={confirmarCapturar} loading={capturando} disabled={capturando}>
              Capturar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retener parcial */}
      <Dialog open={!!retenerFor} onOpenChange={(next) => !next && setRetenerFor(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Retención parcial · depósito #{retenerFor?.id}</DialogTitle>
            <DialogDescription>
              Depósito total: {retenerFor ? formatPEN(retenerFor.monto, { decimales: true }) : ''}. Indica
              cuánto se retiene por daños; el resto se devuelve al estudiante. Irreversible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="montoRetenido">Monto a retener (S/)</Label>
              <Input
                id="montoRetenido"
                type="number"
                min="0.01"
                step="0.01"
                max={retenerFor ? retenerFor.monto - 0.01 : undefined}
                value={montoRetenido}
                onChange={(e) => setMontoRetenido(e.target.value)}
                disabled={reteniendo}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="motivoRetener">Motivo</Label>
              <Textarea
                id="motivoRetener"
                rows={3}
                placeholder="Ej. Daños en la pared del cuarto, pintura…"
                value={motivoRetener}
                onChange={(e) => setMotivoRetener(e.target.value)}
                disabled={reteniendo}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRetenerFor(null)} disabled={reteniendo}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarRetener}
              loading={reteniendo}
              disabled={!montoRetenido || !motivoRetener.trim() || reteniendo}
            >
              Registrar retención
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </div>
  );
}
