'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { propiedadService } from '@/services/landlord-property-service';
import {
  catalogosService,
  type CatalogosActivos,
  type ItemCatalogo,
} from '@/services/catalogos-service';
import { useAuthStore } from '@/stores/auth-store';
import {
  UPEU_COORDS,
  UPEU_RADIO_MAX_KM,
  distanciaHaversineKm,
  formatearDistancia,
} from '@/lib/geo';
import { cn } from '@/lib/cn';
import type {
  CrearPropiedadRequest,
  PeriodoAlquiler,
  TipoPropiedad,
} from '@/types/propiedad';

// =============================================================================
// Font Awesome → Material Symbols mapper
// El backend almacena íconos como "fa-wifi", "fa-paw", etc.
// Material Symbols (Google) usa nombres distintos como "wifi", "pets", etc.
// =============================================================================

const FA_TO_MATERIAL: Record<string, string> = {
  // Períodos
  'fa-calendar-alt': 'calendar_month',
  'fa-calendar':     'calendar_today',
  'fa-calendar-day': 'today',
  'fa-repeat':       'event_repeat',
  'fa-clock':        'schedule',
  // Servicios comunes
  'fa-wifi':             'wifi',
  'fa-tint':             'water_drop',
  'fa-bolt':             'bolt',
  'fa-lightbulb':        'lightbulb',
  'fa-female':           'lightbulb',
  'fa-tshirt':           'checkroom',
  'fa-shirt':            'checkroom',
  'fa-utensils':         'restaurant',
  'fa-key':              'key',
  'fa-shower':           'shower',
  'fa-bath':             'bathtub',
  'fa-tv':               'tv',
  'fa-snowflake':        'ac_unit',
  'fa-temperature-high': 'thermostat',
  'fa-parking':          'local_parking',
  'fa-bus':              'directions_bus',
  'fa-lock':             'lock',
  'fa-couch':            'weekend',
  'fa-bed':              'bed',
  'fa-dumbbell':         'fitness_center',
  'fa-water':            'water',
  'fa-gas-pump':         'local_gas_station',
  'fa-fire':             'local_fire_department',
  'fa-broom':            'cleaning_services',
  'fa-shield-alt':       'security',
  'fa-dog':              'pets',
  // Reglas comunes
  'fa-paw':             'pets',
  'fa-smoking-ban':     'smoke_free',
  'fa-smoking':         'smoking_rooms',
  'fa-graduation-cap':  'school',
  'fa-music':           'music_note',
  'fa-glass-martini':   'local_bar',
  'fa-cocktail':        'local_bar',
  'fa-beer':            'sports_bar',
  'fa-volume-up':       'volume_up',
  'fa-user-friends':    'group',
  'fa-users':           'group',
  'fa-child':           'child_care',
  'fa-ban':             'block',
  'fa-check':           'check_circle',
  'fa-times':           'cancel',
  // Tipos de propiedad
  'fa-home':       'home',
  'fa-building':   'apartment',
  'fa-hotel':      'hotel',
  'fa-door-open':  'door_front',
  'fa-house':      'house',
};

function resolveIcon(icon: string | undefined): string | undefined {
  if (!icon) return undefined;
  const key = icon.toLowerCase().trim();
  if (key.startsWith('fa-')) return FA_TO_MATERIAL[key] ?? 'label';
  return icon;
}

// =============================================================================
// Types
// =============================================================================

interface FormState {
  titulo: string;
  descripcion: string;
  precio: string;
  direccion: string;
  tipoPropiedad: TipoPropiedad | '';
  periodoAlquiler: PeriodoAlquiler | '';
  area: string;
  nroPiso: string;
  latitud: string;
  longitud: string;
  serviciosIncluidos: string[];
  reglas: string[];
  estaDisponible: boolean;
  disponibleDesde: string;
}

type Errores = Partial<Record<keyof FormState | 'imagen' | 'general', string>>;

