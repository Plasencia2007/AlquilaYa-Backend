'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  filtrosFormSchema,
  PRECIO_MAX_DEFAULT,
  PRECIO_MIN_DEFAULT,
  DISTANCIA_MAX_DEFAULT,
  TIPOS_PROPIEDAD,
  type FiltrosFormData,
  type Filtros,
} from '@/schemas/search-schema';
import { useMediaQuery } from '@/hooks/use-media-query';
import { contarFiltrosActivos } from '@/lib/search-url';
import { cn } from '@/lib/cn';

const SERVICIOS_OPCIONES = [
  'Wi-Fi',
  'Baño privado',
  'Cocina',
  'Lavandería',
  'Aire acondicionado',
  'Estacionamiento',
  'Gimnasio',
  'Seguridad',
  'Mascotas',
  'Cable',
];

const TIPO_LABELS: Record<string, string> = {
  CUARTO: 'Cuarto',
  DEPARTAMENTO: 'Departamento',
  ESTUDIO: 'Estudio',
  CASA: 'Casa',
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
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const activos = contarFiltrosActivos(filtros);

  const form = useForm<FiltrosFormData>({
    resolver: zodResolver(filtrosFormSchema),
    defaultValues: defaultsDesde(filtros),
  });

  // Cuando se abre, sincroniza el draft con los filtros vigentes en URL
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
      orden: filtros.orden,
      view: filtros.view,
    });
    onClear();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
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
      </SheetTrigger>
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        className={cn(
          'flex flex-col gap-0 bg-background p-0',
          isDesktop ? 'w-full max-w-md' : 'h-[88vh] rounded-t-3xl',
        )}
      >
        <SheetHeader className="border-b border-border px-6 py-4 text-left">
          <SheetTitle className="text-lg font-bold">Filtros</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
            {/* Precio */}
            <Controller
              control={form.control}
              name="precioMin"
              render={({ field: minField }) => (
                <Controller
                  control={form.control}
                  name="precioMax"
                  render={({ field: maxField }) => (
                    <fieldset className="space-y-3">
                      <legend className="text-sm font-bold text-foreground">
                        Precio mensual (S/)
                      </legend>
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
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>S/ {minField.value}</span>
                        <span>S/ {maxField.value}</span>
                      </div>
                    </fieldset>
                  )}
                />
              )}
            />

            {/* Distancia a UPeU */}
            <Controller
              control={form.control}
              name="distanciaMaxKm"
              render={({ field }) => (
                <fieldset className="space-y-3">
                  <legend className="text-sm font-bold text-foreground">
                    Distancia máxima a UPeU
                  </legend>
                  <Slider
                    min={1}
                    max={DISTANCIA_MAX_DEFAULT}
                    step={1}
                    value={[field.value]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                  />
                  <p className="text-xs text-muted-foreground">
                    Hasta <span className="font-semibold text-foreground">{field.value} km</span>
                  </p>
                </fieldset>
              )}
            />

            {/* Tipo */}
            <Controller
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <fieldset className="space-y-3">
                  <legend className="text-sm font-bold text-foreground">Tipo de espacio</legend>
                  <RadioGroup
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v || undefined)}
                    className="grid grid-cols-2 gap-2"
                  >
                    {TIPOS_PROPIEDAD.map((t) => (
                      <Label
                        key={t}
                        htmlFor={`tipo-${t}`}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium hover:border-primary"
                      >
                        <RadioGroupItem value={t} id={`tipo-${t}`} />
                        {TIPO_LABELS[t]}
                      </Label>
                    ))}
                  </RadioGroup>
                  {field.value && (
                    <button
                      type="button"
                      onClick={() => field.onChange(undefined)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Cualquier tipo
                    </button>
                  )}
                </fieldset>
              )}
            />

            {/* Servicios */}
            <Controller
              control={form.control}
              name="servicios"
              render={({ field }) => (
                <fieldset className="space-y-3">
                  <legend className="text-sm font-bold text-foreground">Servicios</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {SERVICIOS_OPCIONES.map((s) => {
                      const checked = field.value.includes(s);
                      return (
                        <Label
                          key={s}
                          htmlFor={`serv-${s}`}
                          className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium hover:border-primary"
                        >
                          <Checkbox
                            id={`serv-${s}`}
                            checked={checked}
                            onCheckedChange={(c) => {
                              if (c) field.onChange([...field.value, s]);
                              else field.onChange(field.value.filter((x) => x !== s));
                            }}
                          />
                          {s}
                        </Label>
                      );
                    })}
                  </div>
                </fieldset>
              )}
            />

            {/* Calificación mínima */}
            <Controller
              control={form.control}
              name="calificacionMin"
              render={({ field }) => (
                <fieldset className="space-y-3">
                  <legend className="text-sm font-bold text-foreground">Calificación mínima</legend>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Cualquiera</SelectItem>
                      <SelectItem value="3">★ 3.0 o más</SelectItem>
                      <SelectItem value="4">★ 4.0 o más</SelectItem>
                      <SelectItem value="4.5">★ 4.5 o más</SelectItem>
                    </SelectContent>
                  </Select>
                </fieldset>
              )}
            />
          </div>

          <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-background px-6 py-4">
            <Button type="button" variant="ghost" onClick={onLimpiar} className="text-sm font-bold">
              Limpiar
            </Button>
            <Button
              type="submit"
              size="lg"
              className="flex-1 rounded-full text-sm font-bold shadow-lg shadow-primary/20"
            >
              {total > 0 ? `Mostrar ${total} resultado${total === 1 ? '' : 's'}` : 'Aplicar filtros'}
            </Button>
          </footer>
        </form>
      </SheetContent>
    </Sheet>
  );
}
