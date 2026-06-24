import { cn } from '@/lib/cn';
import { metaNivelReputacion, type NivelReputacion } from '@/types/reputacion';

interface Props {
  nivel?: NivelReputacion | null;
  /** Score 0–100. Si se pasa, se muestra junto al nivel. */
  score?: number | null;
  /** Mostrar el número del score además del nivel. */
  showScore?: boolean;
  className?: string;
}

/**
 * Chip de reputación (#26): nivel (Bronce/Plata/Oro/Platino) con su emoji, color y
 * opcionalmente el score 0–100. No renderiza nada si no hay nivel.
 */
export function ReputationBadge({ nivel, score, showScore = true, className }: Props) {
  if (!nivel) return null;
  const meta = metaNivelReputacion(nivel);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold',
        meta.className,
        className,
      )}
      title={`Reputación ${meta.label}${score != null ? ` · ${score}/100` : ''}`}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
      {showScore && score != null && <span className="font-extrabold opacity-70">· {score}</span>}
    </span>
  );
}
