'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  SlidersHorizontal, Minus, Plus, Star,
  Wifi, ShowerHead, CookingPot, Shirt, Tv, Car, ShieldCheck, Droplets, Flame,
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
import {
  filtrosFormSchema,
  PRECIO_MAX_DEFAULT,
  PRECIO_MIN_DEFAULT,
  DISTANCIA_MAX_DEFAULT,
  TIPOS_PROPIEDAD,
  type FiltrosFormData,
  type Filtros,
} from '@/schemas/search-schema';
import { contarFiltrosActivos } from '@/lib/search-url';
import { cn } from '@/lib/cn';

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

// Histograma visual estático para el rango de precios (distribución representativa)
const HIST_BARS = [3,5,8,12,18,24,30,38,44,50,54,58,60,58,54,48,42,36,30,24,18,14,10,7,5,4,3,3,2,2];

interface Props {
  filtros: Filtros;
  onApply: (next: Partial<Filtros>) => void;
  onClear: () => void;
  total: number;
}

function defaultsDesde(filtros: Filtros): FiltrosFormData {
  return {
    zona: filtros.zona,
    precioMin: filtros.precioMin ?? PRECIO_MIN_DEFAULT,
    precioMax: filtros.precioMax ?? PRECIO_MAX_DEFAULT,
    tipo: filtros.tipo,
    servicios: filtros.servicios,
    distanciaMaxKm: filtros.distanciaMaxKm ?? DISTANCIA_MAX_DEFAULT,
    calificacionMin: filtros.calificacionMin ?? 0,
    orden: filtros.orden,
    view: filtros.view,
  };
}

/* ─── componente principal ───────────────────────────────────────────────── */

export function FiltersSheet({ filtros, onApply, onClear, total }: Props) {
  const [open, setOpen] = useState(false);
  const activos = contarFiltrosActivos(filtros);

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
      precioMin: values.precioMin === PRECIO_MIN_DEFAULT ? undefined : values.precioMin,
      precioMax: values.precioMax === PRECIO_MAX_DEFAULT ? undefined : values.precioMax,
      tipo: values.tipo,
      servicios: values.servicios,
      distanciaMaxKm:
        values.distanciaMaxKm === DISTANCIA_MAX_DEFAULT ? undefined : values.distanciaMaxKm,
      calificacionMin: values.calificacionMin > 0 ? values.calificacionMin : undefined,
      capacidadMin: values.capacidadMin,
    });
    setOpen(false);
  };

  const onLimpiar = () => {
    form.reset({
      precioMin: PRECIO_MIN_DEFAULT,
      precioMax: PRECIO_MAX_DEFAULT,
      tipo: undefined,
      servicios: [],
      distanciaMaxKm: DISTANCIA_MAX_DEFAULT,
      calificacionMin: 0,
      capacidadMin: undefined,
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

                      {/* Mini histograma */}
                      <PriceHistogram
                        bars={HIST_BARS}
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

            {/* ── 5. Capacidad ── */}
            <Controller
              control={form.control}
              name="capacidadMin"
              render={({ field }) => (
                <section className="px-6 py-6">
                  <h3 className="mb-4 text-lg font-bold text-foreground">Capacidad</h3>
                  <FilaStepper
                    label="Personas"
                    value={field.value}
                    onChange={field.onChange}
                    max={10}
                  />
                </section>
              )}
            />

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
          </div>

          {/* Footer */}
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 bg-background px-6 py-4">
            <button
              type="button"
              onClick={onLimpiar}
              className="text-sm font-bold text-foreground underline underline-offset-4 hover:text-muted-foreground"
            >
              Limpiar filtros
            </button>
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

/** Histograma visual para el rango de precios */
function PriceHistogram({
  bars,
  min,
  max,
  valueMin,
  valueMax,
}: {
  bars: number[];
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
}) {
  const maxBar = Math.max(...bars);
  const total = max - min;

  return (
    <div className="flex h-16 items-end gap-0.5" aria-hidden>
      {bars.map((h, i) => {
        const barMin = min + (total / bars.length) * i;
        const barMax = min + (total / bars.length) * (i + 1);
        const inRange = barMax > valueMin && barMin < valueMax;
        return (
          <div
            key={i}
            className={cn(
              'flex-1 rounded-sm transition-colors',
              inRange ? 'bg-foreground' : 'bg-muted-foreground/25',
            )}
            style={{ height: `${(h / maxBar) * 100}%` }}
          />
        );
      })}
    </div>
  );
}
