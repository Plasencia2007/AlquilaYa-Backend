'use client';

import { useCallback, useEffect, useState } from 'react';

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

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      {toast && (
        <div
          className={cn(
            'fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-xs font-bold uppercase tracking-widest',
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500',
          )}
        >
          {toast.msg}
        </div>
      )}

      {/* Confirmación de eliminar */}
      {confirmEliminar && (
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
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="material-symbols-outlined text-primary text-2xl">reviews</span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Moderación de reseñas</h1>
        </div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">
          Reseñas de propiedades · {totalElements} en total
        </p>
      </div>

      {loading ? (
        <div className="py-24 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">
          Cargando reseñas…
        </div>
      ) : items.length === 0 ? (
        <div className="py-24 flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-slate-200 text-4xl">reviews</span>
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            Sin reseñas
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div
              key={r.id}
              className={cn(
                'rounded-2xl border bg-white p-5',
                r.visible ? 'border-slate-200' : 'border-amber-200 bg-amber-50/40',
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-2 py-0.5 rounded-md">
                      #{r.id}
                    </span>
                    <span className="text-[11px] font-bold text-amber-500">{'★'.repeat(Math.round(r.rating))}</span>
                    <span className="text-[10px] font-medium text-slate-400">
                      Propiedad #{r.targetId} · {formatFecha(r.fechaCreacion)}
                    </span>
                    {!r.visible && (
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                        Oculta
                      </span>
                    )}
                  </div>
                  {r.comentario && (
                    <p className="mt-1.5 text-sm text-slate-600 break-words">{r.comentario}</p>
                  )}
                  {r.respuestaArrendador && (
                    <div className="mt-2 rounded-xl border-l-2 border-primary/40 bg-slate-50 p-3">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
                        Respuesta del arrendador
                      </p>
                      <p className="mt-0.5 text-sm text-slate-600 break-words">{r.respuestaArrendador}</p>
                      <button
                        onClick={() => borrarRespuesta(r)}
                        disabled={busy === r.id}
                        className="mt-1 text-[11px] font-bold text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        Borrar respuesta
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => toggleVisible(r)}
                    disabled={busy === r.id}
                    title={r.visible ? 'Ocultar' : 'Restaurar'}
                    className="p-2 rounded-lg text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {r.visible ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                  <button
                    onClick={() => setConfirmEliminar(r)}
                    disabled={busy === r.id}
                    title="Eliminar"
                    className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
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
        <div className="mt-6 flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">
            Página {page + 1} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
