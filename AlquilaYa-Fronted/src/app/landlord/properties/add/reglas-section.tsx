'use client';

import { type CatalogosActivos } from '@/services/catalogos-service';
import { ChipsMultiselect, CustomItemInput, Section, SkeletonChips } from './property-form-primitives';
import type { FormState } from './property-form-types';

interface ReglasSectionProps {
  cargandoCat: boolean;
  catalogos: CatalogosActivos | null;
  form: FormState;
  setField<K extends keyof FormState>(key: K, value: FormState[K]): void;
}

export function ReglasSection({ cargandoCat, catalogos, form, setField }: ReglasSectionProps) {
  return (
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
  );
}
