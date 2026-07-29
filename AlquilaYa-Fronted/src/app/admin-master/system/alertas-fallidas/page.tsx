'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { MailCheck, RotateCcw } from 'lucide-react';

import {
  adminAlertaService,
  type EnvioAlertaFallida,
} from '@/services/admin-alerta-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { notify } from '@/lib/notify';

const PAGE_SIZE = 10;

function fmtFecha(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AlertasFallidasPage() {
  const [items, setItems] = useState<EnvioAlertaFallida[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await adminAlertaService.listarFallidas(page, PAGE_SIZE);
      setItems(Array.isArray(data.content) ? data.content : []);
      setTotalPages(data.totalPages ?? 0);
      setTotalElements(data.totalElements ?? 0);
    } catch (err) {
      setError(true);
      setItems([]);
      notify.error(err, 'No pudimos cargar las alertas fallidas');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleReintentar = async (id: number) => {
    setBusyId(id);
    try {
      // 200 => la fila estaba en FALLIDO y se repuso (reencolada: true).
      // 409 (ya no estaba en FALLIDO) y 404 (id inexistente) caen por el catch.
      const res = await adminAlertaService.reintentar(id);
      notify.success('Alerta reencolada', res.mensaje);
      await cargar();
    } catch (err) {
      notify.error(err, 'No se pudo reencolar la alerta');
    } finally {
      setBusyId(null);
    }
  };

  const columns: ColumnDef<EnvioAlertaFallida>[] = [
    {
      id: 'correo',
      accessorKey: 'correo',
      header: 'Destinatario',
      cell: ({ row }) => (
        <span className="text-sm font-semibold text-foreground">{row.original.correo}</span>
      ),
    },
    {
      id: 'propiedad',
      accessorFn: (a) => a.titulo,
      header: 'Propiedad',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="max-w-[220px] truncate text-sm text-foreground">
            {row.original.titulo || '—'}
          </span>
          <span className="text-[11px] text-muted-foreground">#{row.original.propiedadId}</span>
        </div>
      ),
    },
    {
      id: 'intentos',
      accessorKey: 'intentos',
      header: 'Intentos',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-bold">
          {row.original.intentos}
        </Badge>
      ),
    },
    {
      id: 'error',
      accessorKey: 'ultimoError',
      header: 'Último error',
      enableSorting: false,
      cell: ({ row }) => {
        const err = row.original.ultimoError;
        if (!err) return <span className="text-muted-foreground">—</span>;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[260px] cursor-help truncate text-left text-xs text-muted-foreground">
                {err}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm break-words text-xs">{err}</TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      id: 'fecha',
      accessorKey: 'createdAt',
      header: 'Registrada',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-xs text-foreground">{fmtFecha(row.original.createdAt)}</span>
          {row.original.proximoIntento && (
            <span className="text-[11px] text-muted-foreground">
              próx. {fmtFecha(row.original.proximoIntento)}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'acciones',
      header: () => <span className="sr-only">Acciones</span>,
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={busyId === item.id}
              onClick={() => handleReintentar(item.id)}
            >
              <RotateCcw className="size-3.5" aria-hidden />
              {busyId === item.id ? 'Reintentando…' : 'Reintentar'}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
        {/* Header */}
        <div className="mb-8">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-primary">
            Sistema · Salud de notificaciones
          </span>
          <h1 className="text-3xl font-bold leading-none tracking-tight text-foreground">
            Alertas de correo fallidas
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Cola de mensajes de alerta por correo que no pudieron entregarse. El sistema las
            reintenta automáticamente; usa «Reintentar» para reencolar una manualmente.
          </p>
        </div>

        {error ? (
          <ErrorState
            title="No pudimos cargar las alertas"
            description="Ocurrió un error al consultar la cola de alertas fallidas. Inténtalo de nuevo."
            onRetry={() => cargar()}
          />
        ) : (
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-foreground">
                    Cola de reintentos
                  </h2>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {loading ? 'Cargando…' : `${totalElements} alerta(s) fallida(s)`}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {!loading && items.length === 0 ? (
                <EmptyState
                  icon={MailCheck}
                  title="Todo en orden"
                  description="No hay alertas por correo fallidas. Cuando una notificación no pueda entregarse, aparecerá aquí para su reintento."
                />
              ) : (
                <>
                  <DataTable
                    columns={columns}
                    data={items}
                    loading={loading}
                    pageSize={PAGE_SIZE}
                    searchPlaceholder="Buscar por correo…"
                    searchColumnId="correo"
                    emptyMessage="Sin alertas fallidas."
                  />

                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                      <p className="text-sm text-muted-foreground">
                        Página {page + 1} de {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                          disabled={page === 0 || loading}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                          disabled={page >= totalPages - 1 || loading}
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
