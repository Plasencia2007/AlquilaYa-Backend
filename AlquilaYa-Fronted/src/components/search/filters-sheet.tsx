'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  SlidersHorizontal, Minus, Plus, Star, Bookmark, Search, BadgeCheck, ImageIcon,
  Wifi, CookingPot, Shirt, Tv, Car, ShieldCheck, Droplets, Flame,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  filtrosFormSchema,
  PRECIO_MAX_DEFAULT,
  PRECIO_MIN_DEFAULT,
  DISTANCIA_MAX_DEFAULT,
  TIPOS_PROPIEDAD,
  type FiltrosFormData,
  type Filtros,
} from '@/schemas/search-schema';
import { contarFiltrosActivos, serializarFiltros } from '@/lib/search-url';
import { cn } from '@/lib/cn';
import { notify } from '@/lib/notify';
import { useSavedSearchesStore } from '@/stores/saved-searches-store';
import { PriceHistogram } from './price-histogram';

/* ─── datos ─────────────────────────────────────────────────────────────── */

// Claves que coinciden EXACTO con SERVICIOS_CATALOGO (types/propiedad.ts).
// Esas son las claves que el formulario del arrendador guarda en la BD.
const SERVICIOS_POPULARES: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'WIFI',          label: 'Wi-Fi',         icon: Wifi },
  { key: 'LAVANDERIA',    label: 'Lavandería',     icon: Shirt },
  { key: 'ESTACIONAMIENTO', label: 'Estacionamiento', icon: Car },
  { key: 'SEGURIDAD_24H', label: 'Seguridad 24h', icon: ShieldCheck },
];

const SERVICIOS_TODOS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'WIFI',               label: 'Wi-Fi',             icon: Wifi },
  { key: 'LUZ',                label: 'Luz',               icon: Droplets },
  { key: 'AGUA',               label: 'Agua',              icon: Droplets },
  { key: 'GAS',                label: 'Gas',               icon: Flame },
  { key: 'CABLE_TV',           label: 'Cable TV',          icon: Tv },
  { key: 'LAVANDERIA',         label: 'Lavandería',        icon: Shirt },
  { key: 'COCINA_COMPARTIDA',  label: 'Cocina compartida', icon: CookingPot },
  { key: 'ESTACIONAMIENTO',    label: 'Estacionamiento',   icon: Car },
  { key: 'SEGURIDAD_24H',      label: 'Seguridad 24h',    icon: ShieldCheck },
];

const TIPO_LABELS: Record<string, string> = {
  CUARTO_INDIVIDUAL: 'Cuarto individual',
  CUARTO_COMPARTIDO: 'Cuarto compartido',
  DEPARTAMENTO:      'Departamento',
  MINI_DEPA:         'Mini depa',
  CASA:              'Casa',
  SUITE:             'Suite',
};

/** Etiqueta legible para una búsqueda guardada (ej. "Ñaña · Suite · hasta S/500"). */
function etiquetaDesdeFiltros(f: Filtros): string {
  const partes: string[] = [];
  if (f.zona?.trim()) partes.push(f.zona.trim());
  if (f.tipo) partes.push(TIPO_LABELS[f.tipo] ?? f.tipo);
  if (typeof f.precioMax === 'number') partes.push(`hasta S/${f.precioMax}`);
  else if (typeof f.precioMin === 'number') partes.push(`desde S/${f.precioMin}`);
  if (f.servicios.length > 0) {
    partes.push(`${f.servicios.length} servicio${f.servicios.length === 1 ? '' : 's'}`);
  }
  if (typeof f.calificacionMin === 'number' && f.calificacionMin > 0) {
    partes.push(`${f.calificacionMin}★+`);
  }
  return partes.length > 0 ? partes.join(' · ') : 'Todos los cuartos';
}

interface Props {
  filtros: Filtros;
  onApply: (next: Partial<Filtros>) => void;
  onClear: () => void;
  total: number;
}

function defaultsDesde(filtros: Filtros): FiltrosFormData {
  return {
    zona: filtros.zona,
    q: filtros.q ?? '',
    precioMin: filtros.precioMin ?? PRECIO_MIN_DEFAULT,
    precioMax: filtros.precioMax ?? PRECIO_MAX_DEFAULT,
    tipo: filtros.tipo,
    servicios: filtros.servicios,
    distanciaMaxKm: filtros.distanciaMaxKm ?? DISTANCIA_MAX_DEFAULT,
    calificacionMin: filtros.calificacionMin ?? 0,
    capacidadMin: filtros.capacidadMin,
    dormitoriosMin: filtros.dormitoriosMin,
    soloVerificados: filtros.soloVerificados ?? false,
    soloConFotos: filtros.soloConFotos ?? false,
    orden: filtros.orden,
    view: filtros.view,
  };
}

