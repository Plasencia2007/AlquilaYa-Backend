'use client';

import Link from 'next/link';
import { Check, Heart, ShieldCheck, Sparkles } from 'lucide-react';

import { cn } from '@/lib/cn';

export interface OnboardingPaso {
  id: string;
  titulo: string;
  descripcion: string;
  href: string;
  completado: boolean;
}

interface Props {
  pasos: OnboardingPaso[];
}

const ICONS = {
  verificacion: ShieldCheck,
  favoritos:    Heart,
  reserva:      Sparkles,
};

function iconoParaPaso(id: string) {
  if (id.includes('verif')) return ICONS.verificacion;
  if (id.includes('fav'))   return ICONS.favoritos;
  return ICONS.reserva;
}

export function OnboardingBanner({ pasos }: Props) {
  const completados = pasos.filter((p) => p.completado).length;
  if (completados === pasos.length) return null;

  return (
    <section className="rounded-3xl border border-border bg-muted/30 p-6">
      {/* Cabecera */}
      <div className="mb-5 flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
          <Sparkles className="size-6" aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground">¡Bienvenido a AlquilaYa!</h2>
          <p className="text-sm text-muted-foreground">
            Completa estos {pasos.length} pasos para sacarle el máximo provecho.
          </p>
        </div>
      </div>

      {/* Pasos */}
      <ul className="space-y-2">
        {pasos.map((p) => {
          const Icon = iconoParaPaso(p.id);
          return (
            <li key={p.id}>
              <Link
                href={p.href}
                className={cn(
                  'group flex items-center gap-4 rounded-2xl border bg-card p-4 transition-all hover:-translate-y-px hover:shadow-card',
                  p.completado
                    ? 'border-success/20 bg-success-light/60'
                    : 'border-border hover:border-primary/40',
                )}
              >
                <span className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-full',
                  p.completado
                    ? 'bg-success text-success-foreground'
                    : 'bg-muted text-muted-foreground',
                )}>
                  {p.completado ? <Check className="size-4" /> : <Icon className="size-4" />}
                </span>

                <div className="flex-1">
                  <p className={cn('text-sm font-semibold', p.completado ? 'text-success' : 'text-foreground')}>
                    {p.titulo}
                  </p>
                  <p className={cn('text-xs', p.completado ? 'text-success/80' : 'text-muted-foreground')}>
                    {p.descripcion}
                  </p>
                </div>

                {!p.completado && (
                  <span className="text-xs font-bold text-primary">
                    Empezar →
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
