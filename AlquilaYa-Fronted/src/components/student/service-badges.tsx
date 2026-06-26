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

// Claves exactas de SERVICIOS_CATALOGO (tienen prioridad, van primero)
// + regex de compatibilidad para datos legacy
const ICON_MAP: Array<{ match: RegExp; icon: LucideIcon; short: string }> = [
  // ── Claves exactas del catálogo (property-service / arrendador form) ──
  { match: /^WIFI$/,              icon: Wifi,          short: 'Wi-Fi' },
  { match: /^LUZ$/,               icon: Sparkles,      short: 'Luz' },
  { match: /^AGUA$/,              icon: Bath,          short: 'Agua' },
  { match: /^GAS$/,               icon: CookingPot,    short: 'Gas' },
  { match: /^CABLE_TV$/,          icon: Tv,            short: 'Cable TV' },
  { match: /^LAVANDERIA$/,        icon: WashingMachine, short: 'Lavandería' },
  { match: /^COCINA_COMPARTIDA$/, icon: CookingPot,    short: 'Cocina' },
  { match: /^ESTACIONAMIENTO$/,   icon: ParkingCircle, short: 'Parking' },
  { match: /^SEGURIDAD_24H$/,     icon: ShieldCheck,   short: 'Seguridad' },
  // ── Claves legacy / seed ──
  { match: /^AGUA_CALIENTE$/,     icon: Bath,          short: 'Agua cal.' },
  { match: /^AGUA_FRIA$/,         icon: Bath,          short: 'Agua fría' },
  { match: /^COCINA$/,            icon: CookingPot,    short: 'Cocina' },
  { match: /^CABLE$/,             icon: Tv,            short: 'Cable' },
  { match: /^ENTRADA_IND$/,       icon: ShieldCheck,   short: 'Ent. ind.' },
  // ── Regex de compatibilidad para cualquier otro formato ──
  { match: /wi[\s-]?fi|internet/i,         icon: Wifi,          short: 'Wi-Fi' },
  { match: /baño\s*priv|bano_priv/i,       icon: Bath,          short: 'Baño priv.' },
  { match: /lavander/i,                    icon: WashingMachine, short: 'Lavandería' },
  { match: /cocina|kitchenette/i,          icon: CookingPot,    short: 'Cocina' },
  { match: /aire|_ac\b|aire_acondicionado/i, icon: Snowflake,  short: 'A/C' },
  { match: /estacion|parking/i,            icon: ParkingCircle, short: 'Parking' },
  { match: /gimnas|gym/i,                  icon: Dumbbell,      short: 'Gym' },
  { match: /segur/i,                       icon: ShieldCheck,   short: 'Seguridad' },
  { match: /mascot/i,                      icon: PawPrint,      short: 'Mascotas' },
  { match: /cable|^tv$/i,                  icon: Tv,            short: 'TV' },
  { match: /limpieza/i,                    icon: Sparkles,      short: 'Limpieza' },
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
