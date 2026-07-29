'use client';

import { useCallback, useEffect, useState } from 'react';
import { ListFilter, RotateCcw, ShieldAlert } from 'lucide-react';

import { auditLogService, type AuditLogEntry } from '@/services/audit-log-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { notify } from '@/lib/notify';

const TODAS_LAS_ACCIONES = 'TODAS';

/**
 * Ítem 365: catálogo de acciones que hoy escriben en `AuditLog` (ver
 * `grep auditLogService.registrar` en servicio-usuarios). No viene del backend porque
 * `AuditLogRepository#buscar` no expone un "distinct accion" — se mantiene a mano; si se
 * agrega una acción nueva y no aparece en el filtro, la búsqueda "Todas" la sigue mostrando
 * igual (el filtro es solo una comodidad, no una alcance obligatorio).
 */
const ACCIONES_CONOCIDAS = [
  'CAMBIO_ESTADO_USUARIO',
  'ELIMINAR_USUARIO',
  'VERIFICAR_DOCUMENTO',
  'MARCAR_DUPLICADO_REVISADO',
  'IMPERSONAR_INICIO',
  'IMPERSONAR_FIN',
  'CAMPANA_WHATSAPP_CREADA',
];

interface Filtros {
  actor: string;
  accion: string;
  desde: string; // yyyy-mm-dd
  hasta: string; // yyyy-mm-dd
}

const FILTROS_VACIOS: Filtros = { actor: '', accion: TODAS_LAS_ACCIONES, desde: '', hasta: '' };

function formatFecha(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function AdminAuditPage() {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [aplicados, setAplicados] = useState<Filtros>(FILTROS_VACIOS);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ content: AuditLogEntry[]; totalElements: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async (pagina: number, f: Filtros) => {
    setLoading(true);
    try {
      const res = await auditLogService.buscar({
        page: pagina,
        size: 20,
        actor: f.actor.trim() || undefined,
        accion: f.accion === TODAS_LAS_ACCIONES ? undefined : f.accion,
        desde: f.desde ? `${f.desde}T00:00:00` : undefined,
        hasta: f.hasta ? `${f.hasta}T23:59:59` : undefined,
      });
      setData(res);
    } catch (err) {
      notify.error(err, 'No se pudo cargar la auditoría');
      setData({ content: [], totalElements: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar(page, aplicados);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, aplicados]);

  const aplicarFiltros = () => {
    setPage(0);
    setAplicados(filtros);
  };

  const limpiarFiltros = () => {
    setFiltros(FILTROS_VACIOS);
    setPage(0);
    setAplicados(FILTROS_VACIOS);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div>
        <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.3em] text-primary">Sistema</span>
        <h1 className="text-4xl font-black tracking-tighter leading-none text-foreground">Auditoría</h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          Registro append-only de todas las acciones sensibles ejecutadas por administradores.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Actor (correo)</label>
              <Input
                value={filtros.actor}
                onChange={(e) => setFiltros((f) => ({ ...f, actor: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
                placeholder="admin@alquilaya.com"
              />
            </div>
            <div className="min-w-[200px]">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Acción</label>
              <Select value={filtros.accion} onValueChange={(v) => setFiltros((f) => ({ ...f, accion: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS_LAS_ACCIONES}>Todas las acciones</SelectItem>
                  {ACCIONES_CONOCIDAS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Desde</label>
              <Input type="date" value={filtros.desde} onChange={(e) => setFiltros((f) => ({ ...f, desde: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Hasta</label>
              <Input type="date" value={filtros.hasta} onChange={(e) => setFiltros((f) => ({ ...f, hasta: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button onClick={aplicarFiltros} className="gap-1.5">
                <ListFilter className="size-4" /> Filtrar
              </Button>
              <Button variant="outline" onClick={limpiarFiltros} className="gap-1.5">
                <RotateCcw className="size-4" /> Limpiar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {loading ? (
            <div className="py-16 text-center">
              <span className="animate-pulse text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cargando auditoría...</span>
            </div>
          ) : !data || data.content.length === 0 ? (
            <div className="py-16 text-center">
              <ShieldAlert className="mx-auto mb-4 size-10 text-muted-foreground/30" />
              <p className="text-sm font-bold text-muted-foreground">Sin registros para estos filtros</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.content.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                        {formatFecha(entry.fecha)}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-foreground">
                        {entry.actorCorreo ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-foreground">
                          {entry.accion}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {entry.entidad}{entry.entidadId != null ? ` #${entry.entidadId}` : ''}
                      </TableCell>
                      {/* `detalle` es texto libre (no estructurado) — se muestra tal cual. */}
                      <TableCell className="max-w-sm whitespace-pre-wrap break-words text-xs text-muted-foreground">
                        {entry.detalle ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-[11px] font-bold text-muted-foreground">
                  {data.totalElements} registro{data.totalElements !== 1 ? 's' : ''} · página {page + 1} de {Math.max(data.totalPages, 1)}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(p - 1, 0))}>
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page + 1 >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
