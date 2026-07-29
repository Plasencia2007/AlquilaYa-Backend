'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Landmark, RefreshCw, Wallet, XCircle } from 'lucide-react';

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
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { useConfirm } from '@/hooks/use-confirm';
import { notify } from '@/lib/notify';
import { formatPEN } from '@/lib/money';
import { adminPagoService } from '@/services/pago-service';
import type { Desembolso } from '@/services/desembolso-service';

/**
 * Ítem 368: panel admin de payouts a arrendadores (G1, `DesembolsoController`).
 *
 * El backend NO tiene un endpoint que liste "desembolsos PENDIENTE de todos los
 * arrendadores" — solo el saldo aún no cubierto (`/admin/desembolsos/pendientes`) y las
 * acciones puntuales por id. Por eso el desembolso recién generado se guarda en estado
 * local (`generados`) hasta que el admin lo marca procesado/fallido en la misma sesión;
 * si recarga la página antes de resolverlo, el saldo sigue "cubierto" en el backend (no
 * vuelve a aparecer como pendiente) pero la UI pierde el puntero al id — es una limitación
 * conocida del v1 admin-mediado (ver el Javadoc de `DesembolsoService`), no un bug de esta
 * pantalla.
 */

interface FilaPayout {
  arrendadorId: string;
  montoPendiente: number;
  desembolso: Desembolso | null;
}

const ESTADO_BADGE: Record<Desembolso['estado'], string> = {
  PENDIENTE: 'bg-warning-light text-warning border-transparent',
  PROCESADO: 'bg-success-light text-success border-transparent',
  FALLIDO: 'bg-destructive/10 text-destructive border-transparent',
};

