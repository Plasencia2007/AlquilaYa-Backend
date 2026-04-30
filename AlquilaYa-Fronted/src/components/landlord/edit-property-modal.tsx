'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/legacy-button';
import { propiedadService } from '@/services/landlord-property-service';
import {
  catalogosService,
  type CatalogosActivos,
  type ItemCatalogo,
} from '@/services/catalogos-service';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/cn';
import type { PropiedadUpdate } from '@/types/propiedad';

/* ── Icon mapper (FA → Material Symbols) ──────────────────── */
const FA_TO_MATERIAL: Record<string, string> = {
  'fa-wifi': 'wifi', 'fa-tint': 'water_drop', 'fa-bolt': 'bolt',
  'fa-lightbulb': 'lightbulb', 'fa-tshirt': 'checkroom', 'fa-shirt': 'checkroom',
  'fa-utensils': 'restaurant', 'fa-key': 'key', 'fa-shower': 'shower',
  'fa-bath': 'bathtub', 'fa-tv': 'tv', 'fa-snowflake': 'ac_unit',
  'fa-parking': 'local_parking', 'fa-bus': 'directions_bus', 'fa-lock': 'lock',
  'fa-couch': 'weekend', 'fa-bed': 'bed', 'fa-dumbbell': 'fitness_center',
  'fa-broom': 'cleaning_services', 'fa-shield-alt': 'security',
  'fa-paw': 'pets', 'fa-dog': 'pets', 'fa-smoking-ban': 'smoke_free',
  'fa-smoking': 'smoking_rooms', 'fa-graduation-cap': 'school',
  'fa-music': 'music_note', 'fa-glass-martini': 'local_bar',
  'fa-cocktail': 'local_bar', 'fa-beer': 'sports_bar',
  'fa-volume-up': 'volume_up', 'fa-user-friends': 'group', 'fa-users': 'group',
  'fa-ban': 'block', 'fa-check': 'check_circle', 'fa-times': 'cancel',
  'fa-home': 'home', 'fa-building': 'apartment', 'fa-hotel': 'hotel',
  'fa-calendar-alt': 'calendar_month', 'fa-calendar': 'calendar_today',
  'fa-calendar-day': 'today', 'fa-repeat': 'event_repeat',
};
function resolveIcon(icon: string | undefined) {
  if (!icon) return undefined;
  const k = icon.toLowerCase().trim();
  if (k.startsWith('fa-')) return FA_TO_MATERIAL[k] ?? 'label';
  return icon;
}

/* ── ChipsMultiselect ─────────────────────────────────────── */
function ChipsMultiselect({
  items,
  selected,
  onToggle,
}: {
  items: ItemCatalogo[];
  selected: string[];
  onToggle: (valor: string) => void;
}) {
  if (!items.length)
    return <p className="text-xs text-muted-foreground italic">Sin opciones disponibles.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isOn = selected.includes(item.valor);
        return (
          <button
            key={item.id ?? item.valor}
            type="button"
            onClick={() => onToggle(item.valor)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold border transition-all',
              isOn
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-foreground border-border hover:border-primary/60 hover:text-primary',
            )}
          >
            {resolveIcon(item.icono) && (
              <span className="material-symbols-outlined text-[13px]">{resolveIcon(item.icono)}</span>
            )}
            {item.nombre}
            {isOn && <span className="material-symbols-outlined text-[11px] ml-0.5">check</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ── CustomItemInput ──────────────────────────────────────── */
function CustomItemInput({
  items,
  onAdd,
  onRemove,
  placeholder = 'Escribe y presiona Enter…',
  maxItems = 3,
  maxChars = 60,
}: {
  items: string[];
  onAdd: (text: string) => void;
  onRemove: (text: string) => void;
  placeholder?: string;
  maxItems?: number;
  maxChars?: number;
}) {
  const [val, setVal] = useState('');
  const canAdd = items.length < maxItems;
  const commit = () => {
    const v = val.trim();
    if (!v || v.length > maxChars || !canAdd) return;
    if (items.some((i) => i.toLowerCase() === v.toLowerCase())) return;
    onAdd(v);
    setVal('');
  };
  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold bg-amber-50 border border-amber-200 text-amber-800"
            >
              <span className="material-symbols-outlined text-[12px]">edit_note</span>
              {item}
              <button type="button" onClick={() => onRemove(item)} className="ml-0.5 hover:text-amber-600">
                <span className="material-symbols-outlined text-[11px]">close</span>
              </button>
            </span>
          ))}
        </div>
      )}
      {canAdd && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
              maxLength={maxChars}
              placeholder={placeholder}
              className="w-full bg-input border border-border rounded-xl text-sm text-foreground py-2.5 px-4 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground/50"
            />
          </div>
          <button
            type="button"
            onClick={commit}
            disabled={!val.trim()}
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Types ────────────────────────────────────────────────── */
type PropiedadItem = {
  id: number | string;
  titulo: string;
  precio: number;
  direccion: string;
  estado: string;
  imagenUrl?: string;
};
type ImagenExistente = { id: number; url: string };

interface EditPropertyModalProps {
  prop: PropiedadItem | null;
  onClose: () => void;
  onSaved: () => void;
}

type Tab = 'info' | 'servicios' | 'fotos';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'info',      label: 'Información', icon: 'info' },
  { id: 'servicios', label: 'Servicios',   icon: 'checklist' },
  { id: 'fotos',     label: 'Fotos',       icon: 'photo_library' },
];

