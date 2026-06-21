import * as React from 'react';
import { cn } from '@/lib/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'surface' | 'glass' | 'success' | 'warning' | 'error';
}

function Badge({ className, variant = 'primary', ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    primary: 'bg-primary/10 text-primary border border-primary/20',
    secondary: 'bg-secondary/10 text-secondary border border-secondary/20',
    outline: 'border border-border text-muted-foreground',
    surface: 'bg-muted text-muted-foreground border border-transparent',
    glass: 'bg-white text-foreground border border-border',
    success: 'bg-green-500/10 text-green-600 border border-green-500/20',
    warning: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
    error: 'bg-red-500/10 text-red-600 border border-red-500/20',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
