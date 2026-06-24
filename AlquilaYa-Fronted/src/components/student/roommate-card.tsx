import { BadgeCheck, GraduationCap, MapPin, User } from 'lucide-react';

import { ReputationBadge } from '@/components/reputation-badge';
import { labelOpcion, type PerfilConvivencia } from '@/services/roommate-service';

/**
 * Tarjeta de roommate (#38): muestra el perfil de convivencia + señales de confianza
 * (verificación + reputación #26 + % de perfil completo).
 */
export function RoommateCard({
  perfil,
  compat,
}: {
  perfil: PerfilConvivencia;
  /** Compatibilidad con el usuario actual (opcional, en el board). */
  compat?: { score: number; nivel: string } | null;
}) {
  const compatColor =
    compat?.nivel === 'Alta'
      ? 'bg-green-100 text-green-700'
      : compat?.nivel === 'Media'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-100 text-slate-600';
  const habitos = [
    labelOpcion('fuma', perfil.fuma),
    labelOpcion('horario', perfil.horario),
    labelOpcion('orden', perfil.orden),
    labelOpcion('sociabilidad', perfil.sociabilidad),
    labelOpcion('mascotas', perfil.mascotas),
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
          {perfil.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={perfil.avatar} alt={perfil.nombre ?? 'Estudiante'} className="size-12 object-cover" />
          ) : (
            <User className="size-6" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-bold text-foreground">
              {perfil.nombre ?? 'Estudiante'} {perfil.apellido ?? ''}
            </p>
            {perfil.verificado && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verificado" />}
          </div>
          {(perfil.carrera || perfil.ciclo) && (
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <GraduationCap className="size-3" />
              {perfil.carrera}
              {perfil.ciclo ? ` · ciclo ${perfil.ciclo}` : ''}
            </p>
          )}
        </div>
        {perfil.nivelReputacion && (
          <ReputationBadge nivel={perfil.nivelReputacion} score={perfil.score} showScore={false} />
        )}
      </div>

      {compat && (
        <div className={`rounded-lg px-2.5 py-1 text-center text-xs font-bold ${compatColor}`}>
          Compatibilidad {compat.nivel} · {compat.score}%
        </div>
      )}

      {perfil.bio && <p className="line-clamp-3 text-sm text-muted-foreground">{perfil.bio}</p>}

      {habitos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {habitos.map((h) => (
            <span key={h} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
              {h}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
        {perfil.presupuestoMax != null ? (
          <span className="flex items-center gap-1">
            <MapPin className="size-3" /> hasta S/ {perfil.presupuestoMax.toLocaleString('es-PE')}
            {perfil.zonasPreferidas?.length ? ` · ${perfil.zonasPreferidas[0]}` : ''}
          </span>
        ) : (
          <span />
        )}
        <span className="font-bold text-primary">{perfil.completitud}% perfil</span>
      </div>
    </div>
  );
}
