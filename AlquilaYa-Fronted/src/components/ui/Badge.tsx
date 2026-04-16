import * as React from 'react';
import { cn } from '@/utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'surface' | 'glass' | 'success' | 'warning' | 'error';
}

function Badge({ className, variant = 'primary', ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    secondary: 'bg-secondary-container text-on-secondary-container',
    outline: 'border border-outline-variant/30 text-on-surface-variant',
    surface: 'bg-surface-container-high text-on-surface-variant',
    glass: 'bg-white/20 text-white border border-white/30 backdrop-blur-md',
    success: 'bg-green-500/10 text-green-500 border-green-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    error: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur-md transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
