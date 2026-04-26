'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/cn';

interface Props {
  icon: LucideIcon;
  label: string;
  value: number | string;
  href?: string;
  accent?: 'primary' | 'amber' | 'emerald' | 'blue';
}

const accentMap = {
  primary: 'bg-primary/10 text-primary',
  amber: 'bg-amber-100 text-amber-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  blue: 'bg-blue-100 text-blue-700',
};

export function StatCard({ icon: Icon, label, value, href, accent = 'primary' }: Props) {
  const Wrapper: typeof Link | 'div' = href ? Link : 'div';
  return (
    <Wrapper
      href={href as string}
      className={cn(
        'flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all',
        href && 'hover:-translate-y-0.5 hover:border-primary hover:shadow-md',
      )}
    >
      <span className={cn('flex size-11 items-center justify-center rounded-xl', accentMap[accent])}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-black leading-none text-foreground">{value}</p>
        <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
    </Wrapper>
  );
}
