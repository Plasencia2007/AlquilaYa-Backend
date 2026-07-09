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
    glass: 'bg-card/80 backdrop-blur-sm text-foreground border border-border',
    success: 'bg-success-light text-success border border-success/20',
    warning: 'bg-warning-light text-warning border border-warning/20',
    error: 'bg-destructive/10 text-destructive border border-destructive/20',
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
