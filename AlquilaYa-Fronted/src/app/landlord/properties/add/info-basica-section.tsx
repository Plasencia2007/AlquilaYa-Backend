'use client';

import { type ChangeEvent } from 'react';

import { type PrecioSugerido } from '@/services/landlord-property-service';
import { cn } from '@/lib/cn';
import { NumberInput } from '@/components/ui/number-input';
import type { PeriodoAlquiler, TipoPropiedad } from '@/types/propiedad';
import { CustomSelect, Field, InputField, Section } from './property-form-primitives';
import type { Errores, FormState } from './property-form-types';

interface SelectOption<T extends string> {
  value: T;
  label: string;
  icon?: string;
  description?: string;
}

interface InfoBasicaSectionProps {
  form: FormState;
  errores: Errores;
  onInput: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  setField<K extends keyof FormState>(key: K, value: FormState[K]): void;
  tiposOptions: SelectOption<TipoPropiedad>[];
  periodosOptions: SelectOption<PeriodoAlquiler>[];
  precioSugerido: PrecioSugerido | null;
}

export function InfoBasicaSection({
  form,
  errores,
  onInput,
  setField,
  tiposOptions,
  periodosOptions,
  precioSugerido,
}: InfoBasicaSectionProps) {
  return (
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
          <Field label="Precio" hint="en soles" required error={errores.precio}>
            <NumberInput
              name="precio"
              value={form.precio}
              onValueChange={(v) => setField('precio', v)}
              placeholder="450.00"
              error={!!errores.precio}
              className={cn(
                'h-auto rounded-xl bg-input py-2.5 pl-10 pr-4 text-sm',
                'focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:border-primary',
                errores.precio
                  ? 'border-destructive/60 focus-visible:ring-destructive/20 focus-visible:border-destructive'
                  : 'border-border hover:border-primary/40',
              )}
            />
          </Field>
          {precioSugerido && (
            <button
              type="button"
              onClick={() => setField('precio', String(precioSugerido.promedio ?? ''))}
              title="Usar el precio promedio"
              className="mt-1.5 flex w-full items-start gap-2 rounded-lg border border-primary/15 bg-primary/5 px-2.5 py-2 text-left transition-colors hover:bg-primary/10"
            >
              <span className="material-symbols-outlined mt-0.5 text-[16px] text-primary">lightbulb</span>
              <span className="text-[11px] leading-snug text-muted-foreground">
                Avisos parecidos{' '}
                {precioSugerido.ambito === 'ZONA' ? 'en esta zona' : 'cerca de tu universidad'}:{' '}
                <span className="font-bold text-foreground">
                  S/{Math.round(precioSugerido.min ?? 0).toLocaleString('es-PE')}–S/
                  {Math.round(precioSugerido.max ?? 0).toLocaleString('es-PE')}
                </span>{' '}
                (promedio{' '}
                <span className="font-bold text-primary">
                  S/{Math.round(precioSugerido.promedio ?? 0).toLocaleString('es-PE')}
                </span>{' '}
                · {precioSugerido.cantidad} {precioSugerido.cantidad === 1 ? 'aviso' : 'avisos'}).
                Toca para usar el promedio.
              </span>
            </button>
          )}
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
  );
}
