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

import { Badge } from '@/components/ui/legacy-badge';
import { Button } from '@/components/ui/legacy-button';
import { Input } from '@/components/ui/legacy-input';
import { Card } from '@/components/ui/legacy-card';

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
import type {
  CrearPropiedadRequest,
  PeriodoAlquiler,
  TipoPropiedad,
} from '@/types/propiedad';

// =============================================================================
// Tipos locales
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

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// =============================================================================
// Subcomponentes
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
    <Card className="border-none shadow-sm bg-surface-container-low" hoverable={false}>
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-primary/10 text-primary grid place-items-center">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="surface" className="!px-2 !py-0.5">
              Paso {step}
            </Badge>
          </div>
          <h3 className="text-xl font-black text-on-surface tracking-tight">{title}</h3>
          {subtitle && (
            <p className="text-sm text-on-surface-variant mt-0.5 leading-snug">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">{children}</div>
    </Card>
  );
}

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
      <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1 flex items-center gap-1.5">
        {label}
        {required && <span className="text-error">*</span>}
        {hint && (
          <span className="font-medium normal-case tracking-normal text-[10px] text-outline">
            · {hint}
          </span>
        )}
      </label>
      {children}
      {error && (
        <p className="text-error text-[11px] font-bold px-2 flex items-center gap-1 animate-fade-in">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {error}
        </p>
      )}
    </div>
  );
}

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
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 bg-surface-container-low border rounded-2xl py-4 px-4 text-left text-sm font-medium transition-all
          ${error ? 'border-error focus:ring-error/20 focus:border-error' : 'border-outline-variant/20 hover:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:border-primary'}
          ${open ? 'ring-2 ring-primary/20 border-primary' : ''}
        `}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected?.icon && (
            <span className="material-symbols-outlined text-primary text-[20px]">
              {selected.icon}
            </span>
          )}
          <span
            className={`truncate ${selected ? 'text-on-surface' : 'text-outline/60'}`}
          >
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <span
          className={`material-symbols-outlined text-on-surface-variant text-[20px] transition-transform ${open ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-2 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          <ul className="max-h-72 overflow-y-auto py-1.5">
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
                    className={`w-full flex items-start gap-3 px-3 py-2.5 mx-1.5 my-0.5 rounded-xl text-left transition-colors
                      ${active ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container text-on-surface'}
                    `}
                    style={{ width: 'calc(100% - 0.75rem)' }}
                  >
                    {opt.icon && (
                      <span
                        className={`material-symbols-outlined mt-0.5 text-[20px] ${active ? 'text-primary' : 'text-on-surface-variant'}`}
                      >
                        {opt.icon}
                      </span>
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold">{opt.label}</span>
                      {opt.description && (
                        <span className="block text-[11px] text-on-surface-variant mt-0.5">
                          {opt.description}
                        </span>
                      )}
                    </span>
                    {active && (
                      <span className="material-symbols-outlined text-primary text-[20px]">
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

interface ChipsMultiselectProps {
  items: ItemCatalogo[];
  selected: string[];
  onToggle: (valor: string) => void;
  emptyHint?: string;
}

function ChipsMultiselect({ items, selected, onToggle, emptyHint }: ChipsMultiselectProps) {
  if (!items.length) {
    return (
      <p className="text-xs text-on-surface-variant italic px-1">
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
            className={`group inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all border
              ${isOn
                ? 'bg-primary text-on-primary border-primary shadow-md shadow-primary/20'
                : 'bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:border-primary/50 hover:text-primary'}
            `}
          >
            {item.icono && (
              <span className="material-symbols-outlined text-[16px]">{item.icono}</span>
            )}
            <span>{item.nombre}</span>
            {isOn && (
              <span className="material-symbols-outlined text-[14px] -mr-0.5">check</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

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
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200
        ${checked ? 'bg-primary' : 'bg-surface-container-high'}`}
      title={label}
    >
      <span
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
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

  // Imagen
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Geolocalización
  const [requestingGeo, setRequestingGeo] = useState(false);

  // Catálogos
  const [catalogos, setCatalogos] = useState<CatalogosActivos | null>(null);
  const [cargandoCat, setCargandoCat] = useState(true);

  useEffect(() => {
    let cancel = false;
    catalogosService
      .obtenerActivos()
      .then((data) => {
        if (!cancel) setCatalogos(data);
      })
      .catch(() => {
        // Silencioso — el servicio cae a fallback.
      })
      .finally(() => {
        if (!cancel) setCargandoCat(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  // Helpers de actualización
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

  // Catálogos: opciones para selects
  const tiposOptions = useMemo(() => {
    const fromCat = catalogos?.TIPO_CUARTO ?? [];
    if (fromCat.length) {
      return fromCat.map((i) => ({
        value: i.valor as TipoPropiedad,
        label: i.nombre,
        icon: i.icono,
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
        icon: i.icono,
      }));
    }
    return [
      { value: 'DIARIO' as PeriodoAlquiler, label: 'Diario', icon: 'today' },
      { value: 'MENSUAL' as PeriodoAlquiler, label: 'Mensual', icon: 'calendar_month' },
      { value: 'SEMESTRAL' as PeriodoAlquiler, label: 'Semestral', icon: 'event_repeat' },
      { value: 'ANUAL' as PeriodoAlquiler, label: 'Anual', icon: 'calendar_today' },
    ];
  }, [catalogos]);

  // Imagen handlers
  const handleFile = (file?: File | null) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setErrores((p) => ({ ...p, imagen: 'Formato no soportado. Usa JPG, PNG o WEBP.' }));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrores((p) => ({ ...p, imagen: 'La imagen excede 10 MB.' }));
      return;
    }
    setErrores((p) => {
      const { imagen: _omit, ...rest } = p;
      return rest;
    });
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const removeImage = () => {
    setImageFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Geolocalización
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
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Distancia a UPeU (preview en vivo para que el usuario vea si está en rango)
  const distanciaUpeu = useMemo(() => {
    const lat = parseFloat(form.latitud);
    const lng = parseFloat(form.longitud);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return distanciaHaversineKm({ lat, lng }, UPEU_COORDS);
  }, [form.latitud, form.longitud]);

  // Validación
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
      if (Number.isNaN(a) || a < 0) e.area = 'Área debe ser >= 0.';
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
        if (km > UPEU_RADIO_MAX_KM) {
          e.longitud = `La ubicación está a ${formatearDistancia(km)} de UPeU. Máximo permitido: ${UPEU_RADIO_MAX_KM} km.`;
        }
      }
    }

    if (!imageFile) e.imagen = 'Sube una foto de portada.';

    return e;
  };

  // Submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!usuario) {
      setSubmitError('Debes iniciar sesión para publicar.');
      return;
    }

    const validationErrors = validar();
    if (Object.keys(validationErrors).length > 0) {
      setErrores(validationErrors);
      // scroll al primer error
      const firstField = Object.keys(validationErrors)[0];
      const el = document.querySelector(`[data-field="${firstField}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      await propiedadService.crearPropiedad(payload, imageFile ?? undefined);
      router.push('/landlord/properties/active');
    } catch (err) {
      console.error('Error al crear propiedad:', err);
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (err as { message?: string })?.message ||
        'Hubo un error al publicar la propiedad. Inténtalo de nuevo.';
      setSubmitError(message);
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 animate-fade-in">
      {/* Header con hero gradient */}
      <div className="relative mb-10 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-outline-variant/10 p-6 sm:p-10">
        <div className="absolute -top-16 -right-12 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-secondary-container/50 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-start gap-4">
            <Link
              href="/landlord/dashboard"
              className="mt-1 w-10 h-10 grid place-items-center rounded-2xl bg-surface-container-lowest border border-outline-variant/20 text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors"
              aria-label="Volver"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <div>
              <Badge variant="primary" className="mb-2">
                Publicación nueva
              </Badge>
              <h1 className="text-3xl sm:text-5xl font-black text-on-surface tracking-tighter leading-tight">
                Publicar mi <span className="text-primary">cuarto</span>
              </h1>
              <p className="text-on-surface-variant mt-2 max-w-xl text-sm sm:text-base">
                Completa los datos para que estudiantes encuentren tu propiedad. Cuanta más
                información compartas, más confianza generarás.
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 self-start">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-lowest border border-outline-variant/20 text-xs font-bold text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px] text-primary">
                school
              </span>
              Cerca a UPeU
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8"
        noValidate
      >
        {/* ============================================================ */}
        {/* Columna principal: secciones                                  */}
        {/* ============================================================ */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
          <Section
            step={1}
            icon="info"
            title="Información básica"
            subtitle="Lo primero que verán los estudiantes."
          >
            <div data-field="titulo">
              <Field
                label="Título del anuncio"
                hint={`${form.titulo.length}/150`}
                required
                error={errores.titulo}
              >
                <Input
                  name="titulo"
                  value={form.titulo}
                  onChange={onInput}
                  placeholder="Ej: Cuarto acogedor a 5 min de UPeU"
                  maxLength={150}
                  error={errores.titulo}
                />
              </Field>
            </div>

            <div data-field="descripcion">
              <Field
                label="Descripción"
                hint={`${form.descripcion.length}/5000`}
                error={errores.descripcion}
              >
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={onInput}
                  placeholder="Cuenta qué hace especial tu cuarto, qué hay alrededor, ambiente, etc."
                  maxLength={5000}
                  className="w-full min-h-[140px] rounded-2xl bg-surface-container-low border border-outline-variant/20 p-4 text-sm text-on-surface placeholder:text-outline/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium resize-y"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div data-field="precio">
                <Field label="Precio" hint="en soles (S/)" required error={errores.precio}>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    name="precio"
                    icon="payments"
                    value={form.precio}
                    onChange={onInput}
                    placeholder="450.00"
                    error={errores.precio}
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

          {/* SECCIÓN 2: UBICACIÓN */}
          <Section
            step={2}
            icon="location_on"
            title="Ubicación"
            subtitle="Las propiedades deben estar a menos de 15 km del campus UPeU."
          >
            <div data-field="direccion">
              <Field
                label="Dirección"
                hint={`${form.direccion.length}/255`}
                required
                error={errores.direccion}
              >
                <Input
                  name="direccion"
                  icon="home_pin"
                  value={form.direccion}
                  onChange={onInput}
                  placeholder="Av. Las Flores 123, Ñaña, Lima"
                  maxLength={255}
                  error={errores.direccion}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div data-field="latitud">
                <Field label="Latitud" hint="-90 a 90" error={errores.latitud}>
                  <Input
                    type="number"
                    step="0.000001"
                    name="latitud"
                    value={form.latitud}
                    onChange={onInput}
                    placeholder="-11.987800"
                    error={errores.latitud}
                  />
                </Field>
              </div>
              <div data-field="longitud">
                <Field label="Longitud" hint="-180 a 180" error={errores.longitud}>
                  <Input
                    type="number"
                    step="0.000001"
                    name="longitud"
                    value={form.longitud}
                    onChange={onInput}
                    placeholder="-76.898000"
                    error={errores.longitud}
                  />
                </Field>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={usarMiUbicacion}
                isLoading={requestingGeo}
                leftIcon={<span className="material-symbols-outlined text-[18px]">my_location</span>}
              >
                {requestingGeo ? 'Buscando…' : 'Usar mi ubicación'}
              </Button>

              {distanciaUpeu !== null && (
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold border
                  ${distanciaUpeu <= UPEU_RADIO_MAX_KM
                      ? 'bg-green-500/10 text-green-600 border-green-500/20'
                      : 'bg-error/10 text-error border-error/20'}
                `}
                >
                  <span className="material-symbols-outlined text-[14px]">school</span>
                  {distanciaUpeu <= UPEU_RADIO_MAX_KM ? 'A' : 'Fuera de rango:'}{' '}
                  {formatearDistancia(distanciaUpeu)} de UPeU
                </div>
              )}
            </div>

            <p className="text-[11px] text-on-surface-variant px-1">
              Las coordenadas son opcionales pero recomendadas: aparece tu propiedad en el mapa
              y los estudiantes pueden filtrarla por cercanía.
            </p>
          </Section>

          {/* SECCIÓN 3: DETALLES */}
          <Section
            step={3}
            icon="straighten"
            title="Detalles del espacio"
            subtitle="Datos prácticos para que el estudiante decida más rápido."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div data-field="area">
                <Field label="Área" hint="m² (opcional)" error={errores.area}>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    name="area"
                    icon="square_foot"
                    value={form.area}
                    onChange={onInput}
                    placeholder="12"
                    error={errores.area}
                  />
                </Field>
              </div>
              <div data-field="nroPiso">
                <Field label="Nro. de piso" hint="opcional" error={errores.nroPiso}>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    name="nroPiso"
                    icon="stairs"
                    value={form.nroPiso}
                    onChange={onInput}
                    placeholder="2"
                    error={errores.nroPiso}
                  />
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div data-field="disponibleDesde">
                <Field label="Disponible desde" hint="opcional">
                  <Input
                    type="date"
                    name="disponibleDesde"
                    icon="event"
                    value={form.disponibleDesde}
                    onChange={onInput}
                  />
                </Field>
              </div>
              <div data-field="estaDisponible" className="sm:pt-7">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 px-4 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`material-symbols-outlined text-[22px] ${form.estaDisponible ? 'text-primary' : 'text-outline'}`}
                    >
                      {form.estaDisponible ? 'check_circle' : 'pause_circle'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface">
                        {form.estaDisponible ? 'Disponible ahora' : 'Pausada'}
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        Visible en búsquedas si está activa.
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

          {/* SECCIÓN 4: SERVICIOS */}
          <Section
            step={4}
            icon="bolt"
            title="Servicios incluidos"
            subtitle="Marca todo lo que tu cuarto incluye."
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
                      : [...form.serviciosIncluidos, valor]
                  )
                }
              />
            )}
            {form.serviciosIncluidos.length > 0 && (
              <p className="text-[11px] text-on-surface-variant px-1">
                {form.serviciosIncluidos.length} servicio
                {form.serviciosIncluidos.length === 1 ? '' : 's'} seleccionado
                {form.serviciosIncluidos.length === 1 ? '' : 's'}.
              </p>
            )}
          </Section>

          {/* SECCIÓN 5: REGLAS */}
          <Section
            step={5}
            icon="rule"
            title="Reglas de la casa"
            subtitle="Sé claro: evita malentendidos con tus inquilinos."
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
                      : [...form.reglas, valor]
                  )
                }
              />
            )}
            {form.reglas.length > 0 && (
              <p className="text-[11px] text-on-surface-variant px-1">
                {form.reglas.length} regla{form.reglas.length === 1 ? '' : 's'} aplicará
                {form.reglas.length === 1 ? '' : 'n'}.
              </p>
            )}
          </Section>
        </div>

        {/* ============================================================ */}
        {/* Sidebar: Foto + Acciones (sticky)                              */}
        {/* ============================================================ */}
        <aside className="space-y-6 lg:sticky lg:top-6 self-start">
          <Card
            className="border-none shadow-sm bg-surface-container-low"
            hoverable={false}
            padding="md"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-primary/10 text-primary grid place-items-center">
                <span className="material-symbols-outlined">image</span>
              </div>
              <div>
                <h3 className="text-base font-black text-on-surface tracking-tight">
                  Foto de portada
                </h3>
                <p className="text-[11px] text-on-surface-variant leading-snug">
                  La primera impresión: usa una foto luminosa y nítida.
                </p>
              </div>
            </div>

            <div data-field="imagen">
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => !preview && fileInputRef.current?.click()}
                className={`relative aspect-[4/3] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all
                  ${preview
                    ? 'border-transparent'
                    : isDragging
                      ? 'border-primary bg-primary/5'
                      : errores.imagen
                        ? 'border-error/60 bg-error/5'
                        : 'border-outline-variant/40 hover:border-primary/50 bg-surface-container-lowest cursor-pointer'}
                `}
              >
                {preview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Vista previa"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex items-center justify-between">
                      <span className="text-[11px] text-white font-bold truncate">
                        {imageFile?.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-white/90 text-on-surface hover:bg-white transition-colors"
                          title="Cambiar imagen"
                        >
                          Cambiar
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage();
                          }}
                          className="w-7 h-7 grid place-items-center rounded-full bg-error/90 text-on-error hover:bg-error transition-colors"
                          title="Eliminar"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center px-6 select-none">
                    <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-2">
                      add_photo_alternate
                    </span>
                    <p className="text-sm font-bold text-on-surface">
                      Arrastra una foto aquí
                    </p>
                    <p className="text-[11px] text-on-surface-variant mt-1">
                      o haz clic para subir
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={onFileInput}
                  className="hidden"
                />
              </div>

              <p className="mt-2 text-[10px] text-on-surface-variant text-center">
                JPG, PNG o WEBP · Máximo 10 MB
              </p>
              {errores.imagen && (
                <p className="text-error text-[11px] font-bold px-1 mt-1.5 flex items-center gap-1 animate-fade-in">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {errores.imagen}
                </p>
              )}
            </div>
          </Card>

          {/* Acciones */}
          <Card
            className="border-none shadow-sm bg-surface-container-low"
            hoverable={false}
            padding="md"
          >
            {submitError && (
              <div className="mb-3 p-3 bg-error/10 text-error text-xs rounded-2xl border border-error/20 flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span className="font-medium">{submitError}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              isLoading={loading}
              variant="dark"
              className="w-full h-12 text-sm font-bold rounded-2xl"
              leftIcon={
                !loading ? (
                  <span className="material-symbols-outlined text-[20px]">publish</span>
                ) : undefined
              }
            >
              {loading ? 'Publicando…' : 'Publicar propiedad'}
            </Button>

            <Button
              asChild
              variant="ghost"
              className="w-full mt-2 rounded-2xl border border-outline-variant/30"
            >
              <Link href="/landlord/dashboard">Cancelar</Link>
            </Button>

            <div className="mt-4 pt-4 border-t border-outline-variant/15 flex items-start gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
              <p className="text-[11px] text-on-surface-variant leading-snug">
                Tu publicación pasa por una revisión rápida antes de ser visible para
                estudiantes. Te avisaremos por correo cuando se apruebe.
              </p>
            </div>
          </Card>
        </aside>
      </form>
    </div>
  );
}

// =============================================================================
// Skeleton para chips mientras carga el catálogo
// =============================================================================
function SkeletonChips() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          className="h-9 w-24 rounded-full bg-surface-container-high animate-pulse"
        />
      ))}
    </div>
  );
}
