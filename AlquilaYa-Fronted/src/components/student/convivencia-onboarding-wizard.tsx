'use client';

import { useEffect, useState } from 'react';
import { PartyPopper, Users, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Stepper, type StepperStep } from '@/components/ui/stepper';
import { notify } from '@/lib/notify';
import {
  OPCIONES,
  roommateService,
  type ConvivenciaUpdate,
  type PerfilConvivencia,
} from '@/services/roommate-service';

/**
 * Wizard opcional de convivencia (ítem 180): el perfil de convivencia (clave para el
 * matching de roommates) vive escondido en `student/profile` → tab "Convivencia" y casi
 * nadie lo completa. Este wizard es un ATAJO adicional hacia los MISMOS datos —usa el
 * mismo servicio/endpoint que `convivencia-tab.tsx` (fuente de verdad del perfil), no
 * inventa nada nuevo— para empujar al estudiante a llenarlo justo después de su primer
 * login, sin bloquear: siempre se puede saltar.
 *
 * Señal de "primer login" (simple, a propósito — ver instrucciones del ítem): si el
 * estudiante todavía no tiene NADA guardado (`completitud === 0`, el mismo campo que usa
 * el tab para su barra de progreso) y no lo saltó ya en esta sesión de navegador.
 */

/** sessionStorage (no localStorage): si el estudiante lo salta, no debe volver a
 * insistir en la MISMA sesión, pero sí en la siguiente —puede querer completarlo otro día. */
const SKIP_KEY = 'alquilaya:convivencia-onboarding-skip';

const PASOS: StepperStep[] = [
  { key: 'habitos', label: 'Hábitos' },
  { key: 'convivencia', label: 'Convivencia' },
  { key: 'preferencias', label: 'Preferencias' },
];

function yaSaltadoEstaSesion(): boolean {
  try {
    return window.sessionStorage.getItem(SKIP_KEY) === '1';
  } catch {
    return false;
  }
}

function marcarSaltado() {
  try {
    window.sessionStorage.setItem(SKIP_KEY, '1');
  } catch {
    /* sessionStorage no disponible → best-effort, simplemente puede volver a aparecer */
  }
}

function Select({
  label,
  campo,
  value,
  onChange,
}: {
  label: string;
  campo: keyof typeof OPCIONES;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-muted-foreground">{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
      >
        <option value="">—</option>
        {OPCIONES[campo].map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </label>
  );
}

function Chips({
  label,
  values,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string;
  values: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  placeholder: string;
}) {
  const [text, setText] = useState('');
  const commit = () => {
    const v = text.trim();
    if (v && !values.includes(v)) onAdd(v);
    setText('');
  };
  return (
    <div>
      <span className="mb-1 block text-xs font-bold text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-card p-2">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
          >
            {v}
            <button type="button" onClick={() => onRemove(v)} aria-label={`Quitar ${v}`}>
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commit();
            }
          }}
          onBlur={commit}
          placeholder={placeholder}
          className="min-w-[120px] flex-1 bg-transparent px-1 text-sm outline-none"
        />
      </div>
    </div>
  );
}

function formDesdePerfil(p: PerfilConvivencia): ConvivenciaUpdate {
  return {
    bio: p.bio,
    instagram: p.instagram,
    fuma: p.fuma,
    horario: p.horario,
    orden: p.orden,
    ruido: p.ruido,
    sociabilidad: p.sociabilidad,
    mascotas: p.mascotas,
    invitados: p.invitados,
    genero: p.genero,
    comparteCon: p.comparteCon,
    presupuestoMin: p.presupuestoMin,
    presupuestoMax: p.presupuestoMax,
    fechaMudanza: p.fechaMudanza,
    numCompaneros: p.numCompaneros,
    buscaCompaneros: p.buscaCompaneros,
    intereses: p.intereses ?? [],
    zonasPreferidas: p.zonasPreferidas ?? [],
  };
}

