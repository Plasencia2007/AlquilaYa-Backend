'use client';

import { Children } from 'react';
import type { ReactNode } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';

import { EASE_OUT_EXPO } from './easing';

interface StaggerProps {
  children: ReactNode;
  className?: string;
  /** Retraso entre cada hijo, en segundos. */
  staggerDelay?: number;
}

/**
 * Envuelve una lista de elementos (una grilla de cards, por ejemplo) y hace
 * que entren uno tras otro al llegar al viewport, en vez de todos a la vez.
 * Cada hijo directo se envuelve automáticamente — no requiere que el hijo
 * sepa que está dentro de un Stagger.
 *
 * Respeta prefers-reduced-motion (ítem 38): sin stagger ni desplazamiento,
 * los hijos aparecen juntos con solo un fade corto.
 */
export function Stagger({ children, className, staggerDelay = 0.08 }: StaggerProps) {
  const prefiereReducido = useReducedMotion();

  const container: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefiereReducido ? 0 : staggerDelay,
      },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: prefiereReducido ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: prefiereReducido ? 0.15 : 0.45, ease: EASE_OUT_EXPO },
    },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={container}
    >
      {Children.map(children, (child) => (
        <motion.div variants={item}>{child}</motion.div>
      ))}
    </motion.div>
  );
}