/* ─── componente principal ───────────────────────────────────────────────── */

export function FiltersSheet({ filtros, onApply, onClear, total }: Props) {
  const [open, setOpen] = useState(false);
  const activos = contarFiltrosActivos(filtros);
  const guardarBusqueda = useSavedSearchesStore((s) => s.guardar);

  const form = useForm<FiltrosFormData>({
    resolver: zodResolver(filtrosFormSchema),
    defaultValues: defaultsDesde(filtros),
  });

  useEffect(() => {
    if (open) form.reset(defaultsDesde(filtros));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = (values: FiltrosFormData) => {
    onApply({
      q: values.q?.trim() ? values.q.trim() : undefined,
      precioMin: values.precioMin === PRECIO_MIN_DEFAULT ? undefined : values.precioMin,
      precioMax: values.precioMax === PRECIO_MAX_DEFAULT ? undefined : values.precioMax,
      tipo: values.tipo,
      servicios: values.servicios,
      distanciaMaxKm:
        values.distanciaMaxKm === DISTANCIA_MAX_DEFAULT ? undefined : values.distanciaMaxKm,
      calificacionMin: values.calificacionMin > 0 ? values.calificacionMin : undefined,
      capacidadMin: values.capacidadMin,
      dormitoriosMin: values.dormitoriosMin,
      soloVerificados: values.soloVerificados ? true : undefined,
      soloConFotos: values.soloConFotos ? true : undefined,
    });
    setOpen(false);
  };

  // Guarda la búsqueda con los valores ACTUALES del formulario (aún sin aplicar) más los
  // filtros de contexto que el sheet no gestiona (universidad, zona del catálogo, orden).
  const onGuardar = () => {
    const v = form.getValues();
    const filtrosActuales: Filtros = {
      ...filtros,
      zona: v.zona,
      q: v.q?.trim() ? v.q.trim() : undefined,
      precioMin: v.precioMin === PRECIO_MIN_DEFAULT ? undefined : v.precioMin,
      precioMax: v.precioMax === PRECIO_MAX_DEFAULT ? undefined : v.precioMax,
      tipo: v.tipo,
      servicios: v.servicios,
      distanciaMaxKm: v.distanciaMaxKm === DISTANCIA_MAX_DEFAULT ? undefined : v.distanciaMaxKm,
      calificacionMin: v.calificacionMin > 0 ? v.calificacionMin : undefined,
      capacidadMin: v.capacidadMin,
      dormitoriosMin: v.dormitoriosMin,
      soloVerificados: v.soloVerificados ? true : undefined,
      soloConFotos: v.soloConFotos ? true : undefined,
    };
    const { duplicada } = guardarBusqueda({
      etiqueta: etiquetaDesdeFiltros(filtrosActuales),
      query: serializarFiltros(filtrosActuales),
    });
    if (duplicada) {
      notify.info('Ya guardaste esta búsqueda', 'La ves en tu panel › Búsquedas guardadas.');
    } else {
      notify.success('Búsqueda guardada', 'La encuentras en tu panel › Búsquedas guardadas.');
    }
  };

  const onLimpiar = () => {
    form.reset({
      q: '',
      precioMin: PRECIO_MIN_DEFAULT,
      precioMax: PRECIO_MAX_DEFAULT,
      tipo: undefined,
      servicios: [],
      distanciaMaxKm: DISTANCIA_MAX_DEFAULT,
      calificacionMin: 0,
      capacidadMin: undefined,
      dormitoriosMin: undefined,
      soloVerificados: false,
      soloConFotos: false,
      orden: filtros.orden,
      view: filtros.view,
    });
    onClear();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-10 gap-2 rounded-full border-border bg-card text-sm font-semibold shadow-sm"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filtros
          {activos > 0 && (
            <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activos}
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[90vh] w-[calc(100%-1.5rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-3xl p-0 shadow-2xl">
        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-4">
          <DialogTitle className="text-center text-base font-bold tracking-tight">Filtros</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">

            {/* ── 0. Búsqueda por palabra clave (q, ítem 126) ── */}
            <Controller
              control={form.control}
              name="q"
              render={({ field }) => (
                <section className="px-6 pt-6 pb-2">
                  <h3 className="mb-3 text-lg font-bold text-foreground">Palabra clave</h3>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      type="search"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder="Ej. amoblado con baño propio"
                      aria-label="Buscar por palabra clave"
                      maxLength={120}
                      className="h-11 rounded-xl pl-9"
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Busca en el título, la descripción y la dirección del aviso.
                  </p>
                </section>
              )}
            />

            <Hr />

            {/* ── 1. Más populares ── */}
            <Controller
              control={form.control}
              name="servicios"
              render={({ field }) => (
                <section className="px-6 py-6">
                  <h3 className="mb-4 text-lg font-bold text-foreground">Más populares</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {SERVICIOS_POPULARES.map(({ key, label, icon: Icon }) => {
                      const on = field.value.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            on
                              ? field.onChange(field.value.filter((x) => x !== key))
                              : field.onChange([...field.value, key])
                          }
                          className={cn(
                            'group flex flex-col items-center gap-2 rounded-2xl border-2 px-2 py-4 text-center transition-all',
                            on
                              ? 'border-foreground bg-foreground/5 shadow-sm'
                              : 'border-border hover:border-foreground/40',
                          )}
                        >
                          <Icon className={cn('size-6', on ? 'text-foreground' : 'text-muted-foreground')} />
                          <span className={cn('text-[11px] font-semibold leading-tight', on ? 'text-foreground' : 'text-muted-foreground')}>
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            />

            <Hr />

            {/* ── 2. Tipo de alojamiento ── */}
            <Controller
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <section className="px-6 py-6">
                  <h3 className="mb-4 text-lg font-bold text-foreground">Tipo de alojamiento</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => field.onChange(undefined)}
                      className={cn(
                        'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                        !field.value
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border bg-card text-foreground hover:border-foreground/40',
                      )}
                    >
                      Cualquier tipo
                    </button>
                    {TIPOS_PROPIEDAD.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => field.onChange(field.value === t ? undefined : t)}
                        className={cn(
                          'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                          field.value === t
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border bg-card text-foreground hover:border-foreground/40',
                        )}
                      >
                        {TIPO_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            />

            <Hr />

            {/* ── 3. Rango de precios con histograma ── */}
            <Controller
              control={form.control}
              name="precioMin"
              render={({ field: minField }) => (
                <Controller
                  control={form.control}
                  name="precioMax"
                  render={({ field: maxField }) => (
                    <section className="px-6 py-6">
                      <h3 className="mb-1 text-lg font-bold text-foreground">Rango de precios</h3>
                      <p className="mb-5 text-sm text-muted-foreground">Precio mensual (S/)</p>

                      {/* Mini histograma: distribución real de la oferta actual */}
                      <PriceHistogram
                        filtros={filtros}
                        min={PRECIO_MIN_DEFAULT}
                        max={PRECIO_MAX_DEFAULT}
                        valueMin={minField.value}
                        valueMax={maxField.value}
                      />

                      <div className="mt-2">
                        <Slider
                          min={PRECIO_MIN_DEFAULT}
                          max={PRECIO_MAX_DEFAULT}
                          step={50}
                          value={[minField.value, maxField.value]}
                          onValueChange={(vals) => {
                            minField.onChange(vals[0]);
                            maxField.onChange(vals[1]);
                          }}
                        />
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <RangoPill label="Mínimo" value={`S/ ${minField.value}`} />
                        <div className="h-px w-4 shrink-0 bg-border" />
                        <RangoPill
                          label="Máximo"
                          value={`S/ ${maxField.value}${maxField.value >= PRECIO_MAX_DEFAULT ? '+' : ''}`}
                        />
                      </div>
                    </section>
                  )}
                />
              )}
            />

            <Hr />

            {/* ── 4. Distancia a UPeU ── */}
            <Controller
              control={form.control}
              name="distanciaMaxKm"
              render={({ field }) => (
                <section className="px-6 py-6">
                  <h3 className="mb-4 text-lg font-bold text-foreground">Distancia máxima a UPeU</h3>
                  <Slider
                    min={1}
                    max={DISTANCIA_MAX_DEFAULT}
                    step={1}
                    value={[field.value]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                  />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Hasta{' '}
                    <span className="font-bold text-foreground">{field.value} km</span>
                  </p>
                </section>
              )}
            />

            <Hr />

            {/* ── 5. Capacidad y distribución (capacidadMin / dormitoriosMin → backend) ── */}
            <section className="px-6 py-6">
              <h3 className="mb-4 text-lg font-bold text-foreground">Capacidad y distribución</h3>
              <div className="space-y-4">
                <Controller
                  control={form.control}
                  name="capacidadMin"
                  render={({ field }) => (
                    <FilaStepper
                      label="Personas (mín.)"
                      value={field.value}
                      onChange={field.onChange}
                      max={10}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="dormitoriosMin"
                  render={({ field }) => (
                    <FilaStepper
                      label="Dormitorios (mín.)"
                      value={field.value}
                      onChange={field.onChange}
                      max={8}
                    />
                  )}
                />
              </div>
            </section>

            <Hr />

            {/* ── 6. Servicios ── */}
            <Controller
              control={form.control}
              name="servicios"
              render={({ field }) => (
                <section className="px-6 py-6">
                  <h3 className="mb-4 text-lg font-bold text-foreground">Servicios</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {SERVICIOS_TODOS.map(({ key, label, icon: Icon }) => {
                      const on = field.value.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            on
                              ? field.onChange(field.value.filter((x) => x !== key))
                              : field.onChange([...field.value, key])
                          }
                          className={cn(
                            'flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-sm font-medium transition-all',
                            on
                              ? 'border-foreground bg-foreground/5 text-foreground shadow-sm'
                              : 'border-border text-foreground hover:border-foreground/40',
                          )}
                        >
                          <Icon className={cn('size-5 shrink-0', on ? 'text-foreground' : 'text-muted-foreground')} />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            />

            <Hr />

            {/* ── 7. Calificación mínima ── */}
            <Controller
              control={form.control}
              name="calificacionMin"
              render={({ field }) => (
                <section className="px-6 py-6">
                  <h3 className="mb-4 text-lg font-bold text-foreground">Calificación mínima</h3>
                  <div className="flex flex-wrap gap-2">
                    {[0, 3, 4, 4.5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => field.onChange(n)}
                        className={cn(
                          'rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors',
                          field.value === n
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border bg-card text-foreground hover:border-foreground/40',
                        )}
                      >
                        {n === 0 ? (
                          'Cualquiera'
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <Star className="size-3.5 fill-current" />
                            {n.toFixed(1)}+
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            />

            <Hr />

            {/* ── 8. Toggles de calidad (ítem 125) ── */}
            <section className="px-6 py-6">
              <h3 className="mb-4 text-lg font-bold text-foreground">Calidad del aviso</h3>
              <div className="space-y-3">
                <Controller
                  control={form.control}
                  name="soloVerificados"
                  render={({ field }) => (
                    <ToggleFila
                      icon={BadgeCheck}
                      label="Solo arrendadores verificados"
                      hint="Avisos de arrendadores con identidad verificada."
                      checked={!!field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="soloConFotos"
                  render={({ field }) => (
                    <ToggleFila
                      icon={ImageIcon}
                      label="Solo con fotos"
                      hint="Excluye avisos sin ninguna imagen."
                      checked={!!field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            </section>
          </div>

          {/* Footer */}
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-background px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onLimpiar}
                className="text-sm font-bold text-foreground underline underline-offset-4 hover:text-muted-foreground"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={onGuardar}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-foreground transition-colors hover:text-primary"
              >
                <Bookmark className="size-4" aria-hidden />
                Guardar búsqueda
              </button>
            </div>
            <Button
              type="submit"
              size="lg"
              className="rounded-2xl bg-foreground px-6 text-sm font-bold text-background hover:bg-foreground/90"
            >
              {total > 0
                ? `Mostrar ${total} resultado${total === 1 ? '' : 's'}`
                : 'Aplicar filtros'}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── sub-componentes ────────────────────────────────────────────────────── */

function Hr() {
  return <div className="h-px bg-border/60 mx-6" />;
}

/** Fila con icono + etiqueta + switch, para los toggles de calidad (ítem 125). */
function ToggleFila({
  icon: Icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border px-4 py-3 transition-colors hover:border-foreground/40">
      <span className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}

function RangoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function FilaStepper({
  label,
  value,
  onChange,
  max = 10,
}: {
  label: string;
  value?: number;
  onChange: (v: number | undefined) => void;
  max?: number;
}) {
  const actual = value ?? 0;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Disminuir"
          disabled={actual <= 0}
          onClick={() => onChange(actual <= 1 ? undefined : actual - 1)}
          className="flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-foreground disabled:opacity-30"
        >
          <Minus className="size-4" />
        </button>
        <span className="min-w-[5.5rem] text-center text-sm font-semibold text-foreground">
          {actual === 0 ? 'Cualquiera' : `${actual}${actual >= max ? '+' : ''}`}
        </span>
        <button
          type="button"
          aria-label="Aumentar"
          disabled={actual >= max}
          onClick={() => onChange(actual + 1)}
          className="flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-foreground disabled:opacity-30"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
