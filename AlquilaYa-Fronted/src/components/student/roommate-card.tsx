import { useState } from 'react';
import { BadgeCheck, GraduationCap, MapPin, User } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { ReputationBadge } from '@/components/shared/reputation-badge';
import { RoommateProfileModal } from '@/components/student/roommate-profile-modal';
import { formatPEN } from '@/lib/money';
import { labelOpcion, type DesgloseCompatItem, type PerfilConvivencia } from '@/services/roommate-service';

/**
 * Tarjeta de roommate (#38): muestra el perfil de convivencia + señales de confianza
 * (verificación + reputación #26 + % de perfil completo). Clickeable en toda su superficie
 * (ítem 249): abre `RoommateProfileModal` con el perfil completo. El badge de compatibilidad
 * (y su popover con el desglose) detiene la propagación del click para no disparar ambos a
 * la vez.
 */
export function RoommateCard({
  perfil,
  compat,
}: {
  perfil: PerfilConvivencia;
  /** Compatibilidad con el usuario actual (opcional, en el board). `detalle` es el desglose
   *  por dimensión (ítem 215); si no viene, se muestra solo el badge sin popover. */
  compat?: { score: number; nivel: string; detalle?: DesgloseCompatItem[] } | null;
}) {
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const compatColor =
    compat?.nivel === 'Alta'
      ? 'bg-success-light text-success'
      : compat?.nivel === 'Media'
        ? 'bg-warning-light text-warning'
        : 'bg-muted text-muted-foreground';
  const habitos = [
    labelOpcion('fuma', perfil.fuma),
    labelOpcion('horario', perfil.horario),
    labelOpcion('orden', perfil.orden),
    labelOpcion('sociabilidad', perfil.sociabilidad),
    labelOpcion('mascotas', perfil.mascotas),
  ].filter(Boolean) as string[];

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setPerfilAbierto(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setPerfilAbierto(true);
          }
        }}
        className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 ease-out-expo hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-popover"
      >
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

        {compat && (compat.detalle?.length ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className={`w-full rounded-lg px-2.5 py-1 text-center text-xs font-bold transition hover:opacity-80 ${compatColor}`}
              >
                Compatibilidad {compat.nivel} · {compat.score}%
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 space-y-3" align="start">
              <p className="text-xs font-bold text-foreground">Desglose de compatibilidad</p>
              <div className="space-y-2.5">
                {compat.detalle.map((d) => (
                  <div key={d.campo}>
                    <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-muted-foreground">{d.label}</span>
                      <span className={d.coincide ? 'text-success' : 'text-muted-foreground'}>
                        {d.coincide ? 'Coincide' : 'Distinto'}
                      </span>
                    </div>
                    <Progress
                      value={100}
                      indicatorClassName={d.coincide ? 'bg-success' : 'bg-muted-foreground/30'}
                      label={`${d.label}: ${d.coincide ? 'coincide' : 'distinto'}`}
                    />
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <div className={`rounded-lg px-2.5 py-1 text-center text-xs font-bold ${compatColor}`}>
            Compatibilidad {compat.nivel} · {compat.score}%
          </div>
        ))}

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
            <span className="tnum flex items-center gap-1">
              <MapPin className="size-3" /> hasta {formatPEN(perfil.presupuestoMax)}
              {perfil.zonasPreferidas?.length ? ` · ${perfil.zonasPreferidas[0]}` : ''}
            </span>
          ) : (
            <span />
          )}
          <span className="font-bold text-primary">{perfil.completitud}% perfil</span>
        </div>
      </div>

      <RoommateProfileModal perfil={perfil} compat={compat} open={perfilAbierto} onOpenChange={setPerfilAbierto} />
    </>
  );
}
