'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatsCard from '@/components/admin/StatsCard';
import StatusBadge from '@/components/admin/StatusBadge';
import { METRICAS_ADMIN, ACTIVIDADES_RECIENTES } from '@/mocks';
import { usuarioMasterService, UsuarioMaster } from '@/services/admin-user-service';
import { ArrowRight, Users, UserCheck, Clock, ShieldOff } from 'lucide-react';

const ICONOS_METRICAS = ['group', 'apartment', 'calendar_check', 'payments'];

function ProveedoresWidget() {
  const [arrendadores, setArrendadores] = useState<UsuarioMaster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usuarioMasterService.obtenerArrendadoresAdmin()
      .then(data => setArrendadores(Array.isArray(data) ? data : []))
      .catch(() => setArrendadores([]))
      .finally(() => setLoading(false));
  }, []);

  const total = arrendadores.length;
  const activos = arrendadores.filter(u => u.estado === 'ACTIVE').length;
  const pendientes = arrendadores.filter(u => u.estado === 'PENDING').length;
  const baneados = arrendadores.filter(u => u.estado === 'BANNED').length;

  const stats = [
    { label: 'Total', value: total, icon: Users, color: 'text-slate-600', bg: 'bg-slate-100' },
    { label: 'Activos', value: activos, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Pendientes', value: pendientes, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Baneados', value: baneados, icon: ShieldOff, color: 'text-red-500', bg: 'bg-red-50' },
  ];

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm mb-10">
      <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="text-base font-black text-slate-900 tracking-tight">Proveedores registrados</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            {loading ? 'Cargando...' : `${pendientes} pendiente${pendientes !== 1 ? 's' : ''} de revisión`}
          </p>
        </div>
        <Link
          href="/admin-master/validations/providers"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 border border-primary/20 text-primary text-[11px] font-black hover:bg-primary hover:text-white transition-all"
        >
          Gestionar <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="px-6 py-5 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                <Icon size={16} className={s.color} />
              </div>
              <div>
                {loading ? (
                  <div className="h-7 w-10 bg-slate-100 rounded animate-pulse mb-1" />
                ) : (
                  <p className={`text-2xl font-black tracking-tighter leading-none ${s.color}`}>{s.value}</p>
                )}
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Proveedores pendientes preview */}
      {!loading && pendientes > 0 && (
        <div className="px-8 py-4 border-t border-slate-100 bg-yellow-50/40">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-yellow-700">
              <span className="font-black">{pendientes}</span> proveedor{pendientes !== 1 ? 'es' : ''} esperando validación
            </p>
            <Link
              href="/admin-master/validations/providers"
              className="text-[11px] font-black text-yellow-700 hover:text-yellow-900 flex items-center gap-1 transition-colors"
            >
              Revisar ahora <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
        <div>
          <span className="text-primary font-black tracking-[0.3em] uppercase text-[9px] mb-3 block">Sistema de Monitorización Global</span>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">Panel de Control</h1>
        </div>
        <div className="flex gap-3">
          <button className="px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3 shadow-sm">
            <span className="material-symbols-outlined text-sm">download</span>
            Reporte PDF
          </button>
          <button className="px-8 py-4 rounded-2xl bg-primary text-white font-black text-[11px] uppercase tracking-widest hover:shadow-[0_10px_30px_rgba(var(--primary-rgb),0.3)] transition-all flex items-center gap-3">
            <span className="material-symbols-outlined text-sm">add</span>
            Nuevo Inmueble
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {METRICAS_ADMIN.map((metrica, i) => (
          <StatsCard
            key={metrica.etiqueta}
            {...metrica}
            icon={ICONOS_METRICAS[i]}
          />
        ))}
      </div>

      {/* Widget de proveedores */}
      <ProveedoresWidget />

      {/* Recent Activity Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl shadow-slate-200/50">
        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Actividad Crítica</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Últimos movimientos en tiempo real</p>
          </div>
          <button className="px-5 py-2 rounded-xl border border-slate-200 text-[11px] font-black text-slate-500 hover:bg-white hover:text-primary transition-all uppercase tracking-widest">
            Historial Completo
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] bg-slate-50/30">
                <th className="px-10 py-6">Descripción del Evento</th>
                <th className="px-10 py-6">Operador</th>
                <th className="px-10 py-6">Estado del Proceso</th>
                <th className="px-10 py-6">Marca Temporal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ACTIVIDADES_RECIENTES.map(actividad => (
                <tr key={actividad.id} className="hover:bg-slate-50/80 transition-all group">
                  <td className="px-10 py-7 text-[13px] font-bold text-slate-700 leading-snug max-w-md">
                    {actividad.descripcion}
                  </td>
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-[11px] font-black text-slate-500 border border-slate-200 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                        {actividad.usuario.charAt(0)}
                      </div>
                      <span className="text-[13px] font-black text-slate-600 tracking-tight">{actividad.usuario}</span>
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <StatusBadge status={actividad.estado as any} />
                  </td>
                  <td className="px-10 py-7 text-[11px] text-slate-400 font-bold italic">
                    {actividad.fechaHora}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
