'use client';

import { useEffect, useState } from 'react';

import { propiedadService } from '@/services/landlord-property-service';
import { notify } from '@/lib/notify';
import type { PrecioTemporada } from '@/types/propiedad';
import { Section } from '../../add/property-form-primitives';

const inputCls =
  'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-card-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

/**
 * Precios por temporada/ciclo (solo para unidades completas, no gestionadas por habitación).
 * Se guardan al instante contra su propio endpoint — no dependen del botón "Guardar cambios"
 * de la página, igual que en el tab correspondiente de `EditPropertyModal`.
 */
export function TemporadasSection({ propiedadId }: { propiedadId: number | string }) {
  const [temporadas, setTemporadas] = useState<PrecioTemporada[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ fechaInicio: '', fechaFin: '', precio: '', etiqueta: '' });

  useEffect(() => {
    let cancel = false;
    propiedadService
      .listarTemporadas(propiedadId)
      .then((d) => { if (!cancel) setTemporadas(d); })
      .catch(() => { if (!cancel) setTemporadas([]); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [propiedadId]);

  const agregar = async () => {
    const precio = parseFloat(form.precio);
    if (!form.fechaInicio || !form.fechaFin || form.fechaFin < form.fechaInicio) {
      notify.error(null, 'Indica un rango de fechas válido.');
      return;
    }
    if (Number.isNaN(precio) || precio <= 0) {
      notify.error(null, 'Indica un precio mayor a 0.');
      return;
    }
    setBusy(true);
    try {
      await propiedadService.crearTemporada(propiedadId, {
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
        precio,
        etiqueta: form.etiqueta.trim() || undefined,
      });
      const lista = await propiedadService.listarTemporadas(propiedadId);
      setTemporadas(lista);
      setForm({ fechaInicio: '', fechaFin: '', precio: '', etiqueta: '' });
      notify.success('Temporada agregada');
    } catch (err) {
      notify.error(err, 'No se pudo agregar la temporada');
    } finally {
      setBusy(false);
    }
  };

  const eliminar = async (id: number) => {
    setBusy(true);
    try {
      await propiedadService.eliminarTemporada(propiedadId, id);
      setTemporadas((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      notify.error(err, 'No se pudo eliminar la temporada');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  return (
    <Section
      step={6}
      icon="event_repeat"
      title="Precios por temporada / ciclo"
      subtitle="Opcional — el precio de la temporada que cubra la fecha de ingreso del estudiante manda"
    >
      {temporadas.length > 0 && (
        <div className="space-y-1.5">
          {temporadas.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs"
            >
              <span className="truncate text-card-foreground">
                {t.etiqueta ? `${t.etiqueta} · ` : ''}
                {t.fechaInicio} → {t.fechaFin} ·{' '}
                <span className="font-bold text-primary">S/{t.precio.toLocaleString('es-PE')}</span>
              </span>
              <button
                type="button"
                onClick={() => eliminar(t.id)}
                disabled={busy}
                className="shrink-0 min-h-11 min-w-11 flex items-center justify-center text-destructive hover:text-destructive/80 disabled:opacity-50"
                title="Eliminar temporada"
                aria-label={`Eliminar temporada ${t.etiqueta || `${t.fechaInicio} a ${t.fechaFin}`}`}
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input
          type="date"
          aria-label="Desde"
          value={form.fechaInicio}
          onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))}
          className={inputCls}
        />
        <input
          type="date"
          aria-label="Hasta"
          value={form.fechaFin}
          onChange={(e) => setForm((f) => ({ ...f, fechaFin: e.target.value }))}
          className={inputCls}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Precio"
          value={form.precio}
          onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
          className={inputCls}
        />
        <input
          type="text"
          maxLength={60}
          placeholder="Etiqueta (ej. Ciclo I)"
          value={form.etiqueta}
          onChange={(e) => setForm((f) => ({ ...f, etiqueta: e.target.value }))}
          className={inputCls}
        />
      </div>
      <button
        type="button"
        onClick={agregar}
        disabled={busy}
        className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
      >
        {busy ? 'Guardando…' : 'Agregar temporada'}
      </button>
    </Section>
  );
}
