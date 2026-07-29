'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';
import { metaNivelReputacion, type NivelReputacion } from '@/types/reputacion';

export type ReputationBadgeSize = 'sm' | 'md' | 'lg';

interface Props {
  nivel?: NivelReputacion | null;
  /** Score 0–100. Si se pasa, se muestra junto al nivel. */
  score?: number | null;
  /** Mostrar el número del score además del nivel. */
  showScore?: boolean;
  /** `sm` para cards/listas, `md` (default) para uso general, `lg` para perfil. */
  size?: ReputationBadgeSize;
  className?: string;
}

const SIZE_CLASSES: Record<ReputationBadgeSize, string> = {
  sm: 'gap-0.5 px-1.5 py-px text-[10px]',
  md: 'gap-1 px-2 py-0.5 text-[11px]',
  lg: 'gap-1.5 px-3 py-1 text-sm',
};

const EMOJI_SIZE_CLASSES: Record<ReputationBadgeSize, string> = {
  sm: 'text-[10px]',
  md: 'text-[11px]',
  lg: 'text-base',
};

/**
 * Chip de reputación (#26): nivel (Bronce/Plata/Oro/Platino) con su emoji, color y
 * opcionalmente el score 0–100. No renderiza nada si no hay nivel. Incluye tooltip
 * (#74) explicando cómo se calcula el nivel: reseñas, verificación de cuenta,
 * antigüedad y cumplimiento de reservas (arrendadores no reciben reseñas, así que
 * ese factor se redistribuye entre verificación/antigüedad/actividad).
 */
export function ReputationBadge({ nivel, score, showScore = true, size = 'md', className }: Props) {
  if (!nivel) return null;
  const meta = metaNivelReputacion(nivel);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className={cn(
              'inline-flex items-center rounded-full border font-bold outline-none',
              SIZE_CLASSES[size],
              meta.className,
              className,
            )}
          >
            <span aria-hidden className={EMOJI_SIZE_CLASSES[size]}>
              {meta.emoji}
            </span>
            {meta.label}
            {showScore && score != null && <span className="font-extrabold opacity-70">· {score}</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-56 text-xs">
          Nivel {meta.label}
          {score != null ? ` (${score}/100)` : ''}: se calcula con reseñas, verificación de cuenta,
          antigüedad y cumplimiento de reservas.
          <br />
          Bronce &lt;40 · Plata 40–64 · Oro 65–84 · Platino ≥85.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
