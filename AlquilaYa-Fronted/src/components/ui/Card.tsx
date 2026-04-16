import * as React from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'lowest' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hoverable?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'surface', padding = 'md', hoverable = true, ...props }, ref) => {
    
    const variants = {
      surface: 'bg-surface-container-low border border-outline-variant/10',
      lowest: 'bg-surface-container-lowest border border-outline-variant/10',
      glass: 'bg-white/95 backdrop-blur-2xl border border-white/20',
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
          'rounded-[2.5rem] editorial-shadow transition-all duration-500 overflow-hidden',
          variants[variant],
          paddings[padding],
          hoverable && 'hover:shadow-2xl hover:-translate-y-1',
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export { Card };