export function ConvivenciaOnboardingWizard() {
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState(0);
  const [form, setForm] = useState<ConvivenciaUpdate>({ intereses: [], zonasPreferidas: [] });
  const [guardando, setGuardando] = useState(false);

  // Carga el perfil UNA vez al montar. El setState que decide si el wizard se abre vive
  // dentro del `.then` (async), no en el cuerpo del efecto, así que no dispara
  // `react-hooks/set-state-in-effect` (mismo patrón que `convivencia-tab.tsx` y
  // `filter-chips.tsx`: la condición solo se evalúa cuando el dato ya llegó).
  useEffect(() => {
    let cancelado = false;
    roommateService
      .miConvivencia()
      .then((perfil) => {
        if (cancelado) return;
        if (perfil.completitud === 0 && !yaSaltadoEstaSesion()) {
          setForm(formDesdePerfil(perfil));
          setAbierto(true);
        }
      })
      .catch(() => {
        /* si falla la carga no interrumpimos el dashboard con el wizard */
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const set = <K extends keyof ConvivenciaUpdate>(k: K, v: ConvivenciaUpdate[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const saltar = () => {
    marcarSaltado();
    setAbierto(false);
  };

  const finalizar = async () => {
    setGuardando(true);
    try {
      await roommateService.actualizarConvivencia(form);
      notify.success('¡Listo! Tu perfil de convivencia quedó guardado.');
      marcarSaltado(); // ya lo completó: tampoco insistir de nuevo en esta sesión
      setAbierto(false);
    } catch (err) {
      notify.error(err, 'No se pudo guardar tu perfil de convivencia.');
    } finally {
      setGuardando(false);
    }
  };

  const siguiente = () => {
    if (paso < PASOS.length - 1) setPaso((p) => p + 1);
    else void finalizar();
  };

  const anterior = () => setPaso((p) => Math.max(0, p - 1));

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && saltar()}>
      <DialogContent className="max-w-lg gap-5">
        <DialogHeader>
          <span className="mb-1 flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <Users className="size-5" aria-hidden />
          </span>
          <DialogTitle>Cuéntanos cómo vives</DialogTitle>
          <DialogDescription>
            3 pasos rápidos para encontrar mejores compañeros de cuarto. Puedes completarlo
            luego desde tu perfil cuando quieras.
          </DialogDescription>
        </DialogHeader>

        <Stepper steps={PASOS} currentIndex={paso} orientation="horizontal" />

        <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
          {paso === 0 && (
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  Sobre mí (opcional)
                </span>
                <textarea
                  value={form.bio ?? ''}
                  onChange={(e) => set('bio', e.target.value)}
                  maxLength={600}
                  rows={2}
                  placeholder="Cuéntales a tus futuros roommates cómo eres…"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Horario" campo="horario" value={form.horario} onChange={(v) => set('horario', v)} />
                <Select label="Orden y limpieza" campo="orden" value={form.orden} onChange={(v) => set('orden', v)} />
                <Select label="¿Fumas?" campo="fuma" value={form.fuma} onChange={(v) => set('fuma', v)} />
              </div>
            </div>
          )}

          {paso === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Ruido / estudio" campo="ruido" value={form.ruido} onChange={(v) => set('ruido', v)} />
              <Select label="Sociabilidad" campo="sociabilidad" value={form.sociabilidad} onChange={(v) => set('sociabilidad', v)} />
              <Select label="Mascotas" campo="mascotas" value={form.mascotas} onChange={(v) => set('mascotas', v)} />
              <Select label="Invitados" campo="invitados" value={form.invitados} onChange={(v) => set('invitados', v)} />
              <Select label="Compartir con" campo="comparteCon" value={form.comparteCon} onChange={(v) => set('comparteCon', v)} />
              <Select label="Tu género" campo="genero" value={form.genero} onChange={(v) => set('genero', v)} />
            </div>
          )}

          {paso === 2 && (
            <div className="space-y-3">
              <label className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
                <span className="text-sm font-bold text-foreground">
                  Estoy buscando compañeros de cuarto
                </span>
                <input
                  type="checkbox"
                  checked={!!form.buscaCompaneros}
                  onChange={(e) => set('buscaCompaneros', e.target.checked)}
                  className="size-5 accent-[var(--primary)]"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-muted-foreground">Presupuesto mín. (S/)</span>
                  <input
                    type="number"
                    value={form.presupuestoMin ?? ''}
                    onChange={(e) => set('presupuestoMin', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-muted-foreground">Presupuesto máx. (S/)</span>
                  <input
                    type="number"
                    value={form.presupuestoMax ?? ''}
                    onChange={(e) => set('presupuestoMax', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-muted-foreground">Fecha de mudanza</span>
                  <input
                    type="date"
                    value={form.fechaMudanza ?? ''}
                    onChange={(e) => set('fechaMudanza', e.target.value || undefined)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-muted-foreground">¿Cuántos compañeros buscas?</span>
                  <input
                    type="number"
                    min={1}
                    value={form.numCompaneros ?? ''}
                    onChange={(e) => set('numCompaneros', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <Chips
                label="Zonas preferidas"
                values={form.zonasPreferidas ?? []}
                onAdd={(v) => set('zonasPreferidas', [...(form.zonasPreferidas ?? []), v])}
                onRemove={(v) => set('zonasPreferidas', (form.zonasPreferidas ?? []).filter((x) => x !== v))}
                placeholder="Añade una zona y Enter…"
              />
              <Chips
                label="Intereses"
                values={form.intereses ?? []}
                onAdd={(v) => set('intereses', [...(form.intereses ?? []), v])}
                onRemove={(v) => set('intereses', (form.intereses ?? []).filter((x) => x !== v))}
                placeholder="Ej. gym, gaming, música…"
              />
              <input
                value={form.instagram ?? ''}
                onChange={(e) => set('instagram', e.target.value)}
                placeholder="Instagram (opcional)"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <button
            type="button"
            onClick={saltar}
            className="text-xs font-bold text-muted-foreground hover:text-foreground hover:underline"
          >
            Saltar por ahora
          </button>
          <div className="flex gap-2">
            {paso > 0 && (
              <Button type="button" variant="outline" onClick={anterior} disabled={guardando}>
                Atrás
              </Button>
            )}
            <Button type="button" onClick={siguiente} loading={guardando} className="gap-1.5 font-bold">
              {!guardando && paso === PASOS.length - 1 && <PartyPopper className="size-4" aria-hidden />}
              {paso < PASOS.length - 1 ? 'Siguiente' : 'Finalizar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
