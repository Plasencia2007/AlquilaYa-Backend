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
  amber:   'bg-amber-100 text-amber-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  blue:    'bg-blue-100 text-blue-600',
};

export function StatCard({ icon: Icon, label, value, href, accent = 'primary' }: Props) {
  const Wrapper = href ? Link : 'div';
  return (
    <Wrapper
      href={href as string}
      className={cn(
        'group flex flex-col gap-4 rounded-3xl border border-border bg-white p-6 shadow-sm transition-all duration-200',
        href && 'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
      )}
    >
      <span className={cn(
        'flex size-12 items-center justify-center rounded-2xl transition-transform duration-200',
        accentMap[accent],
        href && 'group-hover:scale-110',
      )}>
        <Icon className="size-6" aria-hidden />
      </span>
      <div>
        <p className="text-4xl font-black leading-none tracking-tight text-foreground">{value}</p>
        <p className="mt-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
      </div>
    </Wrapper>
  );
}
