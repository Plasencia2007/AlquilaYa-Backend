'use client';

import Link from 'next/link';
import { type Dispatch, type SetStateAction } from 'react';

import { cn } from '@/lib/cn';

interface AccionesSidebarProps {
  submitError: string | null;
  loading: boolean;
  guardandoBorrador: boolean;
  guardarBorrador: () => void;
  draftId: number | null;
  fechaProgramada: string;
  setFechaProgramada: Dispatch<SetStateAction<string>>;
  programarPublicacion: () => void;
}

export function AccionesSidebar({
  submitError,
  loading,
  guardandoBorrador,
  guardarBorrador,
  draftId,
  fechaProgramada,
  setFechaProgramada,
  programarPublicacion,
}: AccionesSidebarProps) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {submitError && (
        <div className="px-5 py-3 bg-destructive/5 border-b border-destructive/20 flex items-start gap-2">
          <span className="material-symbols-outlined text-destructive text-[16px] mt-0.5 shrink-0">
            error
          </span>
          <p className="text-[12px] font-medium text-destructive leading-snug">{submitError}</p>
        </div>
      )}

      <div className="p-5 space-y-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined text-[18px] animate-spin">
                autorenew
              </span>
              Publicando…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">publish</span>
              Publicar propiedad
            </>
          )}
        </button>

        <button
          type="button"
          onClick={guardarBorrador}
          disabled={guardandoBorrador || loading}
          className="w-full h-10 flex items-center justify-center gap-2 rounded-xl border border-border text-sm font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className={cn('material-symbols-outlined text-[18px]', guardandoBorrador && 'animate-spin')}>
            {guardandoBorrador ? 'autorenew' : 'save'}
          </span>
          {guardandoBorrador ? 'Guardando…' : (draftId ? 'Actualizar borrador' : 'Guardar borrador')}
        </button>

        {/* Programar publicación */}
        <div className="pt-1">
          <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-widest">
            Programar publicación (opcional)
          </label>
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={fechaProgramada}
              onChange={(e) => setFechaProgramada(e.target.value)}
              className="flex-1 min-w-0 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={programarPublicacion}
              disabled={loading || !fechaProgramada}
              className="shrink-0 rounded-xl border border-primary px-3 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
            >
              Programar
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Se publicará automáticamente en esa fecha (pasa a revisión del admin).
          </p>
        </div>

        <Link
          href="/landlord/dashboard"
          className="w-full h-10 flex items-center justify-center rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Cancelar
        </Link>

        <div className="pt-3 border-t border-border flex items-start gap-2 mt-1">
          <span className="material-symbols-outlined text-primary text-[16px] mt-0.5 shrink-0">
            verified
          </span>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Tu publicación pasa por revisión antes de aparecer en búsquedas. Te
            avisaremos cuando se apruebe.
          </p>
        </div>
      </div>
    </div>
  );
}
