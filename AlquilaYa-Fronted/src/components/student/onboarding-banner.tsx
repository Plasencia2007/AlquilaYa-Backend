'use client';

import Link from 'next/link';
import { Check, Heart, ShieldCheck, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
  onCerrar?: () => void;
}

const ICONS = {
  verificacion: ShieldCheck,
  favoritos: Heart,
  reserva: Sparkles,
};

function iconoParaPaso(id: string) {
  if (id.includes('verif')) return ICONS.verificacion;
  if (id.includes('fav')) return ICONS.favoritos;
  return ICONS.reserva;
}

export function OnboardingBanner({ pasos, onCerrar }: Props) {
  const completados = pasos.filter((p) => p.completado).length;
  if (completados === pasos.length) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm">
      <div className="absolute -right-12 -top-12 size-48 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Sparkles className="size-6" aria-hidden />
        </span>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-headline text-lg font-bold text-foreground">
                ¡Bienvenido a AlquilaYa!
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Completa estos {pasos.length} pasos para sacarle el máximo provecho.
              </p>
            </div>
            {onCerrar && (
              <button
                type="button"
                onClick={onCerrar}
                aria-label="Ocultar"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <ul className="mt-4 space-y-2">
            {pasos.map((p) => {
              const Icon = iconoParaPaso(p.id);
              return (
                <li key={p.id}>
                  <Link
                    href={p.href}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl border p-3 transition-colors',
                      p.completado
                        ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800'
                        : 'border-border bg-background hover:border-primary',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-8 items-center justify-center rounded-full',
                        p.completado
                          ? 'bg-emerald-500 text-white'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {p.completado ? <Check className="size-4" /> : <Icon className="size-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{p.titulo}</p>
                      <p
                        className={cn(
                          'text-xs',
                          p.completado ? 'text-emerald-700' : 'text-muted-foreground',
                        )}
                      >
                        {p.descripcion}
                      </p>
                    </div>
                    {!p.completado && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs font-bold text-primary group-hover:bg-primary/10"
                        asChild
                      >
                        <span>Empezar</span>
                      </Button>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
