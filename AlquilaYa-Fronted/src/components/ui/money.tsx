import { cn } from '@/lib/cn';
import { formatPEN } from '@/lib/money';

type Size = 'sm' | 'md' | 'lg';

interface Props {
  value: number;
  period?: string;
  size?: Size;
  decimales?: boolean;
  className?: string;
}

const SIZES: Record<Size, { symbol: string; amount: string; period: string }> = {
  sm: { symbol: 'text-xs', amount: 'text-base', period: 'text-xs' },
  md: { symbol: 'text-sm', amount: 'text-xl', period: 'text-xs' },
  lg: { symbol: 'text-base', amount: 'text-3xl', period: 'text-sm' },
};

/**
 * Precio con jerarquía visual (S/ pequeño, monto grande, período en muted) —
 * ítem 73 de MEJORAS.md. Envuelve `formatPEN` (lib/money.ts) + `.tnum`
 * (globals.css). El color del monto lo hereda del `className` del wrapper
 * (ej. `className="text-primary"`); símbolo y período siempre van en muted.
 */
export function Money({ value, period, size = 'md', decimales, className }: Props) {
  const formatted = formatPEN(value, { decimales });
  const separador = formatted.indexOf(' ');
  const simbolo = separador === -1 ? 'S/' : formatted.slice(0, separador);
  const monto = separador === -1 ? formatted : formatted.slice(separador + 1);
  const sizes = SIZES[size];

  return (
    <span className={cn('tnum inline-flex items-baseline gap-1', className)}>
      <span className={cn('font-bold text-muted-foreground', sizes.symbol)}>{simbolo}</span>
      <span className={cn('font-black leading-none', sizes.amount)}>{monto}</span>
      {period && <span className={cn('font-normal text-muted-foreground', sizes.period)}>/{period}</span>}
    </span>
  );
}
