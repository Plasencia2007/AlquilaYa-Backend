'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Loader2, Receipt } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { SkeletonTable } from '@/components/shared/skeleton-table';
import { cn } from '@/lib/cn';
import { notify } from '@/lib/notify';
import { formatPEN } from '@/lib/money';
import { formatearFecha } from '@/lib/relative-time';
import { pagoService, type EstadoPago, type PagoHistorial } from '@/services/pago-service';

const TAMANO_PAGINA = 10;

const ESTADO_META: Record<EstadoPago, { label: string; className: string }> = {
  PAGADO: { label: 'Pagado', className: 'bg-success-light text-success' },
  PENDIENTE: { label: 'Pendiente', className: 'bg-warning-light text-warning' },
  PENDIENTE_REVISION: { label: 'En revisión', className: 'bg-warning-light text-warning' },
  RECHAZADO: { label: 'Rechazado', className: 'bg-destructive/10 text-destructive' },
  DISCREPANCIA: { label: 'En revisión', className: 'bg-destructive/10 text-destructive' },
  EXPIRADO: { label: 'Expirado', className: 'bg-muted text-muted-foreground' },
  SIN_PAGO: { label: 'Sin pago', className: 'bg-muted text-muted-foreground' },
  REEMBOLSADO: { label: 'Reembolsado', className: 'bg-muted text-muted-foreground' },
  REEMBOLSO_FALLIDO: { label: 'Reembolso fallido', className: 'bg-destructive/10 text-destructive' },
};

export default function StudentPaymentsPage() {
  const [items, setItems] = useState<PagoHistorial[]>([]);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [estadoCarga, setEstadoCarga] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [descargandoId, setDescargandoId] = useState<number | null>(null);

  // Carga inicial encadenada inline con `.then/.catch` (no setState síncrono dentro del
  // efecto), mismo patrón que `use-reservations.ts` y `roommates/page.tsx`.
  useEffect(() => {
    let cancelado = false;
    pagoService
      .listarMisPagos(0, TAMANO_PAGINA)
      .then((data) => {
        if (cancelado) return;
        setItems(data.content);
        setPagina(data.number);
        setTotalPaginas(data.totalPages);
        setEstadoCarga('ok');
      })
      .catch((err) => {
        if (cancelado) return;
        notify.error(err, 'No pudimos cargar tu historial de pagos');
        setEstadoCarga('error');
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // Cambio de página / reintentar: se dispara desde un click, fuera del efecto.
  const cargar = useCallback(async (paginaObjetivo: number) => {
    setEstadoCarga('cargando');
    try {
      const data = await pagoService.listarMisPagos(paginaObjetivo, TAMANO_PAGINA);
      setItems(data.content);
      setPagina(data.number);
      setTotalPaginas(data.totalPages);
      setEstadoCarga('ok');
    } catch (err) {
      notify.error(err, 'No pudimos cargar tu historial de pagos');
      setEstadoCarga('error');
    }
  }, []);

  const descargar = useCallback(async (pago: PagoHistorial) => {
    setDescargandoId(pago.id);
    try {
      const blob = await pagoService.descargarComprobante(pago.reservaId);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) notify.warning('Habilita las ventanas emergentes para ver el comprobante.');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      notify.error(err, 'No se pudo descargar el comprobante.');
    } finally {
      setDescargandoId(null);
    }
  }, []);

  const cargando = estadoCarga === 'cargando';
  const error = estadoCarga === 'error';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 space-y-2">
        <h1 className="text-h1">Mis pagos</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Historial de tus pagos de reservas en AlquilaYa.
        </p>
      </header>

      {cargando ? (
        <SkeletonTable rows={6} columns={5} />
      ) : error ? (
        <ErrorState
          title="No pudimos cargar tu historial"
          description="Inténtalo de nuevo en un momento."
          onRetry={() => cargar(pagina)}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Aún no tienes pagos"
          description="Cuando pagues una reserva, aparecerá aquí junto a su comprobante."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-black sm:px-6">Fecha</th>
                  <th className="px-4 py-3 text-left font-black sm:px-6">Reserva</th>
                  <th className="px-4 py-3 text-right font-black sm:px-6">Monto</th>
                  <th className="px-4 py-3 text-left font-black sm:px-6">Estado</th>
                  <th className="px-4 py-3 text-right font-black sm:px-6">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((pago) => {
                  const meta = ESTADO_META[pago.estado] ?? ESTADO_META.SIN_PAGO;
                  return (
                    <tr key={pago.id}>
                      <td className="px-4 py-3 text-muted-foreground sm:px-6">
                        {formatearFecha(pago.fechaPago ?? pago.fechaCreacion, true)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground sm:px-6">
                        {pago.propiedadTitulo ?? `Reserva #${pago.reservaId}`}
                      </td>
                      <td className="tnum px-4 py-3 text-right font-bold text-foreground sm:px-6">
                        {formatPEN(pago.monto, { decimales: true })}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold', meta.className)}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right sm:px-6">
                        {pago.estado === 'PAGADO' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            disabled={descargandoId === pago.id}
                            onClick={() => descargar(pago)}
                          >
                            {descargandoId === pago.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Download className="size-3.5" />
                            )}
                            Descargar
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => cargar(pagina - 1)}
                disabled={pagina === 0}
                className="gap-1"
              >
                <ChevronLeft className="size-4" /> Anterior
              </Button>
              <span className="text-sm font-semibold text-muted-foreground">
                Página {pagina + 1} de {totalPaginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cargar(pagina + 1)}
                disabled={pagina >= totalPaginas - 1}
                className="gap-1"
              >
                Siguiente <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
