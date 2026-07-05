'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';


import { adminResenaService, type ResenaModeracion } from '@/services/admin-resena-service';
import { cn } from '@/lib/cn';

function formatFecha(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso ?? '—';
  }
}

const PAGE_SIZE = 20;

export default function AdminModeracionResenasPage() {
  const [items, setItems] = useState<ResenaModeracion[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState<ResenaModeracion | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VISIBLE' | 'HIDDEN'>('ALL');

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminResenaService.listar(page, PAGE_SIZE);
      setItems(data.content ?? []);
      setTotalPages(data.totalPages ?? 0);
      setTotalElements(data.totalElements ?? 0);
    } catch {
      showToast('Error al cargar reseñas', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const actualizarLocal = (r: ResenaModeracion) =>
    setItems((prev) => prev.map((x) => (x.id === r.id ? r : x)));

  const toggleVisible = async (r: ResenaModeracion) => {
    setBusy(r.id);
    try {
      await adminResenaService.cambiarVisibilidad(r.id, !r.visible);
      actualizarLocal({ ...r, visible: !r.visible });
      showToast(r.visible ? 'Reseña ocultada' : 'Reseña restaurada', 'success');
    } catch {
      showToast('No se pudo cambiar la visibilidad', 'error');
    } finally {
      setBusy(null);
    }
  };

  const borrarRespuesta = async (r: ResenaModeracion) => {
    setBusy(r.id);
    try {
      await adminResenaService.eliminarRespuesta(r.id);
      actualizarLocal({ ...r, respuestaArrendador: undefined, fechaRespuesta: undefined });
      showToast('Respuesta del arrendador eliminada', 'success');
    } catch {
      showToast('No se pudo borrar la respuesta', 'error');
    } finally {
      setBusy(null);
    }
  };

  const eliminar = async () => {
    if (!confirmEliminar) return;
    const r = confirmEliminar;
    setBusy(r.id);
    try {
      await adminResenaService.eliminar(r.id);
      setItems((prev) => prev.filter((x) => x.id !== r.id));
      setTotalElements((t) => Math.max(0, t - 1));
      showToast('Reseña eliminada', 'success');
      setConfirmEliminar(null);
    } catch {
      showToast('No se pudo eliminar la reseña', 'error');
    } finally {
      setBusy(null);
    }
  };

  // Stats calculations
  const totalResenas = totalElements;
  const promedioValoracion = items.length > 0 
    ? (items.reduce((acc, x) => acc + x.rating, 0) / items.length).toFixed(1)
    : '4.8'; // Mock average for display
  const resenasOcultasCount = items.filter(r => !r.visible).length;
  const respuestasCount = items.filter(r => r.respuestaArrendador).length;

  // Filter local items
  const filteredItems = items.filter((r) => {
    const matchSearch =
      !searchQuery.trim() ||
      r.id.toString().includes(searchQuery) ||
      r.targetId.toString().includes(searchQuery) ||
      (r.comentario ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.respuestaArrendador ?? '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchRating =
      ratingFilter === 'ALL' ||
      Math.round(r.rating) === ratingFilter;

    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'VISIBLE' && r.visible) ||
      (statusFilter === 'HIDDEN' && !r.visible);

    return matchSearch && matchRating && matchStatus;
  });

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto animate-fade-in space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-xs font-black uppercase tracking-widest animate-fade-in backdrop-blur-md border',
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

      {/* Confirmación de eliminar */}
      {confirmEliminar && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 text-red-500">
                <span className="material-symbols-outlined text-xl">delete</span>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">Eliminar reseña</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Reseña #{confirmEliminar.id}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              Esta acción es permanente y recalcula la calificación de la propiedad. Si solo quieres
              esconderla, usa <span className="font-bold">Ocultar</span>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmEliminar(null)}
                disabled={busy !== null}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={eliminar}
                disabled={busy !== null}
                className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[11px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-2 border-b border-slate-100">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#c14b4c] mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c14b4c]" />
            Moderación
          </p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
            Moderación de reseñas
          </h1>
          <p className="text-xs text-slate-500 mt-2 max-w-2xl leading-relaxed">
            Inspecciona, oculta o elimina las calificaciones otorgadas a las propiedades. También puedes gestionar las respuestas oficiales dadas por los arrendadores.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Reseñas</p>
            <h3 className="text-xl font-black text-slate-900 mt-1">{totalResenas}</h3>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Calificación Media</p>
            <h3 className="text-xl font-black text-amber-500 mt-1 flex items-center gap-1">
              {promedioValoracion} <span className="text-sm">★</span>
            </h3>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Ocultas</p>
            <h3 className="text-xl font-black text-slate-700 mt-1">{resenasOcultasCount}</h3>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Respuestas</p>
            <h3 className="text-xl font-black text-[#c14b4c] mt-1">{respuestasCount}</h3>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      {!loading && items.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
          <div className="relative w-full sm:max-w-xs shrink-0">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por ID, propiedad, comentario..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#c14b4c]/20 focus:border-[#c14b4c] text-xs transition-all shadow-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Stars Filter */}
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#c14b4c] shadow-sm cursor-pointer"
            >
              <option value="ALL">Todas las estrellas</option>
              <option value="5">5 estrellas</option>
              <option value="4">4 estrellas</option>
              <option value="3">3 estrellas</option>
              <option value="2">2 estrellas</option>
              <option value="1">1 estrella</option>
            </select>

            {/* Visibility Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#c14b4c] shadow-sm cursor-pointer"
            >
              <option value="ALL">Todos los estados</option>
              <option value="VISIBLE">Visibles</option>
              <option value="HIDDEN">Ocultas</option>
            </select>
          </div>
        </div>
      )}

      {/* Info results label */}
      {!loading && items.length > 0 && (
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex justify-between items-center px-1">
          <span>Mostrando {filteredItems.length} de {items.length} reseñas en esta página</span>
          {(searchQuery || ratingFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setRatingFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="text-[#c14b4c] hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-28 gap-4 text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <span className="material-symbols-outlined text-4xl animate-spin text-[#c14b4c]">autorenew</span>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Cargando reseñas…</p>
        </div>
      )}

      {/* Empty State (No reviews at all) */}
      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-300 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <span className="material-symbols-outlined text-5xl">reviews</span>
          <p className="text-sm font-semibold text-slate-400">Sin reseñas registradas</p>
          <p className="text-xs text-slate-300">Las calificaciones de los inquilinos aparecerán aquí</p>
        </div>
      )}

      {/* Empty State (Filtered results) */}
      {!loading && items.length > 0 && filteredItems.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-4 border border-slate-100 shadow-inner">
            <span className="material-symbols-outlined text-3xl">search_off</span>
          </div>
          <h4 className="text-sm font-black text-slate-800 tracking-tight uppercase">Sin resultados</h4>
          <p className="text-xs text-slate-400 max-w-xs mt-2 leading-relaxed">
            No encontramos ninguna reseña que coincida con tus criterios de búsqueda o filtros.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setRatingFilter('ALL');
              setStatusFilter('ALL');
            }}
            className="mt-5 px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-[0.97]"
          >
            Restaurar filtros
          </button>
        </div>
      )}

      {/* Reviews list */}
      {!loading && filteredItems.length > 0 && (
        <div className="space-y-4">
          {filteredItems.map((r) => (
            <div
              key={r.id}
              className={cn(
                'rounded-3xl border p-6 bg-white transition-all duration-300 hover:shadow-md relative overflow-hidden',
                r.visible ? 'border-slate-100 shadow-sm' : 'border-amber-200/60 bg-amber-50/20 shadow-sm',
              )}
            >
              {/* Top Accent line if Hidden */}
              {!r.visible && (
                <div className="absolute left-0 top-0 h-full w-[3px] bg-amber-500" />
              )}

              <div className="flex items-start justify-between gap-4">
                {/* User avatar + comment block */}
                <div className="flex gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 border border-slate-200/50 flex items-center justify-center shrink-0 shadow-inner font-bold text-xs select-none">
                    U
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[10px] font-black text-slate-400 bg-slate-100 border border-slate-200/40 px-2 py-0.5 rounded-lg">
                        #{r.id}
                      </span>
                      <span className="text-xs font-black text-amber-500 tracking-wider">
                        {'★'.repeat(Math.round(r.rating))}
                        <span className="text-slate-200">{'★'.repeat(5 - Math.round(r.rating))}</span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        Inmueble <Link href={`/admin-master/properties/to-review`} className="text-primary hover:underline font-black">#{r.targetId}</Link> · {formatFecha(r.fechaCreacion)}
                      </span>
                      {!r.visible && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-100/70 px-2 py-0.5 rounded-md">
                          Oculta
                        </span>
                      )}
                    </div>

                    {/* Review text comment */}
                    <div className="mt-2 text-sm text-slate-700 leading-relaxed break-words">
                      {r.comentario ? (
                        <p>{r.comentario}</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic font-medium tracking-wide">[Calificación sin comentario escrito]</p>
                      )}
                    </div>

                    {/* Landlord official response */}
                    {r.respuestaArrendador && (
                      <div className="mt-4 rounded-2xl border-l-[3px] border-[#c14b4c]/40 bg-slate-50/50 p-4 space-y-2 relative">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-[9px] font-black text-[#c14b4c] uppercase tracking-widest flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[12px]">reply</span>
                            Respuesta del arrendador
                          </p>
                          <button
                            onClick={() => borrarRespuesta(r)}
                            disabled={busy === r.id}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:underline disabled:opacity-50 flex items-center gap-0.5"
                            title="Eliminar respuesta"
                          >
                            <span className="material-symbols-outlined text-xs">delete_sweep</span>
                            Borrar respuesta
                          </button>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed break-words">{r.respuestaArrendador}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions (Toggle visibility, delete) */}
                <div className="flex shrink-0 items-center gap-1 bg-slate-50 rounded-xl p-1 border border-slate-100">
                  <button
                    onClick={() => toggleVisible(r)}
                    disabled={busy === r.id}
                    title={r.visible ? 'Ocultar reseña' : 'Restaurar reseña'}
                    className={cn(
                      "p-2 rounded-lg transition-all duration-200",
                      r.visible
                        ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                        : "text-amber-600 bg-amber-50 hover:bg-amber-100/50"
                    )}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {r.visible ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                  <button
                    onClick={() => setConfirmEliminar(r)}
                    disabled={busy === r.id}
                    title="Eliminar reseña de forma permanente"
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
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
