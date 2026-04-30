'use client';

import { useEffect, useState } from 'react';
import { adminPropertyService, type PropiedadAdminDTO } from '@/services/admin-property-service';
import { catalogosService } from '@/services/catalogos-service';
import { catalogService, type ItemCatalogoInput } from '@/services/catalog-service';
import { cn } from '@/lib/cn';

// =============================================================================
// Helpers
// =============================================================================

function resolveItemStatus(items: string[], catalogValores: Set<string>) {
  return items.map((v) => ({ value: v, isCustom: !catalogValores.has(v) }));
}

function hasCustomItems(
  prop: PropiedadAdminDTO,
  catalogoServicios: Set<string>,
  catalogoReglas: Set<string>,
): boolean {
  return (
    (prop.serviciosIncluidos ?? []).some((v) => !catalogoServicios.has(v)) ||
    (prop.reglas ?? []).some((v) => !catalogoReglas.has(v))
  );
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// =============================================================================
// ItemChip
// =============================================================================

interface ItemChipProps {
  value: string;
  isCustom: boolean;
  onPromote?: () => void;
}

function ItemChip({ value, isCustom, onPromote }: ItemChipProps) {
  if (isCustom) {
    return (
      <span className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 border border-amber-200 text-amber-800">
        <span className="material-symbols-outlined text-[12px]">edit_note</span>
        {value}
        {onPromote && (
          <button
            type="button"
            onClick={onPromote}
            title="Promover al catálogo oficial"
            className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-amber-600 hover:text-amber-900"
          >
            <span className="material-symbols-outlined text-[12px]">upload</span>
          </button>
        )}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 border border-slate-200 text-slate-600">
      {value}
    </span>
  );
}

// =============================================================================
// PromoteDialog
// =============================================================================

interface PromoteDialogProps {
  itemValue: string;
  tipo: 'SERVICIO' | 'REGLA';
  onConfirm: (nombre: string, valor: string, icono?: string) => void;
  onCancel: () => void;
  loading: boolean;
}

function PromoteDialog({ itemValue, tipo, onConfirm, onCancel, loading }: PromoteDialogProps) {
  const [nombre, setNombre] = useState(itemValue);
  const [valor, setValor] = useState(
    itemValue
      .toUpperCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, ''),
  );
  const [icono, setIcono] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 shrink-0">
            <span className="material-symbols-outlined text-[20px] text-amber-500">upload</span>
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Promover al catálogo
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {tipo === 'SERVICIO' ? 'Servicio' : 'Regla'} · nuevo ítem oficial
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
              Nombre legible *
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-slate-400 transition-colors"
              placeholder="Ej: Calefacción central"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
              Clave de catálogo *
              <span className="normal-case tracking-normal font-normal ml-1 opacity-60">
                (mayúsculas, números y _)
              </span>
            </label>
            <input
              value={valor}
              onChange={(e) =>
                setValor(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9_]/g, ''),
                )
              }
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-slate-400 transition-colors"
              placeholder="CALEFACCION_CENTRAL"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
              Ícono Material Symbols
              <span className="normal-case tracking-normal font-normal ml-1 opacity-60">
                (opcional · ej: thermostat)
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                value={icono}
                onChange={(e) => setIcono(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-slate-400 transition-colors"
                placeholder="thermostat"
              />
              {icono && (
                <span className="material-symbols-outlined text-[24px] text-slate-500 shrink-0">
                  {icono}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(nombre.trim(), valor.trim(), icono.trim() || undefined)}
            disabled={loading || !nombre.trim() || !valor.trim()}
            className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading && (
              <span className="material-symbols-outlined text-[15px] animate-spin">
                autorenew
              </span>
            )}
            {loading ? 'Promoviendo…' : 'Promover'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PropertyReviewPanel
// =============================================================================

interface PropertyReviewPanelProps {
  prop: PropiedadAdminDTO;
  catalogoServicios: Set<string>;
  catalogoReglas: Set<string>;
  actionLoading: number | null;
  onClose: () => void;
  onAprobar: () => void;
  onRechazar: () => void;
  onPromote: (value: string, tipo: 'SERVICIO' | 'REGLA') => void;
}

function PropertyReviewPanel({
  prop,
  catalogoServicios,
  catalogoReglas,
  actionLoading,
  onClose,
  onAprobar,
  onRechazar,
  onPromote,
}: PropertyReviewPanelProps) {
  const servicios = resolveItemStatus(prop.serviciosIncluidos ?? [], catalogoServicios);
  const reglas = resolveItemStatus(prop.reglas ?? [], catalogoReglas);
  const hasCustomServicios = servicios.some((s) => s.isCustom);
  const hasCustomReglas = reglas.some((r) => r.isCustom);
  const isLoading = actionLoading === prop.id;

  return (
    <div
      className="fixed inset-0 z-40 flex items-stretch justify-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white h-full w-full max-w-xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between shrink-0">
          <div className="min-w-0 flex-1 pr-4">
            <h3 className="text-base font-black text-slate-900 tracking-tight truncate">
              {prop.titulo}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              ID #{prop.id}
              {prop.arrendadorNombre ? ` · ${prop.arrendadorNombre}` : ` · Arrendador ${prop.arrendadorId}`}
            </p>
            <p className="text-[10px] text-slate-300 mt-0.5">Publicado: {formatDate(prop.fechaCreacion)}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-slate-300 hover:text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Imagen */}
          {(prop.imagenes ?? []).length > 0 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={prop.imagenes[0]}
              alt={prop.titulo}
              className="w-full h-48 object-cover rounded-xl border border-slate-100"
            />
          )}

          {/* Info básica */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Precio</p>
              <p className="text-sm font-bold text-slate-800">
                S/ {prop.precio?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Período</p>
              <p className="text-sm font-bold text-slate-800">{prop.periodoAlquiler ?? '—'}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Tipo</p>
              <p className="text-sm font-medium text-slate-600">{prop.tipoPropiedad ?? '—'}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Piso / Área</p>
              <p className="text-sm font-medium text-slate-600">
                {prop.nroPiso != null ? `Piso ${prop.nroPiso}` : '—'}
                {prop.area != null ? ` · ${prop.area} m²` : ''}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Dirección</p>
              <p className="text-sm font-medium text-slate-600">{prop.direccion}</p>
            </div>
            {prop.arrendadorTelefono && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Teléfono</p>
                <p className="text-sm font-medium text-slate-600">{prop.arrendadorTelefono}</p>
              </div>
            )}
            {prop.arrendadorCorreo && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Correo</p>
                <p className="text-sm font-medium text-slate-600 truncate">{prop.arrendadorCorreo}</p>
              </div>
            )}
          </div>

          {/* Servicios */}
          {(prop.serviciosIncluidos ?? []).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Servicios incluidos
                </p>
                {hasCustomServicios && (
                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Contiene sugeridos
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {servicios.map(({ value, isCustom }) => (
                  <ItemChip
                    key={value}
                    value={value}
                    isCustom={isCustom}
                    onPromote={isCustom ? () => onPromote(value, 'SERVICIO') : undefined}
                  />
                ))}
              </div>
              {hasCustomServicios && (
                <p className="text-[10px] text-amber-600 mt-1.5">
                  Pasa el cursor sobre un ítem <span className="font-bold">amber</span> y haz clic en{' '}
                  <span className="material-symbols-outlined text-[12px] align-middle">upload</span>{' '}
                  para agregarlo al catálogo oficial.
                </p>
              )}
            </div>
          )}

          {/* Reglas */}
          {(prop.reglas ?? []).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Reglas de la casa
                </p>
                {hasCustomReglas && (
                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Contiene sugeridos
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {reglas.map(({ value, isCustom }) => (
                  <ItemChip
                    key={value}
                    value={value}
                    isCustom={isCustom}
                    onPromote={isCustom ? () => onPromote(value, 'REGLA') : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Descripción */}
          {prop.descripcion && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                Descripción
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">{prop.descripcion}</p>
            </div>
          )}

          {/* Galería extra */}
          {(prop.imagenes ?? []).length > 1 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Galería ({prop.imagenes.length} fotos)
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {prop.imagenes.slice(1).map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt={`Foto ${i + 2}`}
                    className="w-full aspect-[4/3] object-cover rounded-lg border border-slate-100"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
          <button
            onClick={onRechazar}
            disabled={isLoading}
            className="flex-1 h-11 rounded-xl border border-red-200 text-red-500 text-[11px] font-black uppercase tracking-widest hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">close</span>
            Rechazar
          </button>
          <button
            onClick={onAprobar}
            disabled={isLoading}
            className="flex-1 h-11 rounded-xl bg-green-500 hover:bg-green-600 text-white text-[11px] font-black uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="material-symbols-outlined text-base animate-spin">autorenew</span>
            ) : (
              <span className="material-symbols-outlined text-base">check_circle</span>
            )}
            Aprobar
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Toast
// =============================================================================

interface ToastState {
  msg: string;
  type: 'success' | 'error';
}

// =============================================================================
// Página principal
// =============================================================================

export default function AdminPropiedadesRevisionPage() {
  const [propiedades, setPropiedades] = useState<PropiedadAdminDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PropiedadAdminDTO | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<{
    value: string;
    tipo: 'SERVICIO' | 'REGLA';
  } | null>(null);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [catalogoServicios, setCatalogoServicios] = useState<Set<string>>(new Set());
  const [catalogoReglas, setCatalogoReglas] = useState<Set<string>>(new Set());

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const [pendientes, catalogos] = await Promise.all([
          adminPropertyService.listarPendientes(),
          catalogosService.obtenerActivos(),
        ]);
        if (cancelled) return;
        setPropiedades(pendientes);
        setCatalogoServicios(new Set((catalogos.SERVICIO ?? []).map((i) => i.valor)));
        setCatalogoReglas(new Set((catalogos.REGLA ?? []).map((i) => i.valor)));
      } catch {
        if (!cancelled) showToast('Error al cargar propiedades pendientes', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  const handleAprobar = async () => {
    if (!selected) return;
    setActionLoading(selected.id);
    try {
      await adminPropertyService.aprobar(selected.id);
      setPropiedades((prev) => prev.filter((p) => p.id !== selected.id));
      showToast(`"${selected.titulo}" aprobada`, 'success');
      setSelected(null);
    } catch {
      showToast('Error al aprobar la propiedad', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRechazar = async () => {
    if (!selected) return;
    setActionLoading(selected.id);
    try {
      await adminPropertyService.rechazar(selected.id);
      setPropiedades((prev) => prev.filter((p) => p.id !== selected.id));
      showToast(`"${selected.titulo}" rechazada`, 'success');
      setSelected(null);
    } catch {
      showToast('Error al rechazar la propiedad', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePromote = async (nombre: string, valor: string, icono?: string) => {
    if (!promoteTarget) return;
    setPromoteLoading(true);
    try {
      const input: ItemCatalogoInput = {
        nombre,
        valor,
        tipo: promoteTarget.tipo,
        icono,
        activo: true,
      };
      await catalogService.crearFiltro(input);
      if (promoteTarget.tipo === 'SERVICIO') {
        setCatalogoServicios((prev) => new Set([...prev, valor]));
      } else {
        setCatalogoReglas((prev) => new Set([...prev, valor]));
      }
      showToast(`"${nombre}" agregado al catálogo`, 'success');
      setPromoteTarget(null);
    } catch {
      showToast('Error al promover al catálogo', 'error');
    } finally {
      setPromoteLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto animate-fade-in">

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold animate-fade-in',
            toast.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white',
          )}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 mb-1.5">
          Admin · Propiedades
        </p>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Inmuebles por revisar
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Aprueba o rechaza solicitudes de publicación. Los ítems en{' '}
          <span className="font-semibold text-amber-600">amber</span> son sugerencias del
          arrendador que aún no están en el catálogo.
        </p>
      </div>

      {/* Estado de carga */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
          <span className="material-symbols-outlined text-4xl animate-spin">autorenew</span>
          <p className="text-sm font-medium">Cargando solicitudes…</p>
        </div>
      )}

      {/* Estado vacío */}
      {!loading && propiedades.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-300">
          <span className="material-symbols-outlined text-5xl">inbox</span>
          <p className="text-sm font-semibold text-slate-400">Sin solicitudes pendientes</p>
          <p className="text-xs text-slate-300">Las nuevas publicaciones aparecerán aquí</p>
        </div>
      )}

      {/* Tabla */}
      {!loading && propiedades.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  ID
                </th>
                <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Propiedad
                </th>
                <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hidden md:table-cell">
                  Arrendador
                </th>
                <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hidden sm:table-cell">
                  Precio
                </th>
                <th className="text-center px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Custom
                </th>
                <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hidden lg:table-cell">
                  Fecha
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {propiedades.map((prop) => {
                const custom = hasCustomItems(prop, catalogoServicios, catalogoReglas);
                return (
                  <tr key={prop.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 text-xs font-mono text-slate-400">#{prop.id}</td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800 leading-tight">{prop.titulo}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">
                        {prop.direccion}
                      </p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="text-sm text-slate-600">
                        {prop.arrendadorNombre ?? `ID ${prop.arrendadorId}`}
                      </p>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <p className="text-sm font-semibold text-slate-700">
                        S/ {prop.precio?.toLocaleString('es-PE')}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {custom ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-700">
                          <span className="material-symbols-outlined text-[11px]">edit_note</span>
                          Sugeridos
                        </span>
                      ) : (
                        <span className="text-slate-200">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-xs text-slate-400">
                      {formatDate(prop.fechaCreacion)}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setSelected(prop)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-700 transition-colors"
                      >
                        Revisar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Panel lateral */}
      {selected && (
        <PropertyReviewPanel
          prop={selected}
          catalogoServicios={catalogoServicios}
          catalogoReglas={catalogoReglas}
          actionLoading={actionLoading}
          onClose={() => setSelected(null)}
          onAprobar={handleAprobar}
          onRechazar={handleRechazar}
          onPromote={(value, tipo) => setPromoteTarget({ value, tipo })}
        />
      )}

      {/* Modal de promoción */}
      {promoteTarget && (
        <PromoteDialog
          itemValue={promoteTarget.value}
          tipo={promoteTarget.tipo}
          loading={promoteLoading}
          onConfirm={handlePromote}
          onCancel={() => setPromoteTarget(null)}
        />
      )}
    </div>
  );
}