export default function AdminPayoutsPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [pendientes, setPendientes] = useState<Record<string, number>>({});
  const [generados, setGenerados] = useState<Record<string, Desembolso>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [procesadoDialogFor, setProcesadoDialogFor] = useState<Desembolso | null>(null);
  const [metodoPago, setMetodoPago] = useState('');
  const [referencia, setReferencia] = useState('');
  const [enviandoProcesado, setEnviandoProcesado] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await adminPagoService.pendientesDesembolso();
      setPendientes(data);
    } catch (err) {
      setError(true);
      notify.error(err, 'No se pudo cargar el saldo pendiente de desembolso');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filas: FilaPayout[] = useMemo(() => {
    const ids = new Set([...Object.keys(pendientes), ...Object.keys(generados)]);
    return Array.from(ids)
      .map((arrendadorId) => ({
        arrendadorId,
        montoPendiente: pendientes[arrendadorId] ?? 0,
        desembolso: generados[arrendadorId] ?? null,
      }))
      .sort((a, b) => Number(a.arrendadorId) - Number(b.arrendadorId));
  }, [pendientes, generados]);

  const handleGenerar = async (arrendadorId: string) => {
    setBusyId(arrendadorId);
    try {
      const d = await adminPagoService.generarDesembolso(arrendadorId);
      setGenerados((prev) => ({ ...prev, [arrendadorId]: d }));
      notify.success('Desembolso generado', `#${d.id} · ${formatPEN(d.montoTotal, { decimales: true })}`);
    } catch (err) {
      notify.error(err, 'No se pudo generar el desembolso');
    } finally {
      setBusyId(null);
    }
  };

  const abrirProcesado = (d: Desembolso) => {
    setProcesadoDialogFor(d);
    setMetodoPago('');
    setReferencia('');
  };

  const confirmarProcesado = async () => {
    if (!procesadoDialogFor || !metodoPago.trim()) return;
    setEnviandoProcesado(true);
    try {
      const actualizado = await adminPagoService.marcarDesembolsoProcesado(procesadoDialogFor.id, {
        metodoPago: metodoPago.trim(),
        referencia: referencia.trim() || undefined,
      });
      setGenerados((prev) => ({ ...prev, [String(actualizado.arrendadorId)]: actualizado }));
      notify.success('Desembolso marcado como procesado');
      setProcesadoDialogFor(null);
    } catch (err) {
      notify.error(err, 'No se pudo marcar como procesado');
    } finally {
      setEnviandoProcesado(false);
    }
  };

  const handleFallido = (d: Desembolso) => {
    confirm({
      title: `¿Marcar el desembolso #${d.id} como fallido?`,
      description:
        'Los pagos que cubría vuelven a quedar pendientes de desembolso para un próximo intento.',
      confirmLabel: 'Marcar fallido',
      tone: 'danger',
      requireReason: true,
      reasonPlaceholder: 'Ej. Cuenta bancaria incorrecta…',
      onConfirm: async (motivo) => {
        try {
          const actualizado = await adminPagoService.marcarDesembolsoFallido(d.id, { motivo: motivo! });
          setGenerados((prev) => {
            const next = { ...prev };
            delete next[String(actualizado.arrendadorId)];
            return next;
          });
          notify.success('Desembolso marcado como fallido');
          await cargar();
        } catch (err) {
          notify.error(err, 'No se pudo marcar como fallido');
          return false;
        }
      },
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-primary">
            Finanzas · G1
          </span>
          <h1 className="text-3xl font-bold leading-none tracking-tight text-foreground">
            Payouts a arrendadores
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Saldo acumulado de reservas ya cobradas y aún no transferido. V1 admin-mediado: la
            transferencia se hace fuera de la plataforma (banco/Yape/Plin) y se registra acá.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => cargar()} disabled={loading}>
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
          Actualizar
        </Button>
      </div>

      {error ? (
        <ErrorState
          title="No pudimos cargar los payouts"
          description="Ocurrió un error al consultar el saldo pendiente de desembolso."
          onRetry={() => cargar()}
        />
      ) : !loading && filas.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Sin saldo pendiente"
          description="Ningún arrendador tiene pagos cobrados a la espera de desembolso."
        />
      ) : (
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl font-black tracking-tight">Arrendadores con saldo</CardTitle>
            <CardDescription>
              {loading ? 'Cargando…' : `${filas.length} arrendador(es) con movimiento.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground text-[10px] uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-3 text-left font-black">Arrendador</th>
                    <th className="px-6 py-3 text-right font-black">Monto</th>
                    <th className="px-6 py-3 text-left font-black">Estado</th>
                    <th className="px-6 py-3 text-right font-black">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                        Cargando…
                      </td>
                    </tr>
                  ) : (
                    filas.map((fila) => (
                      <tr key={fila.arrendadorId} className="border-t border-border">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2 font-semibold text-foreground">
                            <Landmark className="size-4 text-muted-foreground" aria-hidden />
                            Arrendador #{fila.arrendadorId}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-foreground">
                          {formatPEN(fila.desembolso ? fila.desembolso.montoTotal : fila.montoPendiente, {
                            decimales: true,
                          })}
                        </td>
                        <td className="px-6 py-3">
                          {fila.desembolso ? (
                            <div className="flex flex-col gap-0.5">
                              <Badge variant="outline" className={ESTADO_BADGE[fila.desembolso.estado]}>
                                #{fila.desembolso.id} · {fila.desembolso.estado}
                              </Badge>
                              {fila.desembolso.estado === 'PROCESADO' && (
                                <span className="text-[11px] text-muted-foreground">
                                  {fila.desembolso.metodoPago}
                                  {fila.desembolso.referencia ? ` · ${fila.desembolso.referencia}` : ''}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="border-border text-muted-foreground">
                              Sin generar
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex justify-end gap-2">
                            {!fila.desembolso && (
                              <Button
                                size="sm"
                                className="gap-1.5"
                                disabled={busyId === fila.arrendadorId}
                                loading={busyId === fila.arrendadorId}
                                onClick={() => handleGenerar(fila.arrendadorId)}
                              >
                                Generar
                              </Button>
                            )}
                            {fila.desembolso?.estado === 'PENDIENTE' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5"
                                  onClick={() => abrirProcesado(fila.desembolso!)}
                                >
                                  <CheckCircle2 className="size-3.5" aria-hidden />
                                  Procesado
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                                  onClick={() => handleFallido(fila.desembolso!)}
                                >
                                  <XCircle className="size-3.5" aria-hidden />
                                  Fallido
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Marcar procesado: metodoPago + referencia */}
      <Dialog open={!!procesadoDialogFor} onOpenChange={(next) => !next && setProcesadoDialogFor(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Marcar desembolso #{procesadoDialogFor?.id} como procesado</DialogTitle>
            <DialogDescription>
              Registra cómo y con qué referencia se hizo la transferencia fuera de la plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="metodoPago">Método de pago *</Label>
              <Input
                id="metodoPago"
                list="metodos-pago-sugeridos"
                placeholder="Ej. Transferencia BCP, Yape, Plin…"
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                disabled={enviandoProcesado}
                autoFocus
              />
              <datalist id="metodos-pago-sugeridos">
                <option value="Transferencia bancaria" />
                <option value="Yape" />
                <option value="Plin" />
                <option value="Efectivo" />
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="referencia">Referencia (opcional)</Label>
              <Input
                id="referencia"
                placeholder="Nº de operación, código…"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                disabled={enviandoProcesado}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setProcesadoDialogFor(null)} disabled={enviandoProcesado}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarProcesado}
              loading={enviandoProcesado}
              disabled={!metodoPago.trim() || enviandoProcesado}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </div>
  );
}
