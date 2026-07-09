'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

import { EASE_OUT_EXPO } from './easing';

interface FadeInProps {
  children: ReactNode;
  /** Retraso en segundos — para escalonar manualmente sin usar <Stagger>. */
  delay?: number;
  className?: string;
  /** Desplazamiento vertical inicial en px (0 = solo fade, sin movimiento). */
  y?: number;
}

/**
 * Aparece con fade + leve desplazamiento hacia arriba al entrar en viewport.
 * Respeta prefers-reduced-motion (ítem 38): si está activo, solo hace fade,
 * sin desplazamiento — nunca deshabilita la animación por completo para que
 * el contenido no aparezca de golpe, pero quita el movimiento que puede
 * marear a quien lo pidió.
 */
export function FadeIn({ children, delay = 0, className, y = 12 }: FadeInProps) {
  const prefiereReducido = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: prefiereReducido ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: prefiereReducido ? 0.15 : 0.5, delay, ease: EASE_OUT_EXPO }}
    >
      {children}
    </motion.div>
  );
}
