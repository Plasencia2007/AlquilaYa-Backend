'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/shared/stat-card';
import StatusBadge from '@/components/admin/StatusBadge';
import { usuarioMasterService, UsuarioMaster } from '@/services/admin-user-service';
import { adminService } from '@/services/adminService';
import { adminPropertyService, PropiedadAdminDTO } from '@/services/admin-property-service';
import { Propiedad } from '@/types/propiedad';
import { ArrowRight, Users, UserCheck, Clock, ShieldOff, RefreshCw } from 'lucide-react';

const formatearFecha = (iso?: string) => {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatearSoles = (valor?: number) =>
  `S/ ${Number(valor || 0).toLocaleString('es-PE')}`;

function ProveedoresWidget({ arrendadores, loading }: { arrendadores: UsuarioMaster[]; loading: boolean }) {
  const total = arrendadores.length;
  const activos = arrendadores.filter(u => u.estado === 'ACTIVE').length;
  const pendientes = arrendadores.filter(u => u.estado === 'PENDING').length;
  const baneados = arrendadores.filter(u => u.estado === 'BANNED').length;

  const stats = [
    { label: 'Total', value: total, icon: Users, color: 'text-slate-600', bg: 'bg-slate-100' },
    { label: 'Activos', value: activos, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Pendientes', value: pendientes, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Baneados', value: baneados, icon: ShieldOff, color: 'text-red-500', bg: 'bg-red-50' },
  ];

  return (
    <div className="bg-white rounded-md border border-slate-200 overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Proveedores registrados</h2>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
            {loading ? 'Cargando...' : `${pendientes} pendiente${pendientes !== 1 ? 's' : ''} de revisión`}
          </p>
        </div>
        <Link
          href="/admin-master/validations/providers"
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/5 border border-primary/20 text-primary text-[11px] font-bold hover:bg-primary hover:text-white transition-colors"
        >
          Gestionar <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="px-5 py-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                <Icon size={16} className={s.color} />
              </div>
              <div>
                {loading ? (
                  <div className="h-6 w-9 bg-slate-100 rounded animate-pulse mb-1" />
                ) : (
                  <p className={`text-2xl font-bold tracking-tight leading-none ${s.color}`}>{s.value}</p>
                )}
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && pendientes > 0 && (
        <div className="px-6 py-3 border-t border-slate-100 bg-amber-50/50">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-700">
              <span className="font-bold">{pendientes}</span> proveedor{pendientes !== 1 ? 'es' : ''} esperando validación
            </p>
            <Link
              href="/admin-master/validations/providers"
              className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 transition-colors"
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
  const [estudiantes, setEstudiantes] = useState<UsuarioMaster[]>([]);
  const [arrendadores, setArrendadores] = useState<UsuarioMaster[]>([]);
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [pendientes, setPendientes] = useState<PropiedadAdminDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    const [est, arr, props, pend] = await Promise.allSettled([
      usuarioMasterService.obtenerPorRol('ESTUDIANTE'),
      usuarioMasterService.obtenerArrendadoresAdmin(),
      adminService.getRealProperties(),
      adminPropertyService.listarPendientes(),
    ]);
    setEstudiantes(est.status === 'fulfilled' && Array.isArray(est.value) ? est.value : []);
    setArrendadores(arr.status === 'fulfilled' && Array.isArray(arr.value) ? arr.value : []);
    setPropiedades(props.status === 'fulfilled' && Array.isArray(props.value) ? props.value : []);
    setPendientes(pend.status === 'fulfilled' && Array.isArray(pend.value) ? pend.value : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const totalUsuarios = estudiantes.length + arrendadores.length;
  const arrendadoresActivos = arrendadores.filter(u => u.estado === 'ACTIVE').length;
  const valor = (n: number) => (loading ? '—' : n.toLocaleString('es-PE'));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <span className="text-primary font-bold tracking-wider uppercase text-[10px] mb-2 block">Torre de Control</span>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">Panel de Control</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={cargar}
            className="px-4 py-2.5 rounded-md bg-white border border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <Link
            href="/admin-master/properties/to-review"
            className="px-4 py-2.5 rounded-md bg-primary text-white font-bold text-[11px] uppercase tracking-wider hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">fact_check</span>
            Revisar pendientes
            {!loading && pendientes.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-white/20 text-[10px] leading-none">{pendientes.length}</span>
            )}
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Usuarios totales"
          value={valor(totalUsuarios)}
          deltaLabel={`${estudiantes.length} estudiantes`}
          icon="group"
        />
        <StatCard
          label="Arrendadores"
          value={valor(arrendadores.length)}
          deltaLabel={`${arrendadoresActivos} activos`}
          icon="store"
        />
        <StatCard
          label="Propiedades"
          value={valor(propiedades.length)}
          deltaLabel="en catálogo"
          icon="apartment"
        />
        <StatCard
          label="Por revisar"
          value={valor(pendientes.length)}
          deltaLabel="requieren acción"
          icon="fact_check"
        />
      </div>

      {/* Widget de proveedores */}
      <ProveedoresWidget arrendadores={arrendadores} loading={loading} />

      {/* Cola de revisión (datos reales) */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Cola de revisión</h2>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
              Inmuebles esperando aprobación
            </p>
          </div>
          <Link
            href="/admin-master/properties/to-review"
            className="px-4 py-1.5 rounded-md border border-slate-200 text-[11px] font-bold text-slate-500 hover:bg-slate-50 hover:text-primary transition-colors uppercase tracking-wider"
          >
            Ver todo
          </Link>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-50">
            {[0, 1, 2].map(i => (
              <div key={i} className="px-6 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-md bg-slate-100 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 bg-slate-100 rounded animate-pulse" />
                  <div className="h-2.5 w-1/4 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : pendientes.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300">task_alt</span>
            <p className="text-sm font-semibold text-slate-500 mt-2">No hay inmuebles pendientes de revisión.</p>
            <p className="text-xs text-slate-400 mt-1">Todo al día.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-50/40">
                  <th className="px-6 py-3">Propiedad</th>
                  <th className="px-6 py-3">Arrendador</th>
                  <th className="px-6 py-3">Precio</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pendientes.slice(0, 6).map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-6 py-4 text-[13px] font-semibold text-slate-700 leading-snug max-w-xs">
                      <p className="truncate">{p.titulo}</p>
                      <p className="text-[11px] font-medium text-slate-400 truncate">{p.direccion}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center text-[11px] font-bold text-slate-500 border border-slate-200 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors">
                          {(p.arrendadorNombre || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[13px] font-semibold text-slate-600">{p.arrendadorNombre || 'Sin nombre'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[13px] font-bold text-slate-700">{formatearSoles(p.precio)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status="PENDIENTE" />
                    </td>
                    <td className="px-6 py-4 text-[11px] text-slate-400 font-medium">{formatearFecha(p.fechaCreacion)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href="/admin-master/properties/to-review"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Revisar <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
