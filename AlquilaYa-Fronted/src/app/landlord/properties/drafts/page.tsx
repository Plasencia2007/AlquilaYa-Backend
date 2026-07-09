'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { borradorService } from '@/services/borrador-service';
import { propiedadService } from '@/services/landlord-property-service';
import { notify } from '@/lib/notify';
import type { PropiedadBackend } from '@/types/propiedad';

function fmtFecha(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BorradoresPage() {
  const [drafts, setDrafts] = useState<PropiedadBackend[] | null>(null);
  const [borrando, setBorrando] = useState<number | null>(null);

  const cargar = useCallback(() => {
    borradorService.listar().then(setDrafts).catch(() => setDrafts([]));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = async (id: number) => {
    setBorrando(id);
    try {
      await propiedadService.eliminar(id);
      notify.success('Borrador eliminado');
      cargar();
    } catch (e) {
      notify.error(e, 'No se pudo eliminar el borrador');
    } finally {
      setBorrando(null);
    }
  };

  const cancelarProgramacion = async (id: number) => {
    try {
      await borradorService.cancelarProgramacion(id);
      notify.success('Programación cancelada');
      cargar();
    } catch (e) {
      notify.error(e, 'No se pudo cancelar la programación');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter opacity-90">Borradores</h1>
          <p className="text-muted-foreground text-[12px] font-medium mt-0.5 tracking-tight">
            Publicaciones a medio completar. Retómalas cuando quieras.
          </p>
        </div>
        <Link
          href="/landlord/properties/add"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nueva publicación
        </Link>
      </header>

      {drafts === null ? (
        <div className="space-y-3">
          {[0, 1].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : drafts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm font-medium text-muted-foreground">No tienes borradores guardados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-bold text-foreground">{b.titulo?.trim() || 'Borrador sin título'}</p>
                  {b.fechaPublicacionProgramada && (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                      <span className="material-symbols-outlined text-[12px]">schedule</span>
                      {fmtFecha(b.fechaPublicacionProgramada)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {b.tipoPropiedad ? `${b.tipoPropiedad} · ` : ''}
                  {b.direccion?.trim() || 'Sin dirección'}
                  {b.fechaPublicacionProgramada
                    ? ` · se publica el ${new Date(b.fechaPublicacionProgramada).toLocaleString('es-PE')}`
                    : b.fechaActualizacion ? ` · editado ${fmtFecha(b.fechaActualizacion)}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {b.fechaPublicacionProgramada && (
                  <button
                    type="button"
                    onClick={() => cancelarProgramacion(b.id)}
                    className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    Cancelar programación
                  </button>
                )}
                <Link
                  href={`/landlord/properties/add?borrador=${b.id}`}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
                >
                  Continuar
                </Link>
                <button
                  type="button"
                  onClick={() => eliminar(b.id)}
                  disabled={borrando === b.id}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  title="Eliminar borrador"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
