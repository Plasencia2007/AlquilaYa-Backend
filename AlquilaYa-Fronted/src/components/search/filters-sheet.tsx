'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  SlidersHorizontal, Minus, Plus, Star,
  Wifi, ShowerHead, CookingPot, Shirt, Snowflake, Car, Dumbbell, ShieldCheck, PawPrint, Tv,
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

const SERVICIOS: { nombre: string; icon: LucideIcon }[] = [
  { nombre: 'Wi-Fi', icon: Wifi },
  { nombre: 'Cocina', icon: CookingPot },
  { nombre: 'Baño privado', icon: ShowerHead },
  { nombre: 'Lavandería', icon: Shirt },
  { nombre: 'Aire acondicionado', icon: Snowflake },
  { nombre: 'Estacionamiento', icon: Car },
  { nombre: 'Gimnasio', icon: Dumbbell },
  { nombre: 'Seguridad', icon: ShieldCheck },
  { nombre: 'Mascotas', icon: PawPrint },
  { nombre: 'Cable', icon: Tv },
];

const TIPO_LABELS: Record<string, string> = {
  CUARTO_INDIVIDUAL: 'Cuarto individual',
  CUARTO_COMPARTIDO: 'Cuarto compartido',
  DEPARTAMENTO: 'Departamento',
  MINI_DEPA: 'Mini depa',
  CASA: 'Casa',
  SUITE: 'Suite',
};

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

      <DialogContent className="flex max-h-[85vh] w-[calc(100%-1.5rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-3xl p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle className="text-center text-base font-bold">Filtros</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-6">
            {/* Tipo de alojamiento */}
            <Controller
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <Seccion titulo="Tipo de alojamiento">
                  <div className="flex flex-wrap gap-2">
                    <Pill active={!field.value} onClick={() => field.onChange(undefined)}>
                      Cualquier tipo
                    </Pill>
                    {TIPOS_PROPIEDAD.map((t) => (
                      <Pill
                        key={t}
                        active={field.value === t}
                        onClick={() => field.onChange(field.value === t ? undefined : t)}
                      >
                        {TIPO_LABELS[t]}
                      </Pill>
                    ))}
                  </div>
                </Seccion>
              )}
            />

            <Hr />

            {/* Rango de precios */}
            <Controller
              control={form.control}
              name="precioMin"
              render={({ field: minField }) => (
                <Controller
                  control={form.control}
                  name="precioMax"
                  render={({ field: maxField }) => (
                    <Seccion titulo="Rango de precios" subtitulo="Precio mensual (S/)">
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
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <RangoPill label="Mínimo" value={`S/ ${minField.value}`} />
                        <span className="h-px w-4 bg-border" />
                        <RangoPill
                          label="Máximo"
                          value={`S/ ${maxField.value}${maxField.value >= PRECIO_MAX_DEFAULT ? '+' : ''}`}
                        />
                      </div>
                    </Seccion>
                  )}
                />
              )}
            />

            <Hr />

            {/* Distancia a UPeU */}
            <Controller
              control={form.control}
              name="distanciaMaxKm"
              render={({ field }) => (
                <Seccion titulo="Distancia máxima a UPeU">
                  <Slider
                    min={1}
                    max={DISTANCIA_MAX_DEFAULT}
                    step={1}
                    value={[field.value]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Hasta <span className="font-semibold text-foreground">{field.value} km</span>
                  </p>
                </Seccion>
              )}
            />

            <Hr />

            {/* Capacidad (steppers) */}
            <Controller
              control={form.control}
              name="capacidadMin"
              render={({ field }) => (
                <Seccion titulo="Capacidad">
                  <FilaStepper
                    label="Personas"
                    value={field.value}
                    onChange={field.onChange}
                    max={10}
                  />
                </Seccion>
              )}
            />

            <Hr />

            {/* Servicios (chips con íconos) */}
            <Controller
              control={form.control}
              name="servicios"
              render={({ field }) => (
                <Seccion titulo="Servicios">
                  <div className="flex flex-wrap gap-2">
                    {SERVICIOS.map(({ nombre, icon: Icon }) => {
                      const checked = field.value.includes(nombre);
                      return (
                        <button
                          key={nombre}
                          type="button"
                          onClick={() =>
                            checked
                              ? field.onChange(field.value.filter((x) => x !== nombre))
                              : field.onChange([...field.value, nombre])
                          }
                          className={cn(
                            'flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors',
                            checked
                              ? 'border-foreground bg-foreground/5 text-foreground'
                              : 'border-border bg-card text-foreground hover:border-foreground/40',
                          )}
                        >
                          <Icon className="size-4" />
                          {nombre}
                        </button>
                      );
                    })}
                  </div>
                </Seccion>
              )}
            />

            <Hr />

            {/* Calificación mínima */}
            <Controller
              control={form.control}
              name="calificacionMin"
              render={({ field }) => (
                <Seccion titulo="Calificación mínima">
                  <div className="flex flex-wrap gap-2">
                    {[0, 3, 4, 4.5].map((n) => (
                      <Pill
                        key={n}
                        active={field.value === n}
                        onClick={() => field.onChange(n)}
                      >
                        {n === 0 ? (
                          'Cualquiera'
                        ) : (
                          <span className="flex items-center gap-1">
                            <Star className="size-3.5 fill-current" /> {n.toFixed(1)}+
                          </span>
                        )}
                      </Pill>
                    ))}
                  </div>
                </Seccion>
              )}
            />
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={onLimpiar}
              className="text-sm font-bold text-foreground underline-offset-4 hover:underline"
            >
              Limpiar filtros
            </button>
            <Button
              type="submit"
              size="lg"
              className="rounded-xl px-6 text-sm font-bold"
            >
              {total > 0 ? `Mostrar ${total} resultado${total === 1 ? '' : 's'}` : 'Aplicar filtros'}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Seccion({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="text-lg font-bold text-foreground">{titulo}</legend>
      {subtitulo && <p className="mb-3 mt-0.5 text-sm text-muted-foreground">{subtitulo}</p>}
      <div className={subtitulo ? '' : 'mt-3'}>{children}</div>
    </fieldset>
  );
}

function Hr() {
  return <div className="h-px bg-border" />;
}

function Pill({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-card text-foreground hover:border-foreground/40',
      )}
    >
      {children}
    </button>
  );
}

function RangoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-border bg-card px-4 py-2.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
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
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Disminuir"
          disabled={actual <= 0}
          onClick={() => onChange(actual <= 1 ? undefined : actual - 1)}
          className="flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-foreground disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <span className="min-w-[5rem] text-center text-sm font-semibold text-foreground">
          {actual === 0 ? 'Cualquiera' : `${actual}${actual >= max ? '+' : ''}`}
        </span>
        <button
          type="button"
          aria-label="Aumentar"
          disabled={actual >= max}
          onClick={() => onChange(actual + 1)}
          className="flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-foreground disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