const INITIAL_FORM: FormState = {
  titulo: '',
  descripcion: '',
  precio: '',
  direccion: '',
  tipoPropiedad: 'CUARTO_INDIVIDUAL',
  periodoAlquiler: 'MENSUAL',
  area: '',
  nroPiso: '',
  latitud: '',
  longitud: '',
  serviciosIncluidos: [],
  reglas: [],
  estaDisponible: true,
  disponibleDesde: '',
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// =============================================================================
// Section
// =============================================================================

interface SectionProps {
  step: number;
  icon: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function Section({ step, icon, title, subtitle, children }: SectionProps) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3 rounded-t-2xl overflow-hidden">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[17px] text-accent-foreground">
            {icon}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] font-bold tracking-[0.2em] text-muted-foreground uppercase tabular-nums">
              {String(step).padStart(2, '0')}
            </span>
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

// =============================================================================
// Field
// =============================================================================

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ label, hint, error, required, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        {label}
        {required && <span className="text-destructive text-[13px] leading-none">*</span>}
        {hint && (
          <span className="normal-case tracking-normal font-normal opacity-60 ml-0.5">
            · {hint}
          </span>
        )}
      </label>
      {children}
      {error && (
        <p className="text-[11px] font-semibold text-destructive flex items-center gap-1 mt-1 animate-fade-in">
          <span className="material-symbols-outlined text-[13px]">error</span>
          {error}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// InputField — native input con tokens correctos
// =============================================================================

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: string;
  error?: boolean;
}

function InputField({ icon, error, className, ...props }: InputFieldProps) {
  return (
    <div className="relative">
      {icon && (
        <span
          className={cn(
            'material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[17px] pointer-events-none transition-colors',
            error ? 'text-destructive/50' : 'text-muted-foreground',
          )}
        >
          {icon}
        </span>
      )}
      <input
        className={cn(
          'w-full bg-input border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50',
          'py-2.5 px-4 outline-none transition-all',
          'focus:ring-2 focus:ring-primary/20 focus:border-primary',
          icon && 'pl-10',
          error
            ? 'border-destructive/60 focus:ring-destructive/20 focus:border-destructive'
            : 'border-border hover:border-primary/40',
          className,
        )}
        {...props}
      />
    </div>
  );
}

// =============================================================================
// CustomSelect
// =============================================================================

interface CustomSelectProps<T extends string> {
  value: T | '';
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; icon?: string; description?: string }>;
  placeholder?: string;
  error?: string;
}

function CustomSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Selecciona una opción',
  error,
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between gap-3 bg-input border rounded-xl py-2.5 px-4 text-sm text-left outline-none transition-all',
          error
            ? 'border-destructive/60'
            : open
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-border hover:border-primary/40',
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected?.icon && (
            <span className="material-symbols-outlined text-[16px] text-muted-foreground shrink-0">
              {selected.icon}
            </span>
          )}
          <span
            className={cn(
              'truncate text-sm',
              selected ? 'text-foreground font-medium' : 'text-muted-foreground/50',
            )}
          >
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <span
          className={cn(
            'material-symbols-outlined text-[18px] text-muted-foreground transition-transform shrink-0',
            open && 'rotate-180',
          )}
        >
          expand_more
        </span>
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-fade-in">
          <ul className="max-h-64 overflow-y-auto py-1">
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-start gap-2.5 px-3 py-2.5 text-sm text-left transition-colors',
                      active ? 'bg-accent text-accent-foreground' : 'hover:bg-muted text-foreground',
                    )}
                  >
                    {opt.icon && (
                      <span
                        className={cn(
                          'material-symbols-outlined text-[15px] mt-0.5 shrink-0',
                          active ? 'text-accent-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {opt.icon}
                      </span>
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium leading-tight">{opt.label}</span>
                      {opt.description && (
                        <span className="block text-[11px] opacity-60 mt-0.5">
                          {opt.description}
                        </span>
                      )}
                    </span>
                    {active && (
                      <span className="material-symbols-outlined text-[15px] text-accent-foreground shrink-0">
                        check
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ChipsMultiselect
// =============================================================================

interface ChipsMultiselectProps {
  items: ItemCatalogo[];
  selected: string[];
  onToggle: (valor: string) => void;
  emptyHint?: string;
}

function ChipsMultiselect({ items, selected, onToggle, emptyHint }: ChipsMultiselectProps) {
  if (!items.length) {
    return (
      <p className="text-xs text-muted-foreground italic">
        {emptyHint ?? 'No hay opciones disponibles aún.'}
      </p>
    );
  }
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
            {isOn && (
              <span className="material-symbols-outlined text-[11px] ml-0.5">check</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Switch
// =============================================================================

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      title={label}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
        checked ? 'bg-primary' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

// =============================================================================
// SkeletonChips
// =============================================================================

// =============================================================================
// CustomItemInput
// =============================================================================

interface CustomItemInputProps {
  items: string[];
  onAdd: (text: string) => void;
  onRemove: (text: string) => void;
  maxItems?: number;
  maxChars?: number;
  placeholder?: string;
}

function CustomItemInput({
  items,
  onAdd,
  onRemove,
  maxItems = 3,
  maxChars = 60,
  placeholder = 'Escribe y presiona Enter…',
}: CustomItemInputProps) {
  const [inputValue, setInputValue] = useState('');
  const canAdd = items.length < maxItems;

  const commit = () => {
    const v = inputValue.trim();
    if (!v || v.length > maxChars) return;
    if (items.some((i) => i.toLowerCase() === v.toLowerCase())) return;
    if (!canAdd) return;
    onAdd(v);
    setInputValue('');
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
              <button
                type="button"
                onClick={() => onRemove(item)}
                className="ml-0.5 hover:text-amber-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[11px]">close</span>
              </button>
            </span>
          ))}
        </div>
      )}

      {canAdd && (
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commit();
                }
              }}
              maxLength={maxChars}
              placeholder={placeholder}
              className={cn(
                'w-full bg-input border border-border rounded-xl text-sm text-foreground',
                'py-2.5 px-4 outline-none transition-all',
                'focus:ring-2 focus:ring-primary/20 focus:border-primary',
                'placeholder:text-muted-foreground/50',
                inputValue.length > 0 && 'pr-14',
              )}
            />
            {inputValue.length > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums pointer-events-none">
                {inputValue.length}/{maxChars}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={commit}
            disabled={!inputValue.trim() || inputValue.length > maxChars}
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
        </div>
      )}

      {!canAdd && (
        <p className="text-[11px] text-muted-foreground">
          Máximo {maxItems} ítems personalizados.
        </p>
      )}
    </div>
  );
}

function SkeletonChips() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <span key={i} className="h-8 rounded-full bg-muted animate-pulse" style={{ width: `${60 + (i % 3) * 20}px` }} />
      ))}
    </div>
  );
}

