'use client';

import { type ChangeEvent } from 'react';

import { cn } from '@/lib/cn';
import { POLITICA_CANCELACION_INFO, POLITICAS_CANCELACION } from '@/lib/politica-cancelacion';
import { Field, InputField, Section, Switch } from './property-form-primitives';
import type { Errores, FormState } from './property-form-types';

interface DetallesSectionProps {
  form: FormState;
  errores: Errores;
  onInput: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  setField<K extends keyof FormState>(key: K, value: FormState[K]): void;
  esInmuebleCompleto: boolean;
}

export function DetallesSection({
  form,
  errores,
  onInput,
  setField,
  esInmuebleCompleto,
}: DetallesSectionProps) {
  return (
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

      {/* Distribución — obligatoria para inmuebles completos (depa / mini depa / casa) */}
      <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Distribución
          {esInmuebleCompleto && <span className="text-primary normal-case tracking-normal"> · obligatoria para departamentos</span>}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div data-field="numDormitorios">
            <Field label="Dormitorios" hint={esInmuebleCompleto ? undefined : 'opcional'} required={esInmuebleCompleto} error={errores.numDormitorios}>
              <InputField type="number" inputMode="numeric" min="0" name="numDormitorios" icon="bed"
                value={form.numDormitorios} onChange={onInput} placeholder="3" error={!!errores.numDormitorios} />
            </Field>
          </div>
          <div data-field="numBanos">
            <Field label="Baños" hint={esInmuebleCompleto ? undefined : 'opcional'} required={esInmuebleCompleto} error={errores.numBanos}>
              <InputField type="number" inputMode="numeric" min="0" name="numBanos" icon="bathtub"
                value={form.numBanos} onChange={onInput} placeholder="2" error={!!errores.numBanos} />
            </Field>
          </div>
          <div data-field="capacidadPersonas">
            <Field label="Capacidad" hint={esInmuebleCompleto ? 'personas' : 'personas · opcional'} required={esInmuebleCompleto} error={errores.capacidadPersonas}>
              <InputField type="number" inputMode="numeric" min="0" name="capacidadPersonas" icon="group"
                value={form.capacidadPersonas} onChange={onInput} placeholder="4" error={!!errores.capacidadPersonas} />
            </Field>
          </div>
        </div>
        {esInmuebleCompleto && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              { campo: 'tieneSala' as const, label: 'Sala / estar', icon: 'weekend', valor: form.tieneSala },
              { campo: 'tieneCocina' as const, label: 'Cocina', icon: 'kitchen', valor: form.tieneCocina },
              { campo: 'amoblado' as const, label: 'Amoblado', icon: 'chair', valor: form.amoblado },
            ]).map((t) => (
              <div key={t.campo} className="flex items-center justify-between gap-2 rounded-xl bg-card border border-border px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span className="material-symbols-outlined text-[18px] text-muted-foreground">{t.icon}</span>
                  {t.label}
                </span>
                <Switch checked={t.valor} onChange={(v) => setField(t.campo, v)} label={t.label} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div data-field="videoUrl">
        <Field label="Video (enlace)" hint="opcional">
          <InputField
            type="url"
            name="videoUrl"
            icon="smart_display"
            placeholder="https://youtu.be/… o https://vimeo.com/…"
            value={form.videoUrl}
            onChange={onInput}
          />
        </Field>
        <p className="mt-1 text-xs text-muted-foreground">
          YouTube, Vimeo o un archivo .mp4. Se mostrará como video reproducible en la ficha.
        </p>
      </div>

      <div data-field="politicaCancelacion">
        <Field label="Política de cancelación">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {POLITICAS_CANCELACION.map((pol) => {
              const info = POLITICA_CANCELACION_INFO[pol];
              const activo = form.politicaCancelacion === pol;
              return (
                <button
                  key={pol}
                  type="button"
                  onClick={() => setField('politicaCancelacion', pol)}
                  className={cn(
                    'text-left rounded-xl border p-3 transition-colors',
                    activo
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border bg-input hover:border-primary/50',
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
        </Field>
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

      {/* Alquilar por habitaciones */}
      <div className="rounded-xl bg-muted/40 border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="material-symbols-outlined text-[20px] shrink-0 text-primary">meeting_room</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Alquilar por habitaciones</p>
              <p className="text-[11px] text-muted-foreground">
                El inmueble se alquila cuarto por cuarto (precio y estado por habitación)
              </p>
            </div>
          </div>
          <Switch
            checked={form.gestionPorHabitacion}
            onChange={(v) => setField('gestionPorHabitacion', v)}
            label="Alquilar por habitaciones"
          />
        </div>
        {form.gestionPorHabitacion && (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-primary">
            <span className="material-symbols-outlined text-[14px]">info</span>
            Publica el inmueble y luego agrega las habitaciones desde “Editar”.
          </p>
        )}
      </div>
    </Section>
  );
}
