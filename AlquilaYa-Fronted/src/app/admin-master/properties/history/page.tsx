'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import {
  adminPropertyService,
  type DecisionModeracionPropiedad,
} from '@/services/admin-property-service';
import { cn } from '@/lib/cn';

const PAGE_SIZE = 20;

function formatFecha(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso ?? '—';
  }
}

function DecisionBadge({ decision }: { decision: DecisionModeracionPropiedad['decision'] }) {
  if (decision === 'APROBADO') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-green-50 border border-green-100 text-green-700 text-[10px] font-black uppercase tracking-wider">
        <span className="material-symbols-outlined text-[12px]">check_circle</span>
        Aprobado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-[10px] font-black uppercase tracking-wider">
      <span className="material-symbols-outlined text-[12px]">cancel</span>
      Rechazado
    </span>
  );
}

export default function AdminPropiedadesHistorialPage() {
  const [items, setItems] = useState<DecisionModeracionPropiedad[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await adminPropertyService.historialDecisiones(page, PAGE_SIZE);
      setItems(data.content ?? []);
      setTotalPages(data.totalPages ?? 0);
      setTotalElements(data.totalElements ?? 0);
    } catch {
      setError(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-400 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-2 border-b border-slate-100">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#c14b4c] mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c14b4c]" />
            Auditoría
          </p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
            Historial de decisiones
          </h1>
          <p className="text-xs text-slate-500 mt-2 max-w-2xl leading-relaxed">
            Registro append-only de cada aprobación o rechazo de inmuebles hecho por un admin
            desde &quot;Inmuebles por revisar&quot;. Incluye el motivo cuando el rechazo lo trae.
          </p>
        </div>
      </div>

      {/* Info de resultados */}
      {!loading && !error && totalElements > 0 && (
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
          {totalElements} decisión{totalElements !== 1 ? 'es' : ''} registrada
          {totalElements !== 1 ? 's' : ''}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-28 gap-4 text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <span className="material-symbols-outlined text-4xl animate-spin text-[#c14b4c]">autorenew</span>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Cargando historial…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-300 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <span className="material-symbols-outlined text-5xl text-red-300">error</span>
          <p className="text-sm font-semibold text-slate-400">No se pudo cargar el historial</p>
          <button
            onClick={() => cargar()}
            className="mt-1 px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-300 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <span className="material-symbols-outlined text-5xl">history</span>
          <p className="text-sm font-semibold text-slate-400">Aún no hay decisiones registradas</p>
          <p className="text-xs text-slate-300">
            Cada vez que apruebes o rechaces un inmueble, quedará una fila aquí.
          </p>
        </div>
      )}

      {/* Tabla */}
      {!loading && !error && items.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Propiedad
                </th>
                <th className="text-left px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Decisión
                </th>
                <th className="text-left px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Motivo
                </th>
                <th className="text-left px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hidden sm:table-cell">
                  Admin
                </th>
                <th className="text-left px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hidden md:table-cell">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <Link
                      href={`/property/${d.propiedadId}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 font-bold text-slate-800 hover:text-primary transition-colors max-w-[260px]"
                    >
                      <span className="truncate">{d.propiedadTitulo}</span>
                      <span className="text-slate-400 font-normal shrink-0"> · #{d.propiedadId}</span>
                      <span className="material-symbols-outlined text-xs text-slate-400 shrink-0">open_in_new</span>
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <DecisionBadge decision={d.decision} />
                  </td>
                  <td className={cn('px-5 py-4 text-xs', d.motivo ? 'text-slate-600' : 'text-slate-300')}>
                    {d.motivo ? (
                      <span className="italic">&quot;{d.motivo}&quot;</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell text-xs font-mono text-slate-400">
                    {d.adminId != null ? `#${d.adminId}` : '—'}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell text-xs text-slate-400 font-medium whitespace-nowrap">
                    {formatFecha(d.fecha)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {!loading && !error && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Página {page + 1} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              aria-label="Página anterior"
              className="h-11 w-11 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              aria-label="Página siguiente"
              className="h-11 w-11 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
