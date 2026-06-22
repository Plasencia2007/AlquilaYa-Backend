'use client';

import { useEffect, useState } from 'react';
import {
  adminPropertyService,
  type ConfianzaDTO,
} from '@/services/admin-property-service';

/**
 * Resumen de confianza de una publicación para el panel de revisión del admin:
 * señales automáticas de fraude/catfishing (#48/#50) + cantidad de denuncias (#46).
 */
export function ConfianzaSection({ propiedadId }: { propiedadId: number }) {
  const [data, setData] = useState<ConfianzaDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    adminPropertyService
      .obtenerConfianza(propiedadId)
      .then((d) => {
        if (!cancelado) setData(d);
      })
      .catch(() => {
        if (!cancelado) setData(null);
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [propiedadId]);

  if (loading) {
    return (
      <div className="h-12 rounded-xl bg-slate-100 animate-pulse" aria-hidden />
    );
  }
  if (!data) return null;

  const limpio = data.senales.length === 0 && data.denunciasPendientes === 0;

  if (limpio) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <span className="material-symbols-outlined text-[18px] text-emerald-600">verified_user</span>
        <p className="text-xs font-semibold text-emerald-800">Sin señales de alerta automáticas.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-2">
      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-rose-700">
        <span className="material-symbols-outlined text-[16px]">gpp_maybe</span>
        Señales de confianza
      </p>

      {data.denunciasPendientes > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-white/70 px-2.5 py-1.5">
          <span className="material-symbols-outlined text-[16px] text-rose-600">flag</span>
          <p className="text-xs font-semibold text-rose-800">
            {data.denunciasPendientes} denuncia{data.denunciasPendientes !== 1 ? 's' : ''} pendiente
            {data.denunciasPendientes !== 1 ? 's' : ''} de usuarios.
          </p>
        </div>
      )}

      {data.senales.map((s) => (
        <div key={s.codigo} className="flex items-start gap-2 rounded-lg bg-white/70 px-2.5 py-1.5">
          <span
            className={`material-symbols-outlined text-[16px] ${
              s.severidad === 'ALTA' ? 'text-rose-600' : 'text-amber-600'
            }`}
          >
            {s.severidad === 'ALTA' ? 'priority_high' : 'warning'}
          </span>
          <p className="text-xs text-slate-700">{s.mensaje}</p>
        </div>
      ))}
    </div>
  );
}
