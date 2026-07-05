'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { adminPropertyService, type PropiedadAdminDTO } from '@/services/admin-property-service';
import { ConfianzaSection } from '@/components/admin/confianza-section';
import { catalogosService } from '@/services/catalogos-service';
import { catalogService, type ItemCatalogoInput } from '@/services/catalog-service';
import { cn } from '@/lib/cn';
import { POLITICA_CANCELACION_INFO, POLITICAS_CANCELACION } from '@/lib/politica-cancelacion';
import type { PoliticaCancelacion } from '@/types/propiedad';

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
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
    </div>,
    document.body
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
  politicaLoading: boolean;
  onClose: () => void;
  onAprobar: () => void;
  onRechazar: () => void;
  onPromote: (value: string, tipo: 'SERVICIO' | 'REGLA') => void;
  onCambiarPolitica: (politica: PoliticaCancelacion) => void;
}

function PropertyReviewPanel({
  prop,
  catalogoServicios,
  catalogoReglas,
  actionLoading,
  politicaLoading,
  onClose,
  onAprobar,
  onRechazar,
  onPromote,
  onCambiarPolitica,
}: PropertyReviewPanelProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const servicios = resolveItemStatus(prop.serviciosIncluidos ?? [], catalogoServicios);
  const reglas = resolveItemStatus(prop.reglas ?? [], catalogoReglas);
  const hasCustomServicios = servicios.some((s) => s.isCustom);
  const hasCustomReglas = reglas.some((r) => r.isCustom);
  const isLoading = actionLoading === prop.id;

  if (!mounted) return null;

  return createPortal(
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

          {/* Confianza: señales de fraude/catfishing + denuncias (#46/#48/#50) */}
          <ConfianzaSection propiedadId={prop.id} />

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
              <p className="text-sm font-medium text-slate-600">
                {prop.tipoPropiedad ?? '—'}
                {prop.gestionPorHabitacion && (
                  <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                    Por habitaciones
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Piso / Área</p>
              <p className="text-sm font-medium text-slate-600">
                {prop.nroPiso != null ? `Piso ${prop.nroPiso}` : '—'}
                {prop.area != null ? ` · ${prop.area} m²` : ''}
              </p>
            </div>
            {(prop.numDormitorios != null || prop.numBanos != null || prop.capacidadPersonas != null) && (
              <div className="col-span-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Distribución</p>
                <p className="text-sm font-medium text-slate-600">
                  {[
                    prop.numDormitorios != null ? `${prop.numDormitorios} dorm.` : null,
                    prop.numBanos != null ? `${prop.numBanos} baño${prop.numBanos === 1 ? '' : 's'}` : null,
                    prop.capacidadPersonas != null ? `hasta ${prop.capacidadPersonas} pers.` : null,
                    prop.tieneSala ? 'sala' : null,
                    prop.tieneCocina ? 'cocina' : null,
                    prop.amoblado ? 'amoblado' : null,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
            )}
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

          {/* Política de cancelación (override de moderación) */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Política de cancelación
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {POLITICAS_CANCELACION.map((pol) => {
                const info = POLITICA_CANCELACION_INFO[pol];
                const activo = (prop.politicaCancelacion ?? 'FLEXIBLE') === pol;
                return (
                  <button
                    key={pol}
                    type="button"
                    onClick={() => onCambiarPolitica(pol)}
                    disabled={politicaLoading || activo}
                    title={info.descripcion}
                    className={cn(
                      'rounded-lg border px-2 py-2 text-left transition-colors',
                      activo
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-slate-200 hover:border-primary/50 disabled:opacity-50',
                    )}
                  >
                    <span className="block text-[11px] font-bold text-slate-800">{info.label}</span>
                    <span className="block text-[9px] leading-tight text-slate-400 mt-0.5">
                      {info.resumen}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Override de moderación. Solo afecta cancelaciones futuras.
            </p>
          </div>

          {/* Video */}
          {prop.videoUrl && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Video</p>
              <a
                href={prop.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-primary hover:bg-slate-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">smart_display</span>
                Ver video del aviso
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            </div>
          )}

          {/* Servicios que se pagan aparte */}
          {(() => {
            const aparte = (prop.servicios ?? [])
              .filter((s) => s.estado === 'APARTE')
              .map((s) => s.servicio);
            if (aparte.length === 0) return null;
            return (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Servicios que se pagan aparte
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {aparte.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 border border-amber-200 text-amber-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

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
    </div>,
    document.body
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
  const [politicaLoading, setPoliticaLoading] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState<{
    value: string;
    tipo: 'SERVICIO' | 'REGLA';
  } | null>(null);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [catalogoServicios, setCatalogoServicios] = useState<Set<string>>(new Set());
  const [catalogoReglas, setCatalogoReglas] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [customFilter, setCustomFilter] = useState<'ALL' | 'CUSTOM_ONLY' | 'STANDARD_ONLY'>('ALL');

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

  const handleCambiarPolitica = async (politica: PoliticaCancelacion) => {
    if (!selected || selected.politicaCancelacion === politica) return;
    setPoliticaLoading(true);
    try {
      await adminPropertyService.cambiarPoliticaCancelacion(selected.id, politica);
      setSelected((prev) => (prev ? { ...prev, politicaCancelacion: politica } : prev));
      setPropiedades((prev) =>
        prev.map((p) => (p.id === selected.id ? { ...p, politicaCancelacion: politica } : p)),
      );
      showToast(`Política cambiada a ${POLITICA_CANCELACION_INFO[politica].label}`, 'success');
    } catch {
      showToast('Error al cambiar la política', 'error');
    } finally {
      setPoliticaLoading(false);
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

  // Stats calculations
  const totalPendientes = propiedades.length;
  const sugeridasCount = propiedades.filter(p => hasCustomItems(p, catalogoServicios, catalogoReglas)).length;
  const aprobadasHoy = 18; // Mock value for visual context
  const rechazadasSemana = 5; // Mock value for visual context

  // Filter properties
  const filteredPropiedades = propiedades.filter((prop) => {
    // Search query match
    const matchSearch =
      !searchQuery.trim() ||
      prop.titulo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop.direccion?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prop.arrendadorNombre ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop.id?.toString().includes(searchQuery);

    // Custom items filter
    const isCustom = hasCustomItems(prop, catalogoServicios, catalogoReglas);
    const matchCustom =
      customFilter === 'ALL' ||
      (customFilter === 'CUSTOM_ONLY' && isCustom) ||
      (customFilter === 'STANDARD_ONLY' && !isCustom);

    return matchSearch && matchCustom;
  });

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto animate-fade-in space-y-8">

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-2 border-b border-slate-100">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#c14b4c] mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c14b4c]" />
            Panel Master
          </p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
            Inmuebles por revisar
          </h1>
          <p className="text-xs text-slate-500 mt-2 max-w-2xl leading-relaxed">
            Audita y gestiona las solicitudes de publicación. Los ítems marcados en{' '}
            <span className="font-bold text-amber-600">Ámbar</span> representan sugerencias personalizadas de servicios o reglas introducidas por el arrendador que requieren homologación en el catálogo.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Por revisar</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1">{totalPendientes}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Solicitudes activas</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform shrink-0 ml-3">
              <span className="material-symbols-outlined text-xl">home_work</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Sugerencias</p>
              <h3 className="text-2xl font-black text-amber-600 tracking-tight mt-1">{sugeridasCount}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Ítems fuera de catálogo</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform shrink-0 ml-3">
              <span className="material-symbols-outlined text-xl">edit_note</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Aprobadas hoy</p>
              <h3 className="text-2xl font-black text-green-600 tracking-tight mt-1">{aprobadasHoy}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Publicaciones listas</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-green-50 text-green-500 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform shrink-0 ml-3">
              <span className="material-symbols-outlined text-xl">check_circle</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Rechazadas</p>
              <h3 className="text-2xl font-black text-red-500 tracking-tight mt-1">{rechazadasSemana}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Esta semana</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform shrink-0 ml-3">
              <span className="material-symbols-outlined text-xl">cancel</span>
            </div>
          </div>
        </div>
      )}

      {/* Control Bar (Buscador y Filtros) */}
      {!loading && propiedades.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
          <div className="relative w-full md:max-w-xs shrink-0">
            <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por ID, título, arrendador..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#c14b4c]/20 focus:border-[#c14b4c] text-xs transition-all shadow-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex bg-white rounded-xl border border-slate-200 p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setCustomFilter('ALL')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  customFilter === 'ALL'
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setCustomFilter('CUSTOM_ONLY')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                  customFilter === 'CUSTOM_ONLY'
                    ? "bg-[#c14b4c] text-white"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Con sugerencias
              </button>
              <button
                type="button"
                onClick={() => setCustomFilter('STANDARD_ONLY')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  customFilter === 'STANDARD_ONLY'
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Estándar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info de resultados filtrados */}
      {!loading && propiedades.length > 0 && (
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex justify-between items-center px-1">
          <span>Mostrando {filteredPropiedades.length} de {propiedades.length} solicitudes</span>
          {(searchQuery || customFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCustomFilter('ALL');
              }}
              className="text-[#c14b4c] hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Estado de carga */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-28 gap-4 text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <span className="material-symbols-outlined text-4xl animate-spin text-[#c14b4c]">autorenew</span>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Cargando solicitudes…</p>
        </div>
      )}

      {/* Estado vacío original */}
      {!loading && propiedades.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-300 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <span className="material-symbols-outlined text-5xl">inbox</span>
          <p className="text-sm font-semibold text-slate-400">Sin solicitudes pendientes</p>
          <p className="text-xs text-slate-300">Las nuevas publicaciones aparecerán aquí</p>
        </div>
      )}

      {/* Estado vacío por filtros/búsqueda */}
      {!loading && propiedades.length > 0 && filteredPropiedades.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-4 border border-slate-100 shadow-inner">
            <span className="material-symbols-outlined text-3xl">search_off</span>
          </div>
          <h4 className="text-sm font-black text-slate-800 tracking-tight uppercase">Sin resultados</h4>
          <p className="text-xs text-slate-400 max-w-xs mt-2 leading-relaxed">
            No encontramos ningún inmueble que coincida con "{searchQuery}" o con el filtro seleccionado.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setCustomFilter('ALL');
            }}
            className="mt-5 px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-[0.97]"
          >
            Restaurar filtros
          </button>
        </div>
      )}

      {/* Tabla */}
      {!loading && filteredPropiedades.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  ID
                </th>
                <th className="text-left px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Propiedad
                </th>
                <th className="text-left px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hidden md:table-cell">
                  Arrendador
                </th>
                <th className="text-left px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hidden sm:table-cell">
                  Precio
                </th>
                <th className="text-center px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Custom
                </th>
                <th className="text-left px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hidden lg:table-cell">
                  Fecha
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPropiedades.map((prop) => {
                const custom = hasCustomItems(prop, catalogoServicios, catalogoReglas);
                return (
                  <tr key={prop.id} className="hover:bg-slate-50/40 transition-colors group">
                    <td className="px-5 py-4 text-xs font-mono text-slate-400">#{prop.id}</td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800 leading-tight group-hover:text-[#c14b4c] transition-colors">{prop.titulo}</p>
                      <p className="text-xs text-slate-400 mt-1 truncate max-w-[220px]">
                        {prop.direccion}
                      </p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="text-xs font-bold text-slate-600 capitalize">
                        {prop.arrendadorNombre ?? `ID ${prop.arrendadorId}`}
                      </p>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <p className="text-sm font-black text-slate-800">
                        S/ {prop.precio?.toLocaleString('es-PE')}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {custom ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 border border-amber-100 text-amber-700">
                          <span className="material-symbols-outlined text-[12px]">edit_note</span>
                          Sugeridos
                        </span>
                      ) : (
                        <span className="text-slate-200">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-xs text-slate-400 font-medium">
                      {formatDate(prop.fechaCreacion)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setSelected(prop)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white text-[10px] font-black uppercase tracking-wider hover:from-[#c14b4c] hover:to-[#8f0304] hover:shadow-[0_4px_12px_rgba(193,75,76,0.2)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
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
          politicaLoading={politicaLoading}
          onClose={() => setSelected(null)}
          onAprobar={handleAprobar}
          onRechazar={handleRechazar}
          onPromote={(value, tipo) => setPromoteTarget({ value, tipo })}
          onCambiarPolitica={handleCambiarPolitica}
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
