'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  universidadService,
  type Universidad,
  type UniversidadInput,
} from '@/services/universidad-service';
import { cn } from '@/lib/cn';

const BASE = '/admin-master/catalog/zones/edit';
const PAGE_SIZE = 8;

/** Convierte una universidad cargada a un input que preserva sus zonas (el update las reemplaza). */
function toInput(u: Universidad, overrides: Partial<UniversidadInput> = {}): UniversidadInput {
  return {
    nombre: u.nombre,
    descripcion: u.descripcion ?? undefined,
    color: u.color ?? undefined,
    latitud: u.latitud ?? undefined,
    longitud: u.longitud ?? undefined,
    activo: u.activo,
    zonas: (u.zonas ?? []).map((z) => ({
      nombre: z.nombre,
      descripcion: z.descripcion ?? undefined,
      color: z.color ?? undefined,
      activo: z.activo,
      ordenPrioridad: z.ordenPrioridad,
      tipoLimite: z.tipoLimite,
      latitud: z.latitud ?? undefined,
      longitud: z.longitud ?? undefined,
      radioKm: z.radioKm ?? undefined,
      poligonoJson: z.poligonoJson ?? undefined,
    })),
    ...overrides,
  };
}

function cobertura(u: Universidad): { etiqueta: string; sub: string } {
  const zonas = u.zonas ?? [];
  const circulo = zonas.find((z) => z.tipoLimite === 'CIRCULO' && z.radioKm);
  const etiqueta = circulo?.radioKm
    ? `Radio: ${circulo.radioKm} km`
    : zonas.some((z) => z.tipoLimite === 'POLIGONO')
      ? 'Polígono'
      : '—';
  const circulos = zonas.filter((z) => z.tipoLimite === 'CIRCULO').length;
  const poligonos = zonas.filter((z) => z.tipoLimite === 'POLIGONO').length;
  const partes: string[] = [];
  if (circulos) partes.push(`${circulos} círculo${circulos > 1 ? 's' : ''}`);
  if (poligonos) partes.push(`${poligonos} polígono${poligonos > 1 ? 's' : ''}`);
  return { etiqueta, sub: partes.join(' · ') || 'Sin zonas' };
}

export const UniversidadesTable: React.FC = () => {
  const router = useRouter();
  const [universidades, setUniversidades] = useState<Universidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [page, setPage] = useState(1);

  const load = async () => {
    try {
      setLoading(true);
      const data = await universidadService.listarTodas();
      setUniversidades(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando universidades:', err);
      setUniversidades([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggleActivo = async (u: Universidad) => {
    try {
      await universidadService.actualizar(u.id, toInput(u, { activo: !u.activo }));
      await load();
    } catch {
      alert('No se pudo cambiar el estado de la universidad');
    }
  };

  const handleDelete = async (u: Universidad) => {
    if (!window.confirm(`¿Eliminar permanentemente "${u.nombre}" y sus zonas?`)) return;
    try {
      await universidadService.eliminar(u.id);
      await load();
    } catch {
      alert('No se pudo eliminar la universidad.');
    }
  };

  const filtered = useMemo(
    () =>
      universidades.filter((u) => {
        const matchNombre = u.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        const matchEstado =
          estadoFiltro === 'todos' || (estadoFiltro === 'activo' ? u.activo : !u.activo);
        return matchNombre && matchEstado;
      }),
    [universidades, searchTerm, estadoFiltro],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageActual = Math.min(page, totalPages);
  const desde = filtered.length === 0 ? 0 : (pageActual - 1) * PAGE_SIZE + 1;
  const hasta = Math.min(pageActual * PAGE_SIZE, filtered.length);
  const pageItems = filtered.slice((pageActual - 1) * PAGE_SIZE, pageActual * PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Barra de filtros */}
      <div className="bg-white border border-slate-200 rounded-lg px-5 py-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="material-symbols-outlined text-lg">filter_list</span>
          <span className="text-[10px] font-black uppercase tracking-widest">Filtros</span>
        </div>
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg">search</span>
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar universidad..."
            className="w-full h-10 rounded-lg border border-slate-200 pl-10 pr-3 text-sm bg-slate-50/60 focus:bg-white focus:border-primary outline-none transition-colors"
          />
        </div>
        <select
          value={estadoFiltro}
          onChange={(e) => {
            setEstadoFiltro(e.target.value as 'todos' | 'activo' | 'inactivo');
            setPage(1);
          }}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white focus:border-primary outline-none text-slate-600"
        >
          <option value="todos">Todos los Estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
        <button
          onClick={() => router.push(`${BASE}/nueva`)}
          className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          Crear Universidad
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400 uppercase text-[10px] font-black tracking-widest bg-slate-50/40">
                <th className="py-4 px-6">Nombre Universidad</th>
                <th className="py-4 px-6">Zonas</th>
                <th className="py-4 px-6">Cobertura</th>
                <th className="py-4 px-6">Estado</th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Cargando...</span>
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sin resultados</span>
                  </td>
                </tr>
              ) : (
                pageItems.map((u) => {
                  const cob = cobertura(u);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-11 h-11 rounded-lg shrink-0 flex items-center justify-center"
                            style={{ backgroundColor: `${u.color || '#94a3b8'}22`, color: u.color || '#64748b' }}
                          >
                            <span className="material-symbols-outlined text-xl">location_on</span>
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 text-sm">{u.nombre}</div>
                            {u.descripcion && (
                              <div className="text-xs text-slate-400 truncate max-w-[18rem]">{u.descripcion}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="material-symbols-outlined text-slate-300 text-xl">layers</span>
                          <span className="text-sm font-medium">{u.zonas?.length ?? 0} zona(s)</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-100 rounded-lg px-3 py-1.5 text-xs font-bold">
                          <span className="material-symbols-outlined text-sm">my_location</span>
                          {cob.etiqueta}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1.5">{cob.sub}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleToggleActivo(u)}
                            title={u.activo ? 'Desactivar' : 'Activar'}
                            className={cn(
                              'relative w-11 h-6 rounded-full transition-colors shrink-0',
                              u.activo ? 'bg-green-500' : 'bg-slate-200',
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                                u.activo ? 'translate-x-5' : 'translate-x-0',
                              )}
                            />
                          </button>
                          <span className={cn('text-sm font-semibold', u.activo ? 'text-slate-700' : 'text-slate-400')}>
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => router.push(`${BASE}/${u.id}`)}
                            title="Editar"
                            className="text-slate-300 hover:text-primary p-2 rounded-md transition-colors"
                          >
                            <span className="material-symbols-outlined text-xl">edit_square</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(u)}
                            title="Eliminar"
                            className="text-slate-300 hover:text-red-600 p-2 rounded-md transition-colors"
                          >
                            <span className="material-symbols-outlined text-xl">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Mostrando <b className="text-slate-600">{desde}-{hasta}</b> de <b className="text-slate-600">{filtered.length}</b> registros
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pageActual <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-40 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <span className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center text-sm font-bold">
              {pageActual}
            </span>
            <button
              type="button"
              disabled={pageActual >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-40 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