const EMPTY_FORM: PropiedadUpdate = {
  titulo: '', descripcion: '', precio: 0, direccion: '',
  tipoPropiedad: '', periodoAlquiler: '',
  area: undefined, nroPiso: undefined, estaDisponible: true,
  disponibleDesde: '', serviciosIncluidos: [], reglas: [],
};

/* ── Component ────────────────────────────────────────────── */
export function EditPropertyModal({ prop, onClose, onSaved }: EditPropertyModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PropiedadUpdate>(EMPTY_FORM);
  const [catalogos, setCatalogos] = useState<CatalogosActivos | null>(null);
  const [imagenesExistentes, setImagenesExistentes] = useState<ImagenExistente[]>([]);
  const [imagenesParaEliminar, setImagenesParaEliminar] = useState<number[]>([]);
  const [imagenesNuevas, setImagenesNuevas] = useState<File[]>([]);
  const [previewNuevas, setPreviewNuevas] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Catálogos */
  useEffect(() => {
    catalogosService.obtenerActivos().then(setCatalogos).catch(() => null);
  }, []);

  const tiposOptions = useMemo(() => {
    const c = catalogos?.TIPO_CUARTO ?? [];
    return c.length ? c.map((i) => ({ value: i.valor, label: i.nombre })) : [
      { value: 'CUARTO_INDIVIDUAL', label: 'Cuarto individual' },
      { value: 'CUARTO_COMPARTIDO', label: 'Cuarto compartido' },
      { value: 'DEPARTAMENTO',      label: 'Departamento' },
      { value: 'SUITE',             label: 'Suite' },
    ];
  }, [catalogos]);

  const periodosOptions = useMemo(() => {
    const c = catalogos?.PERIODO_ALQUILER ?? [];
    return c.length ? c.map((i) => ({ value: i.valor, label: i.nombre })) : [
      { value: 'DIARIO',    label: 'Diario' },
      { value: 'MENSUAL',   label: 'Mensual' },
      { value: 'SEMESTRAL', label: 'Semestral' },
      { value: 'ANUAL',     label: 'Anual' },
    ];
  }, [catalogos]);

  const serviciosCatalogo = catalogos?.SERVICIO ?? [];
  const reglasCatalogo    = catalogos?.REGLA    ?? [];

  /* Ítems personalizados = valores no presentes en el catálogo */
  const serviciosCustom = (form.serviciosIncluidos ?? []).filter(
    (v) => !serviciosCatalogo.some((c) => c.valor === v),
  );
  const reglasCustom = (form.reglas ?? []).filter(
    (v) => !reglasCatalogo.some((c) => c.valor === v),
  );

  /* Toggle chip catálogo */
  const toggleServicio = (valor: string) =>
    setForm((p) => {
      const cur = p.serviciosIncluidos ?? [];
      return { ...p, serviciosIncluidos: cur.includes(valor) ? cur.filter((x) => x !== valor) : [...cur, valor] };
    });
  const toggleRegla = (valor: string) =>
    setForm((p) => {
      const cur = p.reglas ?? [];
      return { ...p, reglas: cur.includes(valor) ? cur.filter((x) => x !== valor) : [...cur, valor] };
    });

  /* Cargar propiedad */
  useEffect(() => {
    if (!prop) return;
    setActiveTab('info');
    setImagenesParaEliminar([]);
    setImagenesNuevas([]);
    setPreviewNuevas([]);
    setForm(EMPTY_FORM);
    setImagenesExistentes([]);

    const load = async () => {
      setLoading(true);
      try {
        const [completo, imagenes] = await Promise.all([
          propiedadService.obtenerCompleto(prop.id),
          propiedadService.obtenerImagenes(prop.id),
        ]);
        setForm({
          titulo:             completo.titulo ?? '',
          descripcion:        completo.descripcion ?? '',
          precio:             completo.precio ?? 0,
          direccion:          completo.direccion ?? '',
          tipoPropiedad:      completo.tipoPropiedad ?? '',
          periodoAlquiler:    completo.periodoAlquiler ?? '',
          area:               completo.area,
          nroPiso:            completo.nroPiso,
          estaDisponible:     completo.estaDisponible ?? true,
          disponibleDesde:    completo.disponibleDesde ?? '',
          serviciosIncluidos: completo.serviciosIncluidos ?? [],
          reglas:             completo.reglas ?? [],
        });
        if (imagenes.length > 0) {
          setImagenesExistentes(imagenes);
        } else {
          setImagenesExistentes(completo.imagenes?.map((url, i) => ({ id: -(i + 1), url })) ?? []);
        }
      } catch (err) {
        notify.error(err, 'No se pudo cargar la propiedad');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [prop]);

  const set = (field: keyof PropiedadUpdate, value: unknown) =>
    setForm((p) => ({ ...p, [field]: value }));

  const toggleEliminarImagen = (id: number) => {
    if (id < 0) return;
    setImagenesParaEliminar((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  };

  const handleNuevasImagenes = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => {
      setImagenesNuevas((p) => [...p, f]);
      setPreviewNuevas((p) => [...p, URL.createObjectURL(f)]);
    });
  };

  const quitarNueva = (idx: number) => {
    URL.revokeObjectURL(previewNuevas[idx]);
    setImagenesNuevas((p) => p.filter((_, i) => i !== idx));
    setPreviewNuevas((p) => p.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!prop) return;
    if (!form.titulo?.trim() || !form.precio || !form.direccion?.trim()) {
      notify.error(null, 'Título, precio y dirección son obligatorios');
      return;
    }
    try {
      setSaving(true);
      await propiedadService.actualizar(prop.id, {
        ...form,
        precio:          Number(form.precio),
        area:            form.area    ? Number(form.area)   : undefined,
        nroPiso:         form.nroPiso ? Number(form.nroPiso): undefined,
        tipoPropiedad:   form.tipoPropiedad   || undefined,
        periodoAlquiler: form.periodoAlquiler  || undefined,
        disponibleDesde: form.disponibleDesde  || undefined,
      });
      if (imagenesParaEliminar.length > 0)
        await Promise.all(imagenesParaEliminar.map((id) => propiedadService.eliminarImagen(prop.id, id)));
      if (imagenesNuevas.length > 0)
        await propiedadService.subirImagenes(prop.id, imagenesNuevas);
      notify.success('Propiedad actualizada');
      onSaved();
      onClose();
    } catch (err) {
      notify.error(err, 'No se pudo guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  /* ── Estilos comunes ──────────────────────────────────────── */
  const inputCls = 'w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-card-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground';
  const selectCls = 'w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-card-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer';
  const labelCls = 'block text-[11px] font-bold text-muted-foreground mb-1.5 uppercase tracking-widest';
  const sectionTitleCls = 'flex items-center gap-2 text-xs font-bold text-foreground mb-3';

  return (
    <Modal
      open={!!prop}
      onClose={saving ? () => null : onClose}
      title=""
      size="lg"
      showCloseButton={false}
      className="max-w-3xl p-0 overflow-hidden"
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="bg-primary px-6 pt-5 pb-0">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <p className="text-primary-foreground/60 text-[11px] font-bold uppercase tracking-widest mb-0.5">
              Editar propiedad
            </p>
            <h2 className="text-primary-foreground font-black text-xl leading-tight line-clamp-1">
              {prop?.titulo ?? ''}
            </h2>
          </div>
          <button
            type="button"
            onClick={saving ? undefined : onClose}
            disabled={saving}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/35 text-white transition-colors mt-0.5"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const badge =
              tab.id === 'fotos' && (imagenesParaEliminar.length > 0 || imagenesNuevas.length > 0)
                ? imagenesNuevas.length > 0 ? `+${imagenesNuevas.length}` : `-${imagenesParaEliminar.length}`
                : null;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-bold rounded-t-xl transition-all',
                  activeTab === tab.id
                    ? 'bg-background text-primary'
                    : 'text-white/70 hover:text-white hover:bg-white/10',
                )}
              >
                <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
                {tab.label}
                {badge && (
                  <span className="bg-destructive text-destructive-foreground text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="px-6 py-5 overflow-y-auto max-h-[62vh] bg-background">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground font-medium">Cargando datos…</p>
          </div>

        ) : activeTab === 'info' ? (
          /* ── Tab Información ──────────────────────────────── */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="sm:col-span-2">
              <label className={labelCls}>Título *</label>
              <input className={inputCls} value={form.titulo ?? ''} onChange={(e) => set('titulo', e.target.value)} placeholder="Ej: Cuarto amplio cerca a UPeU" />
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Descripción</label>
              <textarea className={`${inputCls} resize-none`} rows={3} value={form.descripcion ?? ''} onChange={(e) => set('descripcion', e.target.value)} placeholder="Describe el cuarto, ambiente, ventajas…" />
            </div>

            <div>
              <label className={labelCls}>Precio mensual (S/) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold select-none">S/</span>
                <input type="number" min={0} className={`${inputCls} pl-9`} value={form.precio ?? ''} onChange={(e) => set('precio', e.target.value)} placeholder="0" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Área (m²)</label>
              <input type="number" min={0} className={inputCls} value={form.area ?? ''} onChange={(e) => set('area', e.target.value || undefined)} placeholder="Ej: 18" />
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Dirección *</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">location_on</span>
                <input className={`${inputCls} pl-9`} value={form.direccion ?? ''} onChange={(e) => set('direccion', e.target.value)} placeholder="Jr. Los Estudiantes 123, Ñaña" />
              </div>
            </div>

            {/* Tipo de propiedad */}
            <div>
              <label className={labelCls}>Tipo de propiedad</label>
              <div className="relative">
                <select className={selectCls} value={form.tipoPropiedad ?? ''} onChange={(e) => set('tipoPropiedad', e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {tiposOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">expand_more</span>
              </div>
            </div>

            {/* Período de alquiler */}
            <div>
              <label className={labelCls}>Período de alquiler</label>
              <div className="relative">
                <select className={selectCls} value={form.periodoAlquiler ?? ''} onChange={(e) => set('periodoAlquiler', e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {periodosOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">expand_more</span>
              </div>
            </div>

            <div>
              <label className={labelCls}>Número de piso</label>
              <input type="number" min={0} className={inputCls} value={form.nroPiso ?? ''} onChange={(e) => set('nroPiso', e.target.value || undefined)} placeholder="Ej: 2" />
            </div>

            <div>
              <label className={labelCls}>Disponible desde</label>
              <input type="date" className={inputCls} value={form.disponibleDesde ?? ''} onChange={(e) => set('disponibleDesde', e.target.value)} />
            </div>

            {/* Switch disponible */}
            <div className="sm:col-span-2 flex items-center gap-3 pt-1 pb-1">
              <button
                type="button"
                role="switch"
                aria-checked={form.estaDisponible}
                onClick={() => set('estaDisponible', !form.estaDisponible)}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                  form.estaDisponible ? 'bg-primary' : 'bg-muted',
                )}
              >
                <span className={cn('pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200', form.estaDisponible ? 'translate-x-5' : 'translate-x-0')} />
              </button>
              <div>
                <p className="text-sm font-bold text-card-foreground">Disponible para alquiler</p>
                <p className="text-xs text-muted-foreground">{form.estaDisponible ? 'Visible en búsquedas' : 'Oculto de búsquedas'}</p>
              </div>
            </div>
          </div>

        ) : activeTab === 'servicios' ? (
          /* ── Tab Servicios & Reglas ───────────────────────── */
          <div className="space-y-6">

            {/* Servicios incluidos */}
            <div>
              <p className={sectionTitleCls}>
                <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                Servicios incluidos
              </p>
              <ChipsMultiselect
                items={serviciosCatalogo}
                selected={form.serviciosIncluidos ?? []}
                onToggle={toggleServicio}
              />
              {serviciosCatalogo.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] text-muted-foreground mb-2 font-medium">Agregar servicio personalizado:</p>
                  <CustomItemInput
                    items={serviciosCustom}
                    onAdd={(txt) => setForm((p) => ({ ...p, serviciosIncluidos: [...(p.serviciosIncluidos ?? []), txt] }))}
                    onRemove={(txt) => setForm((p) => ({ ...p, serviciosIncluidos: (p.serviciosIncluidos ?? []).filter((x) => x !== txt) }))}
                    placeholder="Ej: Agua caliente 24h…"
                  />
                </div>
              )}
            </div>

            <div className="h-px bg-border" />

            {/* Reglas de la casa */}
            <div>
              <p className={sectionTitleCls}>
                <span className="material-symbols-outlined text-[16px] text-primary">gavel</span>
                Reglas de la casa
              </p>
              <ChipsMultiselect
                items={reglasCatalogo}
                selected={form.reglas ?? []}
                onToggle={toggleRegla}
              />
              {reglasCatalogo.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] text-muted-foreground mb-2 font-medium">Agregar regla personalizada:</p>
                  <CustomItemInput
                    items={reglasCustom}
                    onAdd={(txt) => setForm((p) => ({ ...p, reglas: [...(p.reglas ?? []), txt] }))}
                    onRemove={(txt) => setForm((p) => ({ ...p, reglas: (p.reglas ?? []).filter((x) => x !== txt) }))}
                    placeholder="Ej: No mascotas grandes…"
                  />
                </div>
              )}
            </div>
          </div>

        ) : (
          /* ── Tab Fotos ────────────────────────────────────── */
          <div className="space-y-5">
            {imagenesExistentes.length > 0 && (
              <div>
                <p className={labelCls}>Fotos actuales</p>
                <div className="grid grid-cols-3 gap-3">
                  {imagenesExistentes.map((img) => {
                    const marcada = imagenesParaEliminar.includes(img.id);
                    const sinId = img.id < 0;
                    return (
                      <div key={img.id} className="relative group/img aspect-square rounded-2xl overflow-hidden bg-muted">
                        <img src={img.url} alt="foto" className={cn('w-full h-full object-cover transition-all duration-300', marcada ? 'opacity-30 scale-95' : 'group-hover/img:scale-105')} />
                        {!sinId && (
                          <button
                            type="button"
                            onClick={() => toggleEliminarImagen(img.id)}
                            className={cn('absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-all', marcada ? 'bg-destructive text-destructive-foreground scale-110' : 'bg-card/90 text-card-foreground opacity-0 group-hover/img:opacity-100')}
                          >
                            <span className="material-symbols-outlined text-[15px]">{marcada ? 'undo' : 'delete'}</span>
                          </button>
                        )}
                        {marcada && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="bg-destructive/90 text-destructive-foreground text-[10px] font-black px-2 py-0.5 rounded-full">SE ELIMINARÁ</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {previewNuevas.length > 0 && (
              <div>
                <p className={labelCls}>Nuevas fotos a subir</p>
                <div className="grid grid-cols-3 gap-3">
                  {previewNuevas.map((url, idx) => (
                    <div key={url} className="relative group/new aspect-square rounded-2xl overflow-hidden ring-2 ring-primary">
                      <img src={url} alt="nueva" className="w-full h-full object-cover transition-transform group-hover/new:scale-105" />
                      <div className="absolute top-2 left-2">
                        <span className="bg-primary text-primary-foreground text-[10px] font-black px-2 py-0.5 rounded-full">NUEVA</span>
                      </div>
                      <button type="button" onClick={() => quitarNueva(idx)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-card/90 text-card-foreground flex items-center justify-center shadow-lg opacity-0 group-hover/new:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-[15px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleNuevasImagenes(e.target.files)} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-primary/30 rounded-2xl py-8 flex flex-col items-center gap-2 hover:border-primary hover:bg-accent transition-all group/upload"
              >
                <div className="w-12 h-12 rounded-full bg-accent group-hover/upload:bg-primary/10 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-primary text-[24px]">add_photo_alternate</span>
                </div>
                <p className="text-sm font-bold text-primary">Agregar fotos</p>
                <p className="text-xs text-muted-foreground">JPG, PNG o WEBP · Máximo 10 MB c/u</p>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3 bg-card">
        <p className="text-xs text-muted-foreground hidden sm:block">
          {activeTab === 'info'      && '* Campos obligatorios'}
          {activeTab === 'servicios' && `${(form.serviciosIncluidos ?? []).length} servicio(s) · ${(form.reglas ?? []).length} regla(s)`}
          {activeTab === 'fotos'     && `${imagenesExistentes.length - imagenesParaEliminar.length + imagenesNuevas.length} foto(s) quedarán`}
        </p>
        <div className="flex gap-2 ml-auto">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving} className="rounded-xl px-5">
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={saving || loading} variant="primary" className="rounded-xl px-6">
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                Guardando…
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">check</span>
                Guardar cambios
              </span>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
