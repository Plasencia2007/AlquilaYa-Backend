'use client';

import { type Dispatch, type SetStateAction } from 'react';

import { type CatalogosActivos } from '@/services/catalogos-service';
import { ChipsMultiselect, CustomItemInput, Section, SkeletonChips } from './property-form-primitives';
import type { FormState } from './property-form-types';

/** Nombre legible de un servicio (catálogo si existe, o su propia clave si es personalizado). */
function nombreServicio(valor: string, catalogos: CatalogosActivos | null): string {
  return catalogos?.SERVICIO?.find((c) => c.valor === valor)?.nombre ?? valor;
}

interface ServiciosSectionProps {
  cargandoCat: boolean;
  catalogos: CatalogosActivos | null;
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  setField<K extends keyof FormState>(key: K, value: FormState[K]): void;
}

export function ServiciosSection({
  cargandoCat,
  catalogos,
  form,
  setForm,
  setField,
}: ServiciosSectionProps) {
  return (
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
            setForm((f) => {
              const ya = f.serviciosIncluidos.includes(valor);
              return {
                ...f,
                serviciosIncluidos: ya
                  ? f.serviciosIncluidos.filter((v) => v !== valor)
                  : [...f.serviciosIncluidos, valor],
                // Un servicio no puede estar incluido y aparte a la vez.
                serviciosAparte: f.serviciosAparte.filter((v) => v !== valor),
              };
            })
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

      {/* Servicios que se pagan aparte */}
      <div className="pt-4 mt-2 border-t border-border">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Se paga aparte (no incluido en el precio)
        </p>
        {cargandoCat ? (
          <SkeletonChips />
        ) : (
          <ChipsMultiselect
            items={catalogos?.SERVICIO ?? []}
            selected={form.serviciosAparte}
            onToggle={(valor) =>
              setForm((f) => {
                const ya = f.serviciosAparte.includes(valor);
                const montosServiciosAparte = { ...f.montosServiciosAparte };
                if (ya) delete montosServiciosAparte[valor];
                return {
                  ...f,
                  serviciosAparte: ya
                    ? f.serviciosAparte.filter((v) => v !== valor)
                    : [...f.serviciosAparte, valor],
                  serviciosIncluidos: f.serviciosIncluidos.filter((v) => v !== valor),
                  montosServiciosAparte,
                };
              })
            }
          />
        )}

        {form.serviciosAparte.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] text-muted-foreground">
              Indica cuánto cuesta cada uno (opcional) para que el estudiante vea un estimado mensual real.
            </p>
            {form.serviciosAparte.map((valor) => (
              <div key={valor} className="flex items-center gap-2">
                <span className="flex-1 truncate text-sm font-medium text-foreground">
                  {nombreServicio(valor, catalogos)}
                </span>
                <div className="relative w-28 shrink-0">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    S/
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={form.montosServiciosAparte[valor] ?? ''}
                    onChange={(e) =>
                      setField('montosServiciosAparte', {
                        ...form.montosServiciosAparte,
                        [valor]: e.target.value,
                      })
                    }
                    placeholder="0"
                    className="w-full rounded-lg border border-border bg-input py-1.5 pl-8 pr-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}
