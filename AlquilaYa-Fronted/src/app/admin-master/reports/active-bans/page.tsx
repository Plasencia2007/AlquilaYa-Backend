'use client';

import { useCallback, useEffect, useState } from 'react';

import { usuarioMasterService, type UsuarioMaster } from '@/services/admin-user-service';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/cn';

const ROL_LABEL: Record<UsuarioMaster['rol'], string> = {
  ESTUDIANTE: 'Estudiante',
  ARRENDADOR: 'Arrendador',
  ADMIN: 'Admin',
};

function formatFecha(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso ?? '—';
  }
}

export default function AdminBaneosActivosPage() {
  const [items, setItems] = useState<UsuarioMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await usuarioMasterService.obtenerPorEstado('BANNED');
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      notify.error(err, 'No se pudieron cargar los baneos activos');
      setError(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const reactivar = async (user: UsuarioMaster) => {
    if (!window.confirm(`¿Restaurar el acceso de ${user.nombre} ${user.apellido}?`)) return;
    setBusy(user.id);
    try {
      await usuarioMasterService.activarUsuario(user.id);
      setItems((prev) => prev.filter((u) => u.id !== user.id));
      showToast(`Acceso restaurado a ${user.nombre} ${user.apellido}`, 'success');
    } catch {
      showToast('No se pudo restaurar el acceso', 'error');
    } finally {
      setBusy(null);
    }
  };

  const filtrados = items.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.nombre?.toLowerCase().includes(q) ||
      u.apellido?.toLowerCase().includes(q) ||
      u.correo?.toLowerCase().includes(q) ||
      u.dni?.includes(searchQuery)
    );
  });

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-400 space-y-6">
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
            Baneos activos
          </h1>
          <p className="text-xs text-slate-500 mt-2 max-w-2xl leading-relaxed">
            Cuentas actualmente baneadas (cualquier rol). Restaura el acceso si el baneo ya no
            corresponde.
          </p>
        </div>
      </div>

      {/* Stats */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Baneos activos</p>
            <h3 className="text-xl font-black text-red-500 mt-1">{items.length}</h3>
          </div>
        </div>
      )}

      {/* Search */}
      {!loading && !error && items.length > 0 && (
        <div className="relative w-full sm:max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, correo o DNI..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#c14b4c]/20 focus:border-[#c14b4c] text-xs transition-all shadow-sm"
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-28 gap-4 text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <span className="material-symbols-outlined text-4xl animate-spin text-[#c14b4c]">autorenew</span>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Cargando baneos…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-300 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <span className="material-symbols-outlined text-5xl text-red-300">error</span>
          <p className="text-sm font-semibold text-slate-400">No se pudo cargar el listado</p>
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
          <span className="material-symbols-outlined text-5xl">block</span>
          <p className="text-sm font-semibold text-slate-400">No hay cuentas baneadas</p>
          <p className="text-xs text-slate-300">Cuando banees a un usuario, aparecerá aquí.</p>
        </div>
      )}

      {/* Filtered empty */}
      {!loading && !error && items.length > 0 && filtrados.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-4 border border-slate-100 shadow-inner">
            <span className="material-symbols-outlined text-3xl">search_off</span>
          </div>
          <h4 className="text-sm font-black text-slate-800 tracking-tight uppercase">Sin resultados</h4>
          <p className="text-xs text-slate-400 max-w-xs mt-2 leading-relaxed">
            No encontramos ninguna cuenta baneada que coincida con &quot;{searchQuery}&quot;.
          </p>
        </div>
      )}

      {/* Tabla */}
      {!loading && !error && filtrados.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Usuario
                </th>
                <th className="text-left px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Rol
                </th>
                <th className="text-left px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hidden sm:table-cell">
                  Motivo
                </th>
                <th className="text-left px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hidden md:table-cell">
                  Registro
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-800 leading-tight">{u.nombre} {u.apellido}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{u.correo}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[10px] font-bold text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md">
                      {ROL_LABEL[u.rol] ?? u.rol}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell text-xs">
                    {u.motivoBaneo ? (
                      <span className="text-slate-600">{u.motivoBaneo}</span>
                    ) : (
                      <span className="text-slate-300 italic">No especificado</span>
                    )}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell text-xs text-slate-400 font-medium">
                    {formatFecha(u.fechaCreacion)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => reactivar(u)}
                      disabled={busy === u.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-[10px] font-black uppercase tracking-wider hover:bg-green-100 transition-all disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {busy === u.id ? 'autorenew' : 'shield'}
                      </span>
                      Reactivar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
