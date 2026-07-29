'use client';

import { useEffect, useState } from 'react';
import { permisoService, Permiso } from '@/services/admin-permission-service';
import { useAuthStore } from '@/stores/auth-store';
import { CustomRolesManager } from '@/components/admin/CustomRolesManager';
import { useConfirm } from '@/hooks/use-confirm';
import { notify } from '@/lib/notify';

/**
 * Funcionalidades cuya desactivación puede dejar el sistema sin acceso administrativo.
 * El backend (`PermisoService.actualizarEstado`) es la autoridad real: rechaza con 409 si
 * esta sería la última fuente activa de la funcionalidad (rol base o personalizado). Aquí
 * solo decidimos cuándo pedir confirmación extra antes de intentarlo.
 */
const FUNCIONALIDADES_CRITICAS = new Set(['ADMIN_PANEL']);

export default function RolesPermissionsPage() {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const { usuario } = useAuthStore();
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    cargarPermisos();
  }, []);

  const cargarPermisos = async () => {
    try {
      const data = await permisoService.obtenerTodos();
      setPermisos(data);
    } catch (error) {
      notify.error(error, 'No pudimos cargar la matriz de permisos');
    } finally {
      setLoading(false);
    }
  };

  const togglePermiso = async (id: number, estadoActual: boolean) => {
    try {
      await permisoService.actualizarEstado(id, !estadoActual);
      setPermisos(prev => prev.map(p => p.id === id ? { ...p, habilitado: !estadoActual } : p));
      notify.success('Permiso actualizado');
    } catch (error) {
      notify.error(error, 'No se pudo actualizar el permiso');
    }
  };

  const solicitarToggle = (permiso: Permiso) => {
    // Solo pedimos confirmación extra al DESACTIVAR una funcionalidad crítica; activar
    // permisos nunca puede dejar el sistema sin acceso, así que no interrumpe el flujo.
    if (permiso.habilitado && FUNCIONALIDADES_CRITICAS.has(permiso.funcionalidad)) {
      confirm({
        title: `¿Desactivar "${permiso.funcionalidad.replace(/_/g, ' ')}" para ${permiso.rol}?`,
        description:
          'Es una funcionalidad crítica del panel administrativo. Si ningún otro rol (base o personalizado) la mantiene activa, el sistema se quedaría sin acceso admin y el backend rechazará el cambio.',
        confirmLabel: 'Desactivar',
        tone: 'danger',
        onConfirm: () => togglePermiso(permiso.id, permiso.habilitado),
      });
    } else {
      togglePermiso(permiso.id, permiso.habilitado);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Consultando Base de Permisos</p>
    </div>
  );

  const funcionalidades = Array.from(new Set(permisos.map(p => p.funcionalidad)));
  const roles = ['ESTUDIANTE', 'ARRENDADOR', 'ADMIN'];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      <header className="mb-12">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/5">
            <span className="material-symbols-outlined text-primary text-2xl">shield_person</span>
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-1">Roles y Permisos</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gestión de Seguridad del Sistema</p>
          </div>
        </div>
        <p className="text-slate-500 font-medium max-w-2xl leading-relaxed">
          Configura y audita los niveles de acceso para cada tipo de usuario en la plataforma.
          Cada cambio se guarda en la base de permisos y aplica desde la siguiente petición que
          haga un usuario con ese rol.
        </p>
      </header>

      <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  Definición de Función
                </th>
                {roles.map(rol => (
                  <th key={rol} className="p-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center border-b border-slate-100">
                    {rol}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {funcionalidades.map(func => (
                <tr key={func} className="hover:bg-slate-50/80 transition-all duration-300 group">
                  <td className="p-8">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-primary transition-colors duration-500"></div>
                      <div>
                        <div className="font-black text-slate-800 tracking-tight text-base group-hover:text-primary transition-colors">
                          {func.replace(/_/g, ' ')}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 opacity-60">
                          Acceso granular a {func.toLowerCase()}
                        </div>
                      </div>
                    </div>
                  </td>
                  {roles.map(rol => {
                    const permiso = permisos.find(p => p.rol === rol && p.funcionalidad === func);
                    if (!permiso) return <td key={rol} className="p-8 text-center text-slate-200">-</td>;

                    return (
                      <td key={rol} className="p-8 text-center">
                        <button
                          onClick={() => solicitarToggle(permiso)}
                          className={`
                            relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 shadow-inner cursor-pointer hover:shadow-lg hover:scale-105 active:scale-95
                            ${permiso.habilitado ? 'bg-primary' : 'bg-slate-200'}
                          `}
                        >
                          <span
                            className={`
                              inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-500 shadow-md
                              ${permiso.habilitado ? 'translate-x-6' : 'translate-x-1'}
                            `}
                          />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 p-6 bg-slate-100/50 rounded-2xl border border-dashed border-slate-200 flex items-center gap-4">
        <span className="material-symbols-outlined text-primary">gpp_maybe</span>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
          Nota de Seguridad: desactivar <span className="text-primary font-black">ADMIN_PANEL</span> pide confirmación y el servidor la rechaza si sería la última fuente activa (rol base o personalizado), para evitar dejar la plataforma sin acceso administrativo.
        </p>
      </div>

      {/* RBAC dinámico (#32): roles personalizados de staff + asignación a usuarios. */}
      <CustomRolesManager />

      {ConfirmDialog}
    </div>
  );
}
