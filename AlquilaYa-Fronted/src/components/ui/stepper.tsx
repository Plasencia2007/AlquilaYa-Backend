'use client';

import * as React from 'react';
import { Check } from 'lucide-react';

import { cn } from '@/lib/cn';

export interface StepperStep {
  key: string;
  label: string;
}

type StepStatus = 'done' | 'current' | 'next';

function statusOf(index: number, currentIndex: number): StepStatus {
  if (index < currentIndex) return 'done';
  if (index === currentIndex) return 'current';
  return 'next';
}

const STATUS_LABEL: Record<StepStatus, string> = {
  done: 'completado',
  current: 'paso actual',
  next: 'pendiente',
};

interface StepperProps {
  steps: StepperStep[];
  currentIndex: number;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Stepper({ steps, currentIndex, orientation = 'horizontal', className }: StepperProps) {
  const isHorizontal = orientation === 'horizontal';
  const clampedIndex = Math.min(Math.max(currentIndex, 0), steps.length - 1);
  const progressPct = steps.length > 1 ? (clampedIndex / (steps.length - 1)) * 100 : 0;

  return (
    <ol
      role="list"
      aria-label="Progreso del flujo"
      className={cn(
        'relative',
        isHorizontal ? 'flex justify-between px-2' : 'flex flex-col gap-6',
        className,
      )}
    >
      {isHorizontal ? (
        <>
          <div className="absolute left-[12.5%] right-[12.5%] top-5 h-0.5 bg-border" aria-hidden />
          <div
            className="absolute left-[12.5%] top-5 h-0.5 bg-primary transition-all duration-500"
            style={{ width: `${progressPct * 0.75}%` }}
            aria-hidden
          />
        </>
      ) : (
        <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-border" aria-hidden />
      )}

      {steps.map((step, i) => {
        const status = statusOf(i, clampedIndex);
        return (
          <li
            key={step.key}
            aria-current={status === 'current' ? 'step' : undefined}
            className={cn(
              'relative z-10 flex items-center gap-3',
              isHorizontal ? 'flex-col text-center' : 'flex-row',
            )}
          >
            <span
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm transition-all duration-300',
                status === 'done' && 'bg-primary text-primary-foreground shadow-primary/20',
                status === 'current' &&
                  'bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-4 ring-primary/15',
                status === 'next' && 'border border-border bg-card text-muted-foreground',
              )}
            >
              {status === 'done' ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
            <span
              className={cn(
                'text-[11px] font-bold uppercase tracking-wider',
                status === 'next' ? 'text-muted-foreground/50' : 'text-primary',
              )}
            >
              {step.label}
              <span className="sr-only"> ({STATUS_LABEL[status]})</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
