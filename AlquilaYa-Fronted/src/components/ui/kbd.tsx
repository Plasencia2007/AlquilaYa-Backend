import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface KbdProps {
  children: ReactNode;
  className?: string;
}

/** Tecla de atajo (#72) — borde + `bg-muted`, usado por el command palette y futuros atajos. */
export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-[18px] items-center justify-center rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
