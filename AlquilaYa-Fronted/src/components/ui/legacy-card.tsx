import * as React from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'lowest' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hoverable?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'surface', padding = 'md', hoverable = true, ...props }, ref) => {
    
    const variants = {
      surface: 'bg-card border border-border',
      lowest: 'bg-card border border-border',
      glass: 'bg-card/80 backdrop-blur-sm border border-border',
    };

    const paddings = {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8 sm:p-10',
      xl: 'p-12 sm:p-16',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl shadow-card transition-colors duration-200 overflow-hidden',
          variants[variant],
          paddings[padding],
          hoverable && 'hover:border-foreground/20',
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export { Card };
