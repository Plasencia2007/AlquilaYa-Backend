import { Check } from 'lucide-react';

import { cn } from '@/lib/cn';

export type TimelineStepStatus = 'completed' | 'active' | 'pending';

export interface TimelineStep {
  title: string;
  description?: string;
  status: TimelineStepStatus;
}

interface TimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export function Timeline({ steps, className }: TimelineProps) {
  return (
    <ol className={cn('space-y-4', className)}>
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <span
              aria-hidden
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold',
                step.status === 'completed' && 'border-primary bg-primary text-primary-foreground',
                step.status === 'active' && 'border-primary bg-background text-primary',
                step.status === 'pending' && 'border-border bg-background text-muted-foreground',
              )}
            >
              {step.status === 'completed' ? <Check className="size-3.5" /> : i + 1}
            </span>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn('mt-1 h-8 w-px', step.status === 'completed' ? 'bg-primary' : 'bg-border')}
              />
            )}
          </div>
          <div className="flex-1 pb-2">
            <p
              className={cn(
                'text-sm font-bold',
                step.status !== 'pending' ? 'text-foreground' : 'text-muted-foreground',
              )}
              aria-current={step.status === 'active' ? 'step' : undefined}
            >
              {step.title}
            </p>
            {step.description && (
              <p className="text-xs text-muted-foreground">{step.description}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
