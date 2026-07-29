'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';
import { CheckCircle2, Home, MessageSquareQuote, Star, type LucideIcon } from 'lucide-react';

import { statsService, type PlataformaStats } from '@/services/stats-service';

interface StatItem {
  key: string;
  value: number;
  label: string;
  icon: LucideIcon;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

/**
 * Número que cuenta desde 0 hasta `value` al entrar en viewport (#86).
 * Respeta `prefers-reduced-motion`: si el usuario pide menos movimiento, muestra
 * el valor final directamente, sin animar.
 */
function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const prefiereReducido = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const enVista = useInView(ref, { once: true, margin: '-40px' });
  const [animado, setAnimado] = useState(0);

  useEffect(() => {
    if (!enVista || prefiereReducido) return;
    const controls = animate(0, value, {
      duration: 1.4,
      ease: 'easeOut',
      onUpdate: (v) => setAnimado(v),
    });
    return () => controls.stop();
  }, [enVista, value, prefiereReducido]);

  // Con "reducir movimiento" el valor final se deriva, no se setea: un setState
  // síncrono en el effect dispara un render en cascada (y el lint lo rechaza).
  const display = prefiereReducido ? value : animado;

  const formatted = display.toLocaleString('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return <span ref={ref}>{formatted}</span>;
}

/**
 * Banda de estadísticas de la plataforma (#86): cifras REALES que dan escala y confianza.
 * Si el endpoint falla o aún no hay ninguna cifra positiva, renderiza `null` — nunca
 * mostramos ceros ni cifras falsas (sería mentir sobre el tamaño del producto).
 */
export function PlatformStats() {
  const [stats, setStats] = useState<PlataformaStats | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    statsService
      .getPlataforma()
      .then((s) => {
        if (!cancelado) setStats(s);
      })
      .catch(() => {
        if (!cancelado) setFallo(true);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (fallo || !stats) return null;

  const items: StatItem[] = [
    {
      key: 'propiedades',
      value: stats.propiedadesActivas,
      label: 'Cuartos publicados',
      icon: Home,
      prefix: '+',
    },
    {
      key: 'reservas',
      value: stats.reservasCompletadas,
      label: 'Reservas completadas',
      icon: CheckCircle2,
      prefix: '+',
    },
    {
      key: 'resenas',
      value: stats.totalResenas,
      label: 'Reseñas de estudiantes',
      icon: MessageSquareQuote,
      prefix: '+',
    },
    {
      key: 'rating',
      value: stats.calificacionPromedio ?? 0,
      label: 'Calificación promedio',
      icon: Star,
      suffix: '/5',
      decimals: 1,
    },
  ].filter((it) => it.value > 0);

  if (items.length === 0) return null;

  return (
    <section className="border-y border-border bg-card px-6 py-16 sm:px-12 md:py-20">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 md:grid-cols-4 md:gap-6">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.key} className="flex flex-col items-center text-center">
              <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-6" aria-hidden />
              </span>
              <p className="tnum text-4xl font-black leading-none tracking-tight text-foreground md:text-5xl">
                {it.prefix}
                <AnimatedNumber value={it.value} decimals={it.decimals} />
                {it.suffix}
              </p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {it.label}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
