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
    <div className="p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Denuncias de avisos</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Reportes de usuarios sobre publicaciones. {totalElements} en total.
        </p>
      </header>

      <div className="flex gap-2 mb-5">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setPage(0);
              setFiltro(f.value);
            }}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors',
              filtro === f.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <span className="material-symbols-outlined text-5xl">flag</span>
          <p className="mt-2 text-sm font-semibold">No hay denuncias en este filtro.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((d) => (
            <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[11px] font-bold">
                      {MOTIVO_LABEL[d.motivo] ?? d.motivo}
                    </span>
                    <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-bold', estadoBadge(d.estado))}>
                      {d.estado}
                    </span>
                    <span className="text-[11px] text-slate-400">{formatFecha(d.fechaCreacion)}</span>
                  </div>
                  <Link
                    href={`/property/${d.propiedadId}`}
                    target="_blank"
                    className="mt-1.5 block text-sm font-bold text-slate-800 hover:text-primary truncate"
                  >
                    {d.propiedadTitulo}
                    <span className="text-slate-400 font-normal"> · #{d.propiedadId}</span>
                  </Link>
                  {d.descripcion && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{d.descripcion}</p>
                  )}
                </div>

                {d.estado === 'PENDIENTE' && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => actualizar(d, 'REVISADA')}
                      disabled={busy === d.id}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Revisada
                    </button>
                    <button
                      onClick={() => actualizar(d, 'DESCARTADA')}
                      disabled={busy === d.id}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 disabled:opacity-50"
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs text-slate-500">
            Página {page + 1} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}

      {toast && (
        <div
          className={cn(
            'fixed bottom-6 right-6 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg',
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600',
          )}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
