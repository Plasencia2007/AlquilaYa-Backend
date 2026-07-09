'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import {
  adminDenunciaService,
  type DenunciaAdmin,
  type EstadoDenuncia,
} from '@/services/admin-denuncia-service';
import { cn } from '@/lib/cn';

const PAGE_SIZE = 20;

const MOTIVO_LABEL: Record<string, string> = {
  FRAUDE: 'Parece estafa',
  INFO_FALSA: 'Info/fotos falsas',
  DUPLICADO: 'Duplicado',
  CONTACTO_EXTERNO: 'Contacto externo',
  INAPROPIADO: 'Inapropiado',
  OTRO: 'Otro',
};

const FILTROS: { value: EstadoDenuncia | 'TODAS'; label: string }[] = [
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'REVISADA', label: 'Revisadas' },
  { value: 'DESCARTADA', label: 'Descartadas' },
  { value: 'TODAS', label: 'Todas' },
];

function formatFecha(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso ?? '—';
  }
}

function estadoBadge(estado: EstadoDenuncia) {
  const map: Record<EstadoDenuncia, string> = {
    PENDIENTE: 'bg-amber-100 text-amber-700',
    REVISADA: 'bg-emerald-100 text-emerald-700',
    DESCARTADA: 'bg-slate-200 text-slate-500',
  };
  return map[estado];
}

export default function AdminDenunciasPage() {
  const [items, setItems] = useState<DenunciaAdmin[]>([]);
  const [filtro, setFiltro] = useState<EstadoDenuncia | 'TODAS'>('PENDIENTE');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const estado = filtro === 'TODAS' ? undefined : filtro;
      const data = await adminDenunciaService.listar(estado, page, PAGE_SIZE);
      setItems(data.content ?? []);
      setTotalPages(data.totalPages ?? 0);
      setTotalElements(data.totalElements ?? 0);
    } catch {
      showToast('No se pudieron cargar las denuncias', 'error');
    } finally {
      setLoading(false);
    }
  }, [filtro, page]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const actualizar = async (d: DenunciaAdmin, estado: EstadoDenuncia) => {
    setBusy(d.id);
    try {
      await adminDenunciaService.actualizarEstado(d.id, estado);
      showToast(estado === 'REVISADA' ? 'Marcada como revisada' : 'Denuncia descartada', 'success');
      await cargar();
    } catch {
      showToast('No se pudo actualizar', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-400 space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-xs font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2 duration-400 backdrop-blur-md border',
            toast.type === 'success'
              ? 'bg-green-500/90 text-white border-green-400/20 shadow-green-500/10'
              : 'bg-[#c14b4c]/90 text-white border-[#c14b4c]/20 shadow-red-500/10',
          )}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-2 border-b border-slate-100">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#c14b4c] mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c14b4c]" />
            Moderación
          </p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
            Denuncias de avisos
          </h1>
          <p className="text-xs text-slate-500 mt-2 max-w-2xl leading-relaxed">
            Monitorea y resuelve los reportes de malas prácticas, estafas o información inapropiada presentados por los usuarios sobre publicaciones en catálogo.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Denuncias</p>
            <h3 className="text-xl font-black text-slate-900 mt-1">{totalElements}</h3>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Por Revisar</p>
            <h3 className="text-xl font-black text-amber-600 mt-1">
              {filtro === 'PENDIENTE' ? totalElements : '—'}
            </h3>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Estado Filtro</p>
            <h3 className="text-sm font-black text-slate-700 mt-2 uppercase tracking-wider">
              {filtro}
            </h3>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Urgencia</p>
            <h3 className="text-xl font-black text-red-500 mt-1">Alta</h3>
          </div>
        </div>
      )}

      {/* Unified Tab Control */}
      <div className="flex bg-slate-100 rounded-2xl p-0.5 border border-slate-200/50 shadow-inner w-fit">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setPage(0);
              setFiltro(f.value);
            }}
            className={cn(
              'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200',
              filtro === f.value
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List content / skeletons */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-3xl bg-slate-100 animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-300 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-inner">
            <span className="material-symbols-outlined text-3xl">flag</span>
          </div>
          <h4 className="text-sm font-black text-slate-800 tracking-tight uppercase">Sin denuncias</h4>
          <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed text-center">
            No se encontraron reportes pendientes en este filtro. Las nuevas notificaciones de los usuarios aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((d) => (
            <div
              key={d.id}
              className={cn(
                'rounded-3xl border p-6 bg-white transition-all duration-300 hover:shadow-md relative overflow-hidden',
                d.estado === 'PENDIENTE' ? 'border-slate-100 shadow-sm' : 'border-slate-200/60 bg-slate-50/40 shadow-sm',
              )}
            >
              {/* Left Accent indicator for Pendiente status */}
              {d.estado === 'PENDIENTE' && (
                <div className="absolute left-0 top-0 h-full w-[3px] bg-red-500" />
              )}

              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                {/* Information area */}
                <div className="space-y-2.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider">
                      {MOTIVO_LABEL[d.motivo] ?? d.motivo}
                    </span>
                    <span className={cn('px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider', estadoBadge(d.estado))}>
                      {d.estado}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{formatFecha(d.fechaCreacion)}</span>
                  </div>

                  <div>
                    <Link
                      href={`/property/${d.propiedadId}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-sm font-bold text-slate-800 hover:text-primary transition-colors max-w-full"
                    >
                      <span className="truncate">{d.propiedadTitulo}</span>
                      <span className="text-slate-400 font-normal shrink-0"> · #{d.propiedadId}</span>
                      <span className="material-symbols-outlined text-xs text-slate-400 shrink-0">open_in_new</span>
                    </Link>
                  </div>

                  {d.descripcion && (
                    <div className="rounded-2xl border-l-[3px] border-slate-200 bg-slate-50/40 p-3">
                      <p className="text-xs text-slate-600 leading-relaxed italic">"{d.descripcion}"</p>
                    </div>
                  )}
                </div>

                {/* Actions area for PENDIENTE status */}
                {d.estado === 'PENDIENTE' && (
                  <div className="flex shrink-0 gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
                    <button
                      onClick={() => actualizar(d, 'REVISADA')}
                      disabled={busy === d.id}
                      className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 hover:shadow-[0_4px_12px_rgba(22,163,74,0.15)] active:scale-[0.98]"
                    >
                      Revisada
                    </button>
                    <button
                      onClick={() => actualizar(d, 'DESCARTADA')}
                      disabled={busy === d.id}
                      className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 active:scale-[0.98]"
                    >
                      Descartar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Página {page + 1} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
