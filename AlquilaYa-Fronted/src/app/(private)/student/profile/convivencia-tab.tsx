'use client';

import { useEffect, useState } from 'react';
import { Loader2, Users, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';
import {
  OPCIONES,
  roommateService,
  type ConvivenciaUpdate,
  type PerfilConvivencia,
} from '@/services/roommate-service';

type Form = ConvivenciaUpdate;

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

export function ConvivenciaTab() {
  const [form, setForm] = useState<Form>({ intereses: [], zonasPreferidas: [] });
  const [completitud, setCompletitud] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    roommateService
      .miConvivencia()
      .then((p: PerfilConvivencia) => {
        setForm({
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
        });
        setCompletitud(p.completitud);
      })
      .catch((err) => notify.error(err, 'No se pudo cargar tu perfil de convivencia.'))
      .finally(() => setCargando(false));
  }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const guardar = async () => {
    setGuardando(true);
    try {
      const actualizado = await roommateService.actualizarConvivencia(form);
      setCompletitud(actualizado.completitud);
      notify.success('Perfil de convivencia guardado');
    } catch (err) {
      notify.error(err, 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex justify-center py-12 text-muted-foreground">
        <Loader2 className="size-7 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Completitud */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs font-bold">
          <span className="text-muted-foreground">Perfil completo</span>
          <span className="text-primary">{completitud}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completitud}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Un perfil completo genera más confianza y mejores coincidencias con roommates.
        </p>
      </div>

      {/* Buscar compañeros */}
      <label className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <span className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Users className="size-4 text-primary" /> Estoy buscando compañeros de cuarto
        </span>
        <input
          type="checkbox"
          checked={!!form.buscaCompaneros}
          onChange={(e) => set('buscaCompaneros', e.target.checked)}
          className="size-5 accent-[var(--primary)]"
        />
      </label>

      {/* Sobre mí */}
      <section className="space-y-3">
        <h3 className="text-sm font-black text-foreground">Sobre mí</h3>
        <textarea
          value={form.bio ?? ''}
          onChange={(e) => set('bio', e.target.value)}
          maxLength={600}
          rows={3}
          placeholder="Cuéntales a tus futuros roommates cómo eres…"
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
        <input
          value={form.instagram ?? ''}
          onChange={(e) => set('instagram', e.target.value)}
          placeholder="Instagram (opcional)"
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
      </section>

      {/* Hábitos */}
      <section className="space-y-3">
        <h3 className="text-sm font-black text-foreground">Hábitos de convivencia</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="¿Fumas?" campo="fuma" value={form.fuma} onChange={(v) => set('fuma', v)} />
          <Select label="Horario" campo="horario" value={form.horario} onChange={(v) => set('horario', v)} />
          <Select label="Orden y limpieza" campo="orden" value={form.orden} onChange={(v) => set('orden', v)} />
          <Select label="Ruido / estudio" campo="ruido" value={form.ruido} onChange={(v) => set('ruido', v)} />
          <Select label="Sociabilidad" campo="sociabilidad" value={form.sociabilidad} onChange={(v) => set('sociabilidad', v)} />
          <Select label="Mascotas" campo="mascotas" value={form.mascotas} onChange={(v) => set('mascotas', v)} />
          <Select label="Invitados" campo="invitados" value={form.invitados} onChange={(v) => set('invitados', v)} />
        </div>
      </section>

      {/* Preferencias */}
      <section className="space-y-3">
        <h3 className="text-sm font-black text-foreground">Preferencias de roommate</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Tu género" campo="genero" value={form.genero} onChange={(v) => set('genero', v)} />
          <Select label="Compartir con" campo="comparteCon" value={form.comparteCon} onChange={(v) => set('comparteCon', v)} />
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
      </section>

      <div className="flex justify-end">
        <Button onClick={guardar} disabled={guardando} className="gap-1.5 font-bold">
          {guardando && <Loader2 className="size-4 animate-spin" />} Guardar
        </Button>
      </div>
    </div>
  );
}
