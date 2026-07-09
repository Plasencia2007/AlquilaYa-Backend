'use client';

import Link from 'next/link';
import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui/skeleton';

type Accent = 'primary' | 'success' | 'warning' | 'info';

interface StatCardProps {
  /** Ícono lucide, o el nombre de un ícono Material Symbols (compat. landlord/admin). */
  icon: LucideIcon | string;
  label: string;
  value: string | number;
  /** Variación %, con flecha e indicador de color automático (positivo/negativo). */
  delta?: number | null;
  /** Texto secundario — se muestra en vez del delta si no hay uno. */
  deltaLabel?: string;
  href?: string;
  accent?: Accent;
  className?: string;
}

const ACCENT_MAP: Record<Accent, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  info: 'bg-info-light text-info',
};

/**
 * StatCard único para los 3 paneles (antes: student/stat-card.tsx,
 * landlord/stat-card.tsx, admin/StatsCard.tsx — ítem 44 de MEJORAS.md).
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  deltaLabel,
  href,
  accent = 'primary',
  className,
}: StatCardProps) {
  const Wrapper = href ? Link : 'div';
  const tieneDelta = typeof delta === 'number' && !Number.isNaN(delta);
  const esPositivo = (delta ?? 0) >= 0;

  return (
    <Wrapper
      href={href as string}
      className={cn(
        'group flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-card transition-all duration-200 ease-out-expo',
        href && 'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-popover',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200',
            ACCENT_MAP[accent],
            href && 'group-hover:scale-110',
          )}
        >
          {typeof Icon === 'string' ? (
            <span className="material-symbols-outlined text-[22px]" aria-hidden>
              {Icon}
            </span>
          ) : (
            <Icon className="size-6" aria-hidden />
          )}
        </span>

        {tieneDelta ? (
          <span
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
              esPositivo
                ? 'border-success/20 bg-success-light text-success'
                : 'border-destructive/20 bg-destructive/10 text-destructive',
            )}
          >
            {esPositivo ? (
              <TrendingUp className="size-3" aria-hidden />
            ) : (
              <TrendingDown className="size-3" aria-hidden />
            )}
            {esPositivo ? '+' : ''}
            {delta}%
          </span>
        ) : deltaLabel ? (
          <span className="shrink-0 text-[10px] font-medium text-muted-foreground">{deltaLabel}</span>
        ) : null}
      </div>

      <div>
        <p className="tnum text-4xl font-black leading-none tracking-tight text-foreground">{value}</p>
        <p className="mt-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
      </div>
    </Wrapper>
  );
}

/** Skeleton con la misma forma, para estados de carga. */
export function StatCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-card">
      <Skeleton className="size-12 rounded-2xl" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}