// =============================================================================
// Página principal
// =============================================================================

export default function AddPropertyPage() {
  const router = useRouter();
  const { usuario } = useAuthStore();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errores, setErrores] = useState<Errores>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_IMAGES = 6;

  const [requestingGeo, setRequestingGeo] = useState(false);
  const [catalogos, setCatalogos] = useState<CatalogosActivos | null>(null);
  const [cargandoCat, setCargandoCat] = useState(true);

  useEffect(() => {
    let cancel = false;
    catalogosService
      .obtenerActivos()
      .then((data) => { if (!cancel) setCatalogos(data); })
      .catch(() => {})
      .finally(() => { if (!cancel) setCargandoCat(false); });
    return () => { cancel = true; };
  }, []);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrores((prev) => {
      if (!prev[key]) return prev;
      const { [key]: _drop, ...rest } = prev;
      return rest as Errores;
    });
  };

  const onInput = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setField(name as keyof FormState, value as never);
  };

  const tiposOptions = useMemo(() => {
    const fromCat = catalogos?.TIPO_CUARTO ?? [];
    if (fromCat.length) {
      return fromCat.map((i) => ({
        value: i.valor as TipoPropiedad,
        label: i.nombre,
        icon: resolveIcon(i.icono),
        description: i.descripcion,
      }));
    }
    return [
      { value: 'CUARTO_INDIVIDUAL' as TipoPropiedad, label: 'Cuarto individual', icon: 'bed' },
      { value: 'CUARTO_COMPARTIDO' as TipoPropiedad, label: 'Cuarto compartido', icon: 'bunk_bed' },
      { value: 'DEPARTAMENTO' as TipoPropiedad, label: 'Departamento', icon: 'apartment' },
      { value: 'SUITE' as TipoPropiedad, label: 'Suite', icon: 'hotel' },
    ];
  }, [catalogos]);

  const periodosOptions = useMemo(() => {
    const fromCat = catalogos?.PERIODO_ALQUILER ?? [];
    if (fromCat.length) {
      return fromCat.map((i) => ({
        value: i.valor as PeriodoAlquiler,
        label: i.nombre,
        icon: resolveIcon(i.icono),
      }));
    }
    return [
      { value: 'DIARIO' as PeriodoAlquiler, label: 'Diario', icon: 'today' },
      { value: 'MENSUAL' as PeriodoAlquiler, label: 'Mensual', icon: 'calendar_month' },
      { value: 'SEMESTRAL' as PeriodoAlquiler, label: 'Semestral', icon: 'event_repeat' },
      { value: 'ANUAL' as PeriodoAlquiler, label: 'Anual', icon: 'calendar_today' },
    ];
  }, [catalogos]);

  const handleFiles = (incoming: File[]) => {
    const remaining = MAX_IMAGES - imageFiles.length;
    if (remaining <= 0) return;
    const candidates = incoming.slice(0, remaining);
    const invalid = candidates.find(
      (f) => !ACCEPTED_IMAGE_TYPES.includes(f.type) || f.size > MAX_IMAGE_BYTES,
    );
    if (invalid) {
      setErrores((p) => ({ ...p, imagen: `"${invalid.name}": formato no soportado o excede 10 MB.` }));
      return;
    }
    setErrores((p) => { const { imagen: _omit, ...rest } = p; return rest; });
    candidates.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFiles((prev) => [...prev, file]);
        setPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setCoverIndex((prev) => {
      if (imageFiles.length <= 1) return 0;
      if (index === prev) return 0;
      if (index < prev) return prev - 1;
      return prev;
    });
  };

  const usarMiUbicacion = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setErrores((p) => ({ ...p, latitud: 'Tu navegador no soporta geolocalización.' }));
      return;
    }
    setRequestingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setField('latitud', pos.coords.latitude.toFixed(6));
        setField('longitud', pos.coords.longitude.toFixed(6));
        setRequestingGeo(false);
      },
      () => {
        setErrores((p) => ({
          ...p,
          latitud: 'No pudimos obtener tu ubicación. Permite el acceso e inténtalo otra vez.',
        }));
        setRequestingGeo(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const distanciaUpeu = useMemo(() => {
    const lat = parseFloat(form.latitud);
    const lng = parseFloat(form.longitud);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return distanciaHaversineKm({ lat, lng }, UPEU_COORDS);
  }, [form.latitud, form.longitud]);

  const validar = (): Errores => {
    const e: Errores = {};
    if (!form.titulo.trim()) e.titulo = 'Ponle un título a tu publicación.';
    else if (form.titulo.length > 150) e.titulo = 'Máximo 150 caracteres.';
    if (form.descripcion.length > 5000) e.descripcion = 'La descripción no debe superar 5000 caracteres.';
    const precioNum = parseFloat(form.precio);
    if (!form.precio.trim()) e.precio = 'Indica un precio.';
    else if (Number.isNaN(precioNum) || precioNum <= 0) e.precio = 'El precio debe ser mayor a 0.';
    if (!form.direccion.trim()) e.direccion = 'Indica la dirección.';
    else if (form.direccion.length > 255) e.direccion = 'Máximo 255 caracteres.';
    if (form.area !== '') {
      const a = parseFloat(form.area);
      if (Number.isNaN(a) || a < 0) e.area = 'Área debe ser ≥ 0.';
    }
    if (form.nroPiso !== '') {
      const p = parseInt(form.nroPiso, 10);
      if (Number.isNaN(p) || p < 0) e.nroPiso = 'Número de piso inválido.';
    }
    const latRaw = form.latitud.trim();
    const lngRaw = form.longitud.trim();
    if ((latRaw && !lngRaw) || (!latRaw && lngRaw)) {
      e.latitud = 'Si envías una coordenada, envía ambas.';
    } else if (latRaw && lngRaw) {
      const lat = parseFloat(latRaw);
      const lng = parseFloat(lngRaw);
      if (Number.isNaN(lat) || lat < -90 || lat > 90) e.latitud = 'Latitud entre -90 y 90.';
      else if (Number.isNaN(lng) || lng < -180 || lng > 180) e.longitud = 'Longitud entre -180 y 180.';
      else {
        const km = distanciaHaversineKm({ lat, lng }, UPEU_COORDS);
        if (km > UPEU_RADIO_MAX_KM)
          e.longitud = `La ubicación está a ${formatearDistancia(km)} de UPeU. Máx: ${UPEU_RADIO_MAX_KM} km.`;
      }
    }
    if (imageFiles.length === 0) e.imagen = 'Sube al menos una foto.';
    return e;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!usuario) { setSubmitError('Debes iniciar sesión para publicar.'); return; }
    const validationErrors = validar();
    if (Object.keys(validationErrors).length > 0) {
      setErrores(validationErrors);
      const firstField = Object.keys(validationErrors)[0];
      document.querySelector(`[data-field="${firstField}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const arrendadorIdNumber = Number(usuario.perfilId ?? usuario.id);
    if (!arrendadorIdNumber || Number.isNaN(arrendadorIdNumber)) {
      setSubmitError('No pudimos identificar tu perfil de arrendador. Vuelve a iniciar sesión.');
      return;
    }
    const payload: CrearPropiedadRequest = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || undefined,
      precio: parseFloat(form.precio),
      direccion: form.direccion.trim(),
      tipoPropiedad: form.tipoPropiedad || undefined,
      periodoAlquiler: form.periodoAlquiler || undefined,
      area: form.area !== '' ? parseFloat(form.area) : undefined,
      nroPiso: form.nroPiso !== '' ? parseInt(form.nroPiso, 10) : undefined,
      latitud: form.latitud !== '' ? parseFloat(form.latitud) : undefined,
      longitud: form.longitud !== '' ? parseFloat(form.longitud) : undefined,
      ubicacionGps:
        form.latitud && form.longitud
          ? `${parseFloat(form.latitud).toFixed(6)},${parseFloat(form.longitud).toFixed(6)}`
          : undefined,
      serviciosIncluidos: form.serviciosIncluidos.length ? form.serviciosIncluidos : undefined,
      reglas: form.reglas.length ? form.reglas : undefined,
      estaDisponible: form.estaDisponible,
      disponibleDesde: form.disponibleDesde || undefined,
      arrendadorId: arrendadorIdNumber,
    };
    setLoading(true);
    try {
      const coverFile = imageFiles[coverIndex] ?? imageFiles[0];
      const extraFiles = imageFiles.filter((_, i) => i !== imageFiles.indexOf(coverFile));
      const nuevaPropiedad = await propiedadService.crearPropiedad(payload, coverFile);
      if (extraFiles.length > 0 && nuevaPropiedad?.id) {
        await propiedadService.subirImagenes(nuevaPropiedad.id, extraFiles);
      }
      router.push('/landlord/properties/active');
    } catch (err) {
      console.error('Error al crear propiedad:', err);
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'Hubo un error al publicar la propiedad. Inténtalo de nuevo.';
      setSubmitError(message);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-start gap-4">
        <Link
          href="/landlord/dashboard"
          aria-label="Volver al dashboard"
          className="shrink-0 mt-0.5 w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
            Propiedades · Nueva publicación
          </p>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Publicar mi cuarto
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-lg leading-relaxed">
            Completa los datos de tu cuarto. Cuanta más información compartas, más rápido
            encontrarás inquilino.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-5"
        noValidate
      >
        {/* ── Columna principal ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* 01 — Información básica */}
          <Section step={1} icon="info" title="Información básica" subtitle="Lo primero que verán los estudiantes">

            <div data-field="titulo">
              <Field label="Título del anuncio" hint={`${form.titulo.length}/150`} required error={errores.titulo}>
                <InputField
                  name="titulo"
                  value={form.titulo}
                  onChange={onInput}
                  placeholder="Ej: Cuarto acogedor a 5 min de UPeU"
                  maxLength={150}
                  error={!!errores.titulo}
                />
              </Field>
            </div>

            <div data-field="descripcion">
              <Field label="Descripción" hint={`${form.descripcion.length}/5000`} error={errores.descripcion}>
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={onInput}
                  placeholder="Cuenta qué hace especial tu cuarto: ubicación, ambiente, lo que incluye…"
                  maxLength={5000}
                  className={cn(
                    'w-full min-h-[120px] bg-input border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50',
                    'py-2.5 px-4 outline-none transition-all resize-y',
                    'focus:ring-2 focus:ring-primary/20 focus:border-primary',
                    errores.descripcion
                      ? 'border-destructive/60'
                      : 'border-border hover:border-primary/40',
                  )}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div data-field="precio">
                <Field label="Precio" hint="en soles (S/)" required error={errores.precio}>
                  <InputField
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    name="precio"
                    icon="payments"
                    value={form.precio}
                    onChange={onInput}
                    placeholder="450.00"
                    error={!!errores.precio}
                  />
                </Field>
              </div>
              <div data-field="periodoAlquiler">
                <Field label="Período de alquiler">
                  <CustomSelect
                    value={form.periodoAlquiler}
                    onChange={(v) => setField('periodoAlquiler', v)}
                    options={periodosOptions}
                    placeholder="Mensual"
                  />
                </Field>
              </div>
            </div>

            <div data-field="tipoPropiedad">
              <Field label="Tipo de propiedad">
                <CustomSelect
                  value={form.tipoPropiedad}
                  onChange={(v) => setField('tipoPropiedad', v)}
                  options={tiposOptions}
                  placeholder="Selecciona el tipo"
                />
              </Field>
            </div>
          </Section>

          {/* 02 — Ubicación */}
          <Section
            step={2}
            icon="location_on"
            title="Ubicación"
            subtitle="Las propiedades deben estar a menos de 15 km del campus UPeU"
          >
            <div data-field="direccion">
              <Field label="Dirección" hint={`${form.direccion.length}/255`} required error={errores.direccion}>
                <InputField
                  name="direccion"
                  icon="home_pin"
                  value={form.direccion}
                  onChange={onInput}
                  placeholder="Av. Las Flores 123, Ñaña, Lima"
                  maxLength={255}
                  error={!!errores.direccion}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div data-field="latitud">
                <Field label="Latitud" hint="-90 a 90" error={errores.latitud}>
                  <InputField
                    type="number"
                    step="0.000001"
                    name="latitud"
                    value={form.latitud}
                    onChange={onInput}
                    placeholder="-11.987800"
                    error={!!errores.latitud}
                  />
                </Field>
              </div>
              <div data-field="longitud">
                <Field label="Longitud" hint="-180 a 180" error={errores.longitud}>
                  <InputField
                    type="number"
                    step="0.000001"
                    name="longitud"
                    value={form.longitud}
                    onChange={onInput}
                    placeholder="-76.898000"
                    error={!!errores.longitud}
                  />
                </Field>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={usarMiUbicacion}
                disabled={requestingGeo}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className={cn('material-symbols-outlined text-[16px]', requestingGeo && 'animate-spin')}>
                  {requestingGeo ? 'autorenew' : 'my_location'}
                </span>
                {requestingGeo ? 'Buscando…' : 'Usar mi ubicación'}
              </button>

              {distanciaUpeu !== null && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border',
                    distanciaUpeu <= UPEU_RADIO_MAX_KM
                      ? 'bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-success)]/20'
                      : 'bg-destructive/10 text-destructive border-destructive/20',
                  )}
                >
                  <span className="material-symbols-outlined text-[13px]">school</span>
                  {distanciaUpeu <= UPEU_RADIO_MAX_KM ? 'A ' : 'Fuera de rango: '}
                  {formatearDistancia(distanciaUpeu)} de UPeU
                </span>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Las coordenadas son opcionales pero recomendadas: tu propiedad aparecerá en el mapa
              y los estudiantes podrán filtrarla por cercanía.
            </p>
          </Section>

          {/* 03 — Detalles */}
          <Section
            step={3}
            icon="straighten"
            title="Detalles del espacio"
            subtitle="Datos prácticos para que el estudiante decida más rápido"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div data-field="area">
                <Field label="Área" hint="m² · opcional" error={errores.area}>
                  <InputField
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    name="area"
                    icon="square_foot"
                    value={form.area}
                    onChange={onInput}
                    placeholder="12"
                    error={!!errores.area}
                  />
                </Field>
              </div>
              <div data-field="nroPiso">
                <Field label="Piso" hint="opcional" error={errores.nroPiso}>
                  <InputField
                    type="number"
                    inputMode="numeric"
                    min="0"
                    name="nroPiso"
                    icon="stairs"
                    value={form.nroPiso}
                    onChange={onInput}
                    placeholder="2"
                    error={!!errores.nroPiso}
                  />
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div data-field="disponibleDesde">
                <Field label="Disponible desde" hint="opcional">
                  <InputField
                    type="date"
                    name="disponibleDesde"
                    icon="event"
                    value={form.disponibleDesde}
                    onChange={onInput}
                  />
                </Field>
              </div>

              <div data-field="estaDisponible" className="sm:pt-[22px]">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 border border-border px-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={cn(
                        'material-symbols-outlined text-[20px] shrink-0',
                        form.estaDisponible ? 'text-[var(--color-success)]' : 'text-muted-foreground',
                      )}
                    >
                      {form.estaDisponible ? 'check_circle' : 'pause_circle'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {form.estaDisponible ? 'Disponible ahora' : 'Pausada'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {form.estaDisponible ? 'Visible en búsquedas' : 'No aparece en búsquedas'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.estaDisponible}
                    onChange={(v) => setField('estaDisponible', v)}
                    label="Disponibilidad"
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* 04 — Servicios */}
          <Section
            step={4}
            icon="bolt"
            title="Servicios incluidos"
            subtitle="Marca todo lo que tu cuarto ofrece"
          >
            {cargandoCat ? (
              <SkeletonChips />
            ) : (
              <ChipsMultiselect
                items={catalogos?.SERVICIO ?? []}
                selected={form.serviciosIncluidos}
                onToggle={(valor) =>
                  setField(
                    'serviciosIncluidos',
                    form.serviciosIncluidos.includes(valor)
                      ? form.serviciosIncluidos.filter((v) => v !== valor)
                      : [...form.serviciosIncluidos, valor],
                  )
                }
              />
            )}
            {form.serviciosIncluidos.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {form.serviciosIncluidos.length} servicio
                {form.serviciosIncluidos.length !== 1 ? 's' : ''} seleccionado
                {form.serviciosIncluidos.length !== 1 ? 's' : ''}.
              </p>
            )}

            <div className="pt-3 border-t border-border/50">
              <p className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[13px]">edit_note</span>
                No está en el catálogo
                <span className="font-normal opacity-60">· máx. 3 · 60 caracteres</span>
              </p>
              <CustomItemInput
                items={form.serviciosIncluidos.filter(
                  (v) => !(catalogos?.SERVICIO ?? []).some((c) => c.valor === v),
                )}
                onAdd={(text) =>
                  setField('serviciosIncluidos', [...form.serviciosIncluidos, text])
                }
                onRemove={(text) =>
                  setField(
                    'serviciosIncluidos',
                    form.serviciosIncluidos.filter((v) => v !== text),
                  )
                }
                placeholder="Ej: Calefacción central, balcón privado…"
              />
            </div>
          </Section>

          {/* 05 — Reglas */}
          <Section
            step={5}
            icon="rule"
            title="Reglas de la casa"
            subtitle="Sé claro para evitar malentendidos con tus inquilinos"
          >
            {cargandoCat ? (
              <SkeletonChips />
            ) : (
              <ChipsMultiselect
                items={catalogos?.REGLA ?? []}
                selected={form.reglas}
                onToggle={(valor) =>
                  setField(
                    'reglas',
                    form.reglas.includes(valor)
                      ? form.reglas.filter((v) => v !== valor)
                      : [...form.reglas, valor],
                  )
                }
              />
            )}
            {form.reglas.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {form.reglas.length} regla{form.reglas.length !== 1 ? 's' : ''} aplicará
                {form.reglas.length !== 1 ? 'n' : ''}.
              </p>
            )}

            <div className="pt-3 border-t border-border/50">
              <p className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[13px]">edit_note</span>
                No está en el catálogo
                <span className="font-normal opacity-60">· máx. 3 · 60 caracteres</span>
              </p>
              <CustomItemInput
                items={form.reglas.filter(
                  (v) => !(catalogos?.REGLA ?? []).some((c) => c.valor === v),
                )}
                onAdd={(text) => setField('reglas', [...form.reglas, text])}
                onRemove={(text) =>
                  setField(
                    'reglas',
                    form.reglas.filter((v) => v !== text),
                  )
                }
                placeholder="Ej: No visitas nocturnas, silencio después de las 10 PM…"
              />
            </div>
          </Section>
        </div>

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-6 self-start">

          {/* Fotos */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Fotos del cuarto</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Sube hasta {MAX_IMAGES} fotos · elige la portada
                </p>
              </div>
              <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                {imageFiles.length}/{MAX_IMAGES}
              </span>
            </div>

            <div data-field="imagen" className="p-5 space-y-3">

              {/* Grid de previews */}
              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {previews.map((src, i) => (
                    <div
                      key={i}
                      className={cn(
                        'relative aspect-[4/3] rounded-lg overflow-hidden group',
                        i === coverIndex && 'ring-2 ring-primary ring-offset-1 ring-offset-card',
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      {i === coverIndex && (
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none select-none">
                          Portada
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        {i !== coverIndex && (
                          <button
                            type="button"
                            onClick={() => setCoverIndex(i)}
                            title="Usar como portada"
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[13px]">star</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          title="Eliminar foto"
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-destructive text-white hover:bg-destructive/80 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[13px]">close</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {imageFiles.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-[4/3] rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-background flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[22px]">add_photo_alternate</span>
                      <span className="text-[10px] font-semibold">Agregar</span>
                    </button>
                  )}
                </div>
              )}

              {/* Dropzone vacío */}
              {previews.length === 0 && (
                <div
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all select-none',
                    isDragging
                      ? 'border-primary bg-accent/50'
                      : errores.imagen
                        ? 'border-destructive/50 bg-destructive/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50',
                  )}
                >
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                    <span className="material-symbols-outlined text-[26px] text-accent-foreground">
                      add_photo_alternate
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">
                      {isDragging ? 'Suelta aquí' : 'Arrastra fotos aquí'}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      o haz clic para explorar
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 text-center">
                    JPG, PNG o WEBP · Máx. 10 MB por foto
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={onFileInput}
                className="hidden"
              />

              {errores.imagen && (
                <p className="text-[11px] font-semibold text-destructive flex items-center gap-1 animate-fade-in">
                  <span className="material-symbols-outlined text-[13px]">error</span>
                  {errores.imagen}
                </p>
              )}

              {previews.length > 0 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Toca <span className="font-bold">★</span> sobre una imagen para elegirla como portada
                </p>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {submitError && (
              <div className="px-5 py-3 bg-destructive/5 border-b border-destructive/20 flex items-start gap-2">
                <span className="material-symbols-outlined text-destructive text-[16px] mt-0.5 shrink-0">
                  error
                </span>
                <p className="text-[12px] font-medium text-destructive leading-snug">{submitError}</p>
              </div>
            )}

            <div className="p-5 space-y-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      autorenew
                    </span>
                    Publicando…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">publish</span>
                    Publicar propiedad
                  </>
                )}
              </button>

              <Link
                href="/landlord/dashboard"
                className="w-full h-10 flex items-center justify-center rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </Link>

              <div className="pt-3 border-t border-border flex items-start gap-2 mt-1">
                <span className="material-symbols-outlined text-primary text-[16px] mt-0.5 shrink-0">
                  verified
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Tu publicación pasa por revisión antes de aparecer en búsquedas. Te
                  avisaremos cuando se apruebe.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
