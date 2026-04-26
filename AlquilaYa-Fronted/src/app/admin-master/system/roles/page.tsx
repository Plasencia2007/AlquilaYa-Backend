'use client';

import { useEffect, useState } from 'react';
import { permisoService, Permiso } from '@/services/admin-permission-service';
import { useAuthStore } from '@/stores/auth-store';

export default function RolesPermissionsPage() {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const { usuario } = useAuthStore();

  useEffect(() => {
    cargarPermisos();
  }, []);

  const cargarPermisos = async () => {
    try {
      const data = await permisoService.obtenerTodos();
      setPermisos(data);
    } catch (error) {
      console.error('Error cargando la matriz:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePermiso = async (id: number, estadoActual: boolean) => {
    try {
      await permisoService.actualizarEstado(id, !estadoActual);
      setPermisos(prev => prev.map(p => p.id === id ? { ...p, habilitado: !estadoActual } : p));
    } catch (error) {
      alert('Error al actualizar permiso. Verifica tu conexión.');
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
    <div className="animate-fade-in">
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
          Los cambios realizados aquí se sincronizan instantáneamente con todos los microservicios core.
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
                    
                    const canToggle = !(rol === 'ADMIN' && func === 'ADMIN_PANEL');

                    return (
                      <td key={rol} className="p-8 text-center">
                        <button
                          onClick={() => canToggle && togglePermiso(permiso.id, permiso.habilitado)}
                          disabled={!canToggle}
                          className={`
                            relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 shadow-inner
                            ${permiso.habilitado ? 'bg-primary' : 'bg-slate-200'}
                            ${canToggle ? 'cursor-pointer hover:shadow-lg hover:scale-105 active:scale-95' : 'opacity-30 cursor-not-allowed'}
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
          Nota de Seguridad: El rol <span className="text-primary font-black">ADMIN</span> mantiene acceso total por defecto para prevenir fallos críticos de gestión local.
        </p>
      </div>
    </div>
  );
}
