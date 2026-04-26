'use client';

import {
  Bath,
  CookingPot,
  Dumbbell,
  type LucideIcon,
  ParkingCircle,
  PawPrint,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Tv,
  WashingMachine,
  Wifi,
} from 'lucide-react';

import { cn } from '@/lib/cn';

const ICON_MAP: Array<{ match: RegExp; icon: LucideIcon; short: string }> = [
  { match: /wi[\s-]?fi/i, icon: Wifi, short: 'Wi-Fi' },
  { match: /baño privado|baño privado/i, icon: Bath, short: 'Baño priv.' },
  { match: /lavander/i, icon: WashingMachine, short: 'Lavandería' },
  { match: /cocina|kitchenette/i, icon: CookingPot, short: 'Cocina' },
  { match: /aire acondicionado|ac\b/i, icon: Snowflake, short: 'A/C' },
  { match: /estacionamiento|parking/i, icon: ParkingCircle, short: 'Parking' },
  { match: /gimnasio|gym/i, icon: Dumbbell, short: 'Gym' },
  { match: /seguridad|24\/7/i, icon: ShieldCheck, short: 'Seguridad' },
  { match: /mascot/i, icon: PawPrint, short: 'Mascotas' },
  { match: /cable|tv/i, icon: Tv, short: 'TV' },
  { match: /limpieza/i, icon: Sparkles, short: 'Limpieza' },
];

function resolverIcono(servicio: string): { icon: LucideIcon; label: string } {
  const found = ICON_MAP.find((entry) => entry.match.test(servicio));
  return found ? { icon: found.icon, label: found.short } : { icon: Sparkles, label: servicio };
}

interface Props {
  servicios: string[];
  max?: number;
  className?: string;
  variant?: 'overlay' | 'plain';
}

/**
 * Muestra hasta `max` servicios como chips con icono. Resume el resto en `+N`.
 * `overlay`: chips translúcidos para superponer sobre imagen.
 * `plain`: chips sólidos para dentro del card.
 */
export function ServiceBadges({ servicios, max = 3, className, variant = 'overlay' }: Props) {
  if (!servicios || servicios.length === 0) return null;

  const visibles = servicios.slice(0, max);
  const sobrante = servicios.length - visibles.length;

  const baseChip =
    variant === 'overlay'
      ? 'bg-white/90 text-foreground backdrop-blur-md shadow-sm'
      : 'bg-muted text-muted-foreground';

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {visibles.map((s, i) => {
        const { icon: Icon, label } = resolverIcono(s);
        return (
          <span
            key={`${s}-${i}`}
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold',
              baseChip,
            )}
          >
            <Icon className="size-3" aria-hidden />
            {label}
          </span>
        );
      })}
      {sobrante > 0 && (
        <span
          className={cn('rounded-full px-2 py-1 text-[10px] font-semibold', baseChip)}
          aria-label={`${sobrante} servicios más`}
        >
          +{sobrante}
        </span>
      )}
    </div>
  );
}
