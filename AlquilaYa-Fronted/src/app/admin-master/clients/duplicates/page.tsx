'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  usuarioMasterService,
  type ClusterDuplicado,
  type CuentaDuplicada,
} from '@/services/admin-user-service';
import { cn } from '@/lib/cn';

const CRITERIO_LABEL: Record<string, string> = {
  DNI: 'Mismo DNI',
  TELEFONO: 'Mismo teléfono',
  EMAIL: 'Mismo correo (canónico)',
};

const CRITERIO_COLOR: Record<string, string> = {
  DNI: 'bg-rose-100 text-rose-700',
  TELEFONO: 'bg-amber-100 text-amber-700',
  EMAIL: 'bg-blue-100 text-blue-700',
};

const ESTADO_COLOR: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  BANNED: 'bg-slate-200 text-slate-500',
};

function formatFecha(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso ?? '—';
  }
}

export default function AdminDuplicadosPage() {
  const [clusters, setClusters] = useState<ClusterDuplicado[]>([]);
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
      setClusters(await usuarioMasterService.detectarDuplicados());
    } catch {
      showToast('No se pudo cargar la detección de duplicados', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarEstado = async (cuenta: CuentaDuplicada, banear: boolean) => {
    setBusy(cuenta.id);
    try {
      if (banear) await usuarioMasterService.banearUsuario(cuenta.id);
      else await usuarioMasterService.activarUsuario(cuenta.id);
      showToast(banear ? 'Cuenta baneada' : 'Cuenta activada', 'success');
      await cargar();
    } catch {
      showToast('No se pudo actualizar la cuenta', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Cuentas duplicadas</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Grupos de cuentas que comparten DNI, teléfono o correo. {clusters.length} grupo
          {clusters.length === 1 ? '' : 's'} detectado{clusters.length === 1 ? '' : 's'}.
        </p>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : clusters.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <span className="material-symbols-outlined text-5xl">group_off</span>
          <p className="mt-2 text-sm font-semibold">No se detectaron cuentas duplicadas. ✅</p>
        </div>
      ) : (
        <div className="space-y-4">
          {clusters.map((c, i) => (
            <div key={`${c.criterio}-${c.valor}-${i}`} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-bold', CRITERIO_COLOR[c.criterio])}>
                  {CRITERIO_LABEL[c.criterio] ?? c.criterio}
                </span>
                <span className="text-sm font-mono font-bold text-slate-700">{c.valor}</span>
                <span className="text-xs text-slate-400">· {c.cuentas.length} cuentas</span>
              </div>

              <div className="divide-y divide-slate-100">
                {c.cuentas.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-4 py-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-800">
                          {u.nombre} {u.apellido}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500">
                          {u.rol}
                        </span>
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', ESTADO_COLOR[u.estado])}>
                          {u.estado}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {u.correo} · DNI {u.dni}
                        {u.telefono ? ` · ${u.telefono}` : ''} · #{u.id} · {formatFecha(u.fechaCreacion)}
                      </p>
                    </div>
                    {u.estado === 'BANNED' ? (
                      <button
                        onClick={() => cambiarEstado(u, false)}
                        disabled={busy === u.id}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Activar
                      </button>
                    ) : (
                      <button
                        onClick={() => cambiarEstado(u, true)}
                        disabled={busy === u.id}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
                      >
                        Banear
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
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
