'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/legacy-button';
import { RoomManager } from '@/components/landlord/room-manager';
import { propiedadService } from '@/services/landlord-property-service';
import {
  catalogosService,
  type CatalogosActivos,
  type ItemCatalogo,
} from '@/services/catalogos-service';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/cn';
import { POLITICA_CANCELACION_INFO, POLITICAS_CANCELACION } from '@/lib/politica-cancelacion';
import type { PrecioTemporada, PropiedadUpdate } from '@/types/propiedad';

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

const MAX_FOTOS = 6;

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'info',      label: 'Información', icon: 'info' },
  { id: 'servicios', label: 'Servicios',   icon: 'checklist' },
  { id: 'fotos',     label: 'Fotos',       icon: 'photo_library' },
];

const EMPTY_FORM: PropiedadUpdate = {
  titulo: '', descripcion: '', precio: 0, direccion: '',
  tipoPropiedad: '', periodoAlquiler: '',
  area: undefined, nroPiso: undefined, estaDisponible: true,
  numDormitorios: undefined, numBanos: undefined, capacidadPersonas: undefined,
  tieneSala: false, tieneCocina: false, amoblado: false,
  gestionPorHabitacion: false,
  disponibleDesde: '', videoUrl: '', politicaCancelacion: 'FLEXIBLE', serviciosIncluidos: [], reglas: [],
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
  /** URLs externas pendientes de adjuntar (se aplican al guardar). */
  const [imageUrlsNuevas, setImageUrlsNuevas] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  /** El arrendador reordenó las fotos existentes (se persiste al guardar). */
  const [ordenCambiado, setOrdenCambiado] = useState(false);
  /** Precios por temporada (se gestionan en caliente, con sus propios endpoints). */
  const [temporadas, setTemporadas] = useState<PrecioTemporada[]>([]);
  const [tForm, setTForm] = useState({ fechaInicio: '', fechaFin: '', precio: '', etiqueta: '' });
  const [tBusy, setTBusy] = useState(false);
  // Servicios que se pagan aparte (estado separado del form, que solo guarda los incluidos).
  const [serviciosAparte, setServiciosAparte] = useState<string[]>([]);
  // Snapshot del formulario al cargar, para detectar cambios sin guardar al cerrar.
  const baselineRef = useRef<string>('');
  const serviciosAparteBaseRef = useRef<string>('');
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
      { value: 'MINI_DEPA',         label: 'Mini depa' },
      { value: 'CASA',              label: 'Casa' },
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
  const toggleServicio = (valor: string) => {
    setForm((p) => {
      const cur = p.serviciosIncluidos ?? [];
      return { ...p, serviciosIncluidos: cur.includes(valor) ? cur.filter((x) => x !== valor) : [...cur, valor] };
    });
    setServiciosAparte((a) => a.filter((x) => x !== valor)); // no puede estar incluido y aparte
  };
  const toggleServicioAparte = (valor: string) => {
    setServiciosAparte((a) => (a.includes(valor) ? a.filter((x) => x !== valor) : [...a, valor]));
    setForm((p) => ({ ...p, serviciosIncluidos: (p.serviciosIncluidos ?? []).filter((x) => x !== valor) }));
  };
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
    setImageUrlsNuevas([]);
    setUrlInput('');
    setOrdenCambiado(false);
    setForm(EMPTY_FORM);
    setImagenesExistentes([]);

    const load = async () => {
      setLoading(true);
      try {
        const [completo, imagenes, temps] = await Promise.all([
          propiedadService.obtenerCompleto(prop.id),
          propiedadService.obtenerImagenes(prop.id),
          propiedadService.listarTemporadas(prop.id).catch(() => [] as PrecioTemporada[]),
        ]);
        setTemporadas(temps);
        const cargado: PropiedadUpdate = {
          titulo:             completo.titulo ?? '',
          descripcion:        completo.descripcion ?? '',
          precio:             completo.precio ?? 0,
          direccion:          completo.direccion ?? '',
          tipoPropiedad:      completo.tipoPropiedad ?? '',
          periodoAlquiler:    completo.periodoAlquiler ?? '',
          area:               completo.area,
          nroPiso:            completo.nroPiso,
          numDormitorios:     completo.numDormitorios,
          numBanos:           completo.numBanos,
          capacidadPersonas:  completo.capacidadPersonas,
          tieneSala:          completo.tieneSala ?? false,
          tieneCocina:        completo.tieneCocina ?? false,
          amoblado:           completo.amoblado ?? false,
          gestionPorHabitacion: completo.gestionPorHabitacion ?? false,
          estaDisponible:     completo.estaDisponible ?? true,
          disponibleDesde:    completo.disponibleDesde ?? '',
          videoUrl:           completo.videoUrl ?? '',
          politicaCancelacion: completo.politicaCancelacion ?? 'FLEXIBLE',
          serviciosIncluidos:
            completo.servicios?.filter((s) => s.estado === 'INCLUIDO').map((s) => s.servicio)
            ?? completo.serviciosIncluidos ?? [],
          reglas:             completo.reglas ?? [],
        };
        setForm(cargado);
        const aparteList = completo.servicios?.filter((s) => s.estado === 'APARTE').map((s) => s.servicio) ?? [];
        setServiciosAparte(aparteList);
        serviciosAparteBaseRef.current = JSON.stringify(aparteList);
        baselineRef.current = JSON.stringify(cargado);
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

  // Inmueble completo (departamento/mini depa/casa): distribución obligatoria.
  const esInmuebleCompleto = ['DEPARTAMENTO', 'MINI_DEPA', 'CASA'].includes(form.tipoPropiedad ?? '');

  // ── Guard de cambios sin guardar ──
  const hayCambios = useCallback(() => {
    const formCambiado = baselineRef.current !== '' && JSON.stringify(form) !== baselineRef.current;
    const aparteCambiado =
      serviciosAparteBaseRef.current !== '' && JSON.stringify(serviciosAparte) !== serviciosAparteBaseRef.current;
    return (
      formCambiado ||
      aparteCambiado ||
      imagenesNuevas.length > 0 ||
      imagenesParaEliminar.length > 0 ||
      imageUrlsNuevas.length > 0 ||
      ordenCambiado
    );
  }, [form, serviciosAparte, imagenesNuevas, imagenesParaEliminar, imageUrlsNuevas, ordenCambiado]);

  /** Valida un enlace DIRECTO a imagen (https + extensión). Refleja al backend. */
  const esUrlImagenDirecta = (url: string): boolean => {
    try {
      const u = new URL(url);
      return u.protocol === 'https:' && /\.(jpe?g|png|webp|gif|avif)$/i.test(u.pathname);
    } catch {
      return false;
    }
  };

  const agregarImagenUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (totalFotos() >= MAX_FOTOS) {
      notify.error(null, `Máximo ${MAX_FOTOS} fotos.`);
      return;
    }
    if (!esUrlImagenDirecta(url)) {
      notify.error(
        null,
        'Pega un enlace DIRECTO a una imagen (.jpg/.png/.webp). Los de Google/Drive no sirven.',
      );
      return;
    }
    setImageUrlsNuevas((prev) => [...prev, url]);
    setUrlInput('');
  };

  const intentarCerrar = useCallback(() => {
    if (saving) return;
    if (hayCambios() && !window.confirm('Tienes cambios sin guardar. ¿Descartarlos y cerrar?')) return;
    onClose();
  }, [saving, hayCambios, onClose]);

  // Avisar al refrescar/cerrar la pestaña con cambios pendientes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hayCambios()) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hayCambios]);

  const toggleEliminarImagen = (id: number) => {
    if (id < 0) return;
    setImagenesParaEliminar((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  };

  /** Mueve una foto existente una posición arriba (-1) o abajo (+1). */
  const moverImagenExistente = (idx: number, dir: -1 | 1) => {
    const destino = idx + dir;
    setImagenesExistentes((prev) => {
      if (destino < 0 || destino >= prev.length) return prev;
      const next = prev.slice();
      [next[idx], next[destino]] = [next[destino], next[idx]];
      return next;
    });
    setOrdenCambiado(true);
  };

  const agregarTemporada = async () => {
    if (!prop?.id) return;
    const precio = parseFloat(tForm.precio);
    if (!tForm.fechaInicio || !tForm.fechaFin || tForm.fechaFin < tForm.fechaInicio) {
      notify.error(null, 'Indica un rango de fechas válido.');
      return;
    }
    if (Number.isNaN(precio) || precio <= 0) {
      notify.error(null, 'Indica un precio mayor a 0.');
      return;
    }
    setTBusy(true);
    try {
      await propiedadService.crearTemporada(prop.id, {
        fechaInicio: tForm.fechaInicio,
        fechaFin: tForm.fechaFin,
        precio,
        etiqueta: tForm.etiqueta.trim() || undefined,
      });
      const lista = await propiedadService.listarTemporadas(prop.id);
      setTemporadas(lista);
      setTForm({ fechaInicio: '', fechaFin: '', precio: '', etiqueta: '' });
      notify.success('Temporada agregada');
    } catch (err) {
      notify.error(err, 'No se pudo agregar la temporada');
    } finally {
      setTBusy(false);
    }
  };

  const eliminarTemporada = async (tid: number) => {
    if (!prop?.id) return;
    setTBusy(true);
    try {
      await propiedadService.eliminarTemporada(prop.id, tid);
      setTemporadas((prev) => prev.filter((t) => t.id !== tid));
    } catch (err) {
      notify.error(err, 'No se pudo eliminar la temporada');
    } finally {
      setTBusy(false);
    }
  };

  /** Mueve una foto existente al frente (posición 0 = portada). */
  const hacerPortadaExistente = (idx: number) => {
    if (idx === 0) return;
    setImagenesExistentes((prev) => {
      const next = prev.slice();
      const [moved] = next.splice(idx, 1);
      next.unshift(moved);
      return next;
    });
    setOrdenCambiado(true);
  };

  /** Fotos que quedarán = existentes (no marcadas para borrar) + nuevas (archivo) + nuevas (URL). */
  const totalFotos = () =>
    imagenesExistentes.filter((i) => !imagenesParaEliminar.includes(i.id)).length +
    imagenesNuevas.length +
    imageUrlsNuevas.length;

  const handleNuevasImagenes = (files: FileList | null) => {
    if (!files) return;
    const restante = MAX_FOTOS - totalFotos();
    if (restante <= 0) {
      notify.error(null, `Máximo ${MAX_FOTOS} fotos.`);
      return;
    }
    Array.from(files)
      .slice(0, restante)
      .forEach((f) => {
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
    // Para inmueble completo, la distribución es obligatoria (igual que en el alta y el backend).
    if (esInmuebleCompleto && (!form.numDormitorios || !form.numBanos || !form.capacidadPersonas)) {
      notify.error(null, 'Para un departamento indica dormitorios, baños y capacidad de personas');
      return;
    }
    try {
      setSaving(true);
      await propiedadService.actualizar(prop.id, {
        ...form,
        precio:            Number(form.precio),
        area:              form.area    ? Number(form.area)   : undefined,
        nroPiso:           form.nroPiso ? Number(form.nroPiso): undefined,
        numDormitorios:    form.numDormitorios   ? Number(form.numDormitorios)    : undefined,
        numBanos:          form.numBanos         ? Number(form.numBanos)          : undefined,
        capacidadPersonas: form.capacidadPersonas? Number(form.capacidadPersonas) : undefined,
        servicios: [
          ...(form.serviciosIncluidos ?? []).map((s) => ({ servicio: s, estado: 'INCLUIDO' as const })),
          ...serviciosAparte.map((s) => ({ servicio: s, estado: 'APARTE' as const })),
        ],
        tipoPropiedad:   form.tipoPropiedad   || undefined,
        periodoAlquiler: form.periodoAlquiler  || undefined,
        disponibleDesde: form.disponibleDesde  || undefined,
      });
      if (imagenesParaEliminar.length > 0)
        await Promise.all(imagenesParaEliminar.map((id) => propiedadService.eliminarImagen(prop.id, id)));
      if (imagenesNuevas.length > 0)
        await propiedadService.subirImagenes(prop.id, imagenesNuevas);
      for (const url of imageUrlsNuevas)
        await propiedadService.agregarImagenPorUrl(prop.id, url);
      // Persistir el reorden de las fotos existentes (las nuevas quedan al final).
      if (ordenCambiado) {
        const ordenIds = imagenesExistentes
          .filter((i) => i.id > 0 && !imagenesParaEliminar.includes(i.id))
          .map((i) => i.id);
        if (ordenIds.length > 0) await propiedadService.reordenarImagenes(prop.id, ordenIds);
      }
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
      onClose={saving ? () => null : intentarCerrar}
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
            onClick={saving ? undefined : intentarCerrar}
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
            const agregadas = imagenesNuevas.length + imageUrlsNuevas.length;
            const badge =
              tab.id === 'fotos' && (imagenesParaEliminar.length > 0 || agregadas > 0)
                ? agregadas > 0 ? `+${agregadas}` : `-${imagenesParaEliminar.length}`
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

            {/* Distribución — obligatoria para inmuebles completos (depa / mini depa / casa) */}
            <div>
              <label className={labelCls}>Dormitorios {esInmuebleCompleto && <span className="text-primary">*</span>}</label>
              <input type="number" min={0} className={inputCls} value={form.numDormitorios ?? ''} onChange={(e) => set('numDormitorios', e.target.value || undefined)} placeholder="Ej: 3" />
            </div>
            <div>
              <label className={labelCls}>Baños {esInmuebleCompleto && <span className="text-primary">*</span>}</label>
              <input type="number" min={0} className={inputCls} value={form.numBanos ?? ''} onChange={(e) => set('numBanos', e.target.value || undefined)} placeholder="Ej: 2" />
            </div>
            <div>
              <label className={labelCls}>Capacidad (personas) {esInmuebleCompleto && <span className="text-primary">*</span>}</label>
              <input type="number" min={0} className={inputCls} value={form.capacidadPersonas ?? ''} onChange={(e) => set('capacidadPersonas', e.target.value || undefined)} placeholder="Ej: 4" />
            </div>
            {esInmuebleCompleto && (
              <div className="sm:col-span-2 flex flex-wrap gap-4 pt-1">
                {([
                  { campo: 'tieneSala' as const, label: 'Sala / estar' },
                  { campo: 'tieneCocina' as const, label: 'Cocina' },
                  { campo: 'amoblado' as const, label: 'Amoblado' },
                ]).map((t) => (
                  <label key={t.campo} className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
                    <input type="checkbox" className="accent-primary w-4 h-4" checked={Boolean(form[t.campo])} onChange={(e) => set(t.campo, e.target.checked)} />
                    {t.label}
                  </label>
                ))}
              </div>
            )}

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

            <div className="sm:col-span-2">
              <label className={labelCls}>Video (enlace)</label>
              <input
                type="url"
                className={inputCls}
                value={form.videoUrl ?? ''}
                onChange={(e) => set('videoUrl', e.target.value)}
                placeholder="https://youtu.be/… o https://vimeo.com/… (opcional)"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                YouTube, Vimeo o un archivo .mp4. Déjalo vacío para quitar el video.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Política de cancelación</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {POLITICAS_CANCELACION.map((pol) => {
                  const info = POLITICA_CANCELACION_INFO[pol];
                  const activo = (form.politicaCancelacion ?? 'FLEXIBLE') === pol;
                  return (
                    <button
                      key={pol}
                      type="button"
                      onClick={() => set('politicaCancelacion', pol)}
                      className={cn(
                        'text-left rounded-xl border p-3 transition-colors',
                        activo
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:border-primary/50',
                      )}
                    >
                      <span className="block text-sm font-bold text-foreground">{info.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                        {info.resumen}
                      </span>
                    </button>
                  );
                })}
              </div>
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

            {/* Alquilar por habitaciones */}
            <div className="sm:col-span-2 space-y-3 pt-1">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.gestionPorHabitacion}
                  onClick={() => set('gestionPorHabitacion', !form.gestionPorHabitacion)}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                    form.gestionPorHabitacion ? 'bg-primary' : 'bg-muted',
                  )}
                >
                  <span className={cn('pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200', form.gestionPorHabitacion ? 'translate-x-5' : 'translate-x-0')} />
                </button>
                <div>
                  <p className="text-sm font-bold text-card-foreground">Alquilar por habitaciones</p>
                  <p className="text-xs text-muted-foreground">El inmueble se alquila cuarto por cuarto (precio y estado por habitación)</p>
                </div>
              </div>
              {form.gestionPorHabitacion && prop?.id != null && (
                <RoomManager propiedadId={prop.id} />
              )}
            </div>

            {/* Precios por temporada/ciclo (solo unidad completa) */}
            {!form.gestionPorHabitacion && prop?.id != null && (
              <div className="sm:col-span-2 space-y-2 rounded-xl border border-border bg-muted/30 p-3">
                <label className={labelCls}>Precios por temporada / ciclo (opcional)</label>
                {temporadas.length > 0 && (
                  <div className="space-y-1.5">
                    {temporadas.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs"
                      >
                        <span className="truncate text-card-foreground">
                          {t.etiqueta ? `${t.etiqueta} · ` : ''}
                          {t.fechaInicio} → {t.fechaFin} ·{' '}
                          <span className="font-bold text-primary">S/{t.precio.toLocaleString('es-PE')}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => eliminarTemporada(t.id)}
                          disabled={tBusy}
                          className="shrink-0 text-destructive hover:text-destructive/80 disabled:opacity-50"
                          title="Eliminar temporada"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <input type="date" aria-label="Desde" value={tForm.fechaInicio} onChange={(e) => setTForm((f) => ({ ...f, fechaInicio: e.target.value }))} className={inputCls} />
                  <input type="date" aria-label="Hasta" value={tForm.fechaFin} onChange={(e) => setTForm((f) => ({ ...f, fechaFin: e.target.value }))} className={inputCls} />
                  <input type="number" min="0" step="0.01" placeholder="Precio" value={tForm.precio} onChange={(e) => setTForm((f) => ({ ...f, precio: e.target.value }))} className={inputCls} />
                  <input type="text" maxLength={60} placeholder="Etiqueta (ej. Ciclo I)" value={tForm.etiqueta} onChange={(e) => setTForm((f) => ({ ...f, etiqueta: e.target.value }))} className={inputCls} />
                </div>
                <button
                  type="button"
                  onClick={agregarTemporada}
                  disabled={tBusy}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  {tBusy ? 'Guardando…' : 'Agregar temporada'}
                </button>
                <p className="text-[11px] text-muted-foreground">
                  El precio de la temporada que cubra la <span className="font-semibold">fecha de ingreso</span> del
                  estudiante manda. Se guardan al instante (no requieren "Guardar cambios").
                </p>
              </div>
            )}
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

            {/* Servicios que se pagan aparte */}
            <div>
              <p className={sectionTitleCls}>
                <span className="material-symbols-outlined text-[16px] text-amber-600">payments</span>
                Se paga aparte (no incluido en el precio)
              </p>
              <ChipsMultiselect
                items={serviciosCatalogo}
                selected={serviciosAparte}
                onToggle={toggleServicioAparte}
              />
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
            {/* Resumen: cuántas fotos, portada y dónde reordenar */}
            <div className="flex items-start justify-between gap-3 rounded-xl bg-muted/40 border border-border px-3.5 py-2.5">
              <div>
                <p className="text-xs font-bold text-foreground">
                  {totalFotos()}/{MAX_FOTOS} fotos
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Usa <span className="font-semibold">↑ ↓</span> o <span className="font-semibold">⭐</span> sobre
                  cada foto para ordenar. La primera es la{' '}
                  <span className="font-semibold text-primary">portada</span>.
                </p>
              </div>
              <a
                href={`/landlord/details/gallery?propiedad=${prop?.id ?? ''}`}
                className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                title="Reordenar arrastrando en la Galería"
              >
                Galería
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            </div>

            {imagenesExistentes.length > 0 && (
              <div>
                <p className={labelCls}>Fotos actuales</p>
                <div className="grid grid-cols-3 gap-3">
                  {(() => {
                    const coverId = imagenesExistentes.find(
                      (i) => !imagenesParaEliminar.includes(i.id),
                    )?.id;
                    return imagenesExistentes.map((img, idx) => {
                      const marcada = imagenesParaEliminar.includes(img.id);
                      const sinId = img.id < 0;
                      const esPortada = img.id === coverId;
                      return (
                        <div key={img.id} className="relative group/img aspect-square rounded-2xl overflow-hidden bg-muted">
                          <img src={img.url} alt="foto" className={cn('w-full h-full object-cover transition-all duration-300', marcada ? 'opacity-30 scale-95' : 'group-hover/img:scale-105')} />
                          {esPortada && !marcada && (
                            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[9px] font-black px-2 py-0.5 rounded-full leading-none select-none">
                              Portada
                            </div>
                          )}
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
                          {/* Controles de orden: subir / bajar / hacer portada */}
                          {!sinId && !marcada && (
                            <div className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-lg bg-background/85 px-1 py-0.5 opacity-100 md:opacity-0 md:group-hover/img:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => moverImagenExistente(idx, -1)}
                                disabled={idx === 0}
                                title="Subir"
                                className="p-1 rounded hover:bg-muted disabled:opacity-30"
                              >
                                <span className="material-symbols-outlined text-[15px]">arrow_upward</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => moverImagenExistente(idx, 1)}
                                disabled={idx === imagenesExistentes.length - 1}
                                title="Bajar"
                                className="p-1 rounded hover:bg-muted disabled:opacity-30"
                              >
                                <span className="material-symbols-outlined text-[15px]">arrow_downward</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => hacerPortadaExistente(idx)}
                                disabled={esPortada}
                                title="Hacer portada"
                                className="p-1 rounded hover:bg-muted disabled:opacity-30"
                              >
                                <span className="material-symbols-outlined text-[15px]">star</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
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
              {totalFotos() < MAX_FOTOS ? (
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
              ) : (
                <div className="w-full rounded-2xl border-2 border-dashed border-border py-6 text-center text-xs font-semibold text-muted-foreground">
                  Llegaste al máximo de {MAX_FOTOS} fotos. Elimina alguna para agregar otra.
                </div>
              )}
            </div>

            {/* Enlaces externos a agregar (se aplican al guardar) */}
            {imageUrlsNuevas.length > 0 && (
              <div>
                <p className={labelCls}>Enlaces a agregar</p>
                <div className="grid grid-cols-3 gap-3">
                  {imageUrlsNuevas.map((url, idx) => (
                    <div key={idx} className="relative group/url aspect-square rounded-2xl overflow-hidden ring-2 ring-primary/60">
                      <img src={url} alt="enlace" className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2">
                        <span className="bg-foreground/70 text-background text-[10px] font-black px-2 py-0.5 rounded-full">URL</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImageUrlsNuevas((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-card/90 text-card-foreground flex items-center justify-center shadow-lg opacity-0 group-hover/url:opacity-100 transition-opacity"
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      agregarImagenUrl();
                    }
                  }}
                  placeholder="o pega el enlace de una imagen (.jpg/.png)"
                  disabled={totalFotos() >= MAX_FOTOS}
                  className="flex-1 rounded-xl border border-border bg-input px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={agregarImagenUrl}
                  disabled={!urlInput.trim() || totalFotos() >= MAX_FOTOS}
                  className="shrink-0 rounded-xl border border-border px-4 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  Agregar
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Reusa una imagen ya alojada en otro host (no usa tu almacenamiento). Enlace
                directo, no Google/Drive.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3 bg-card">
        <p className="text-xs text-muted-foreground hidden sm:block">
          {activeTab === 'info'      && '* Campos obligatorios'}
          {activeTab === 'servicios' && `${(form.serviciosIncluidos ?? []).length} servicio(s) · ${(form.reglas ?? []).length} regla(s)`}
          {activeTab === 'fotos'     && `${imagenesExistentes.length - imagenesParaEliminar.length + imagenesNuevas.length + imageUrlsNuevas.length} foto(s) quedarán`}
        </p>
        <div className="flex gap-2 ml-auto">
          <Button type="button" variant="ghost" size="sm" onClick={intentarCerrar} disabled={saving} className="rounded-xl px-5">
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
