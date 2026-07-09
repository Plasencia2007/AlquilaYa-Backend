'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

import { EASE_OUT_EXPO } from './easing';

interface SlideUpProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Entrada más pronunciada que <FadeIn> — para un elemento protagonista
 * (título de hero, tarjeta destacada), no para grids completos.
 * Respeta prefers-reduced-motion (ítem 38): sin desplazamiento si está activo.
 */
export function SlideUp({ children, delay = 0, className }: SlideUpProps) {
  const prefiereReducido = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: prefiereReducido ? 0 : 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefiereReducido ? 0.15 : 0.6, delay, ease: EASE_OUT_EXPO }}
    >
      {children}
    </motion.div>
  );
}
