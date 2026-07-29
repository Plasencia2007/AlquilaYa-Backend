'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

import { EASE_OUT_EXPO } from './easing';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

interface RevealOnScrollProps {
  children: ReactNode;
  /** Retraso en segundos — para escalonar manualmente sin usar <Stagger>. */
  delay?: number;
  className?: string;
  /** Dirección desde la que entra el contenido. 'none' = solo fade. */
  direction?: Direction;
  /** Magnitud del desplazamiento inicial en px. */
  distance?: number;
}

const OFFSET: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
  none: { x: 0, y: 0 },
};

/**
 * Revela su contenido al entrar en el viewport (`whileInView`), con fade +
 * desplazamiento direccional. Pensado para las secciones del home, que hoy
 * aparecen de golpe (ítem 90). A diferencia de <SlideUp> (que anima en montaje),
 * este espera a que el bloque sea visible.
 *
 * Respeta prefers-reduced-motion (ítem 38): si está activo, solo hace un fade
 * corto sin desplazamiento — el contenido nunca aparece de golpe, pero se
 * elimina el movimiento que puede marear a quien lo pidió.
 */
export function RevealOnScroll({
  children,
  delay = 0,
  className,
  direction = 'up',
  distance = 24,
}: RevealOnScrollProps) {
  const prefiereReducido = useReducedMotion();
  const { x, y } = OFFSET[direction];

  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        x: prefiereReducido ? 0 : x * distance,
        y: prefiereReducido ? 0 : y * distance,
      }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: prefiereReducido ? 0.15 : 0.55, delay, ease: EASE_OUT_EXPO }}
    >
      {children}
    </motion.div>
  );
}
