import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/cn';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'dark' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  asChild?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, asChild = false, leftIcon, rightIcon, children, ...props }, ref) => {
    
    const Comp = asChild ? Slot : 'button';

    const variants = {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
      outline: 'border border-primary text-primary hover:bg-primary hover:text-primary-foreground',
      ghost: 'text-muted-foreground hover:bg-muted hover:text-primary',
      dark: 'bg-foreground text-background hover:bg-foreground/90',
      white: 'bg-card text-primary border border-border hover:bg-muted',
    };

    const sizes = {
      sm: 'px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider',
      md: 'px-6 py-2.5 text-sm',
      lg: 'px-8 py-3.5 text-base',
      xl: 'px-12 py-5 text-lg',
    };

    return (
      <Comp
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-bold transition-colors active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {!isLoading && leftIcon && <span className="flex shrink-0">{leftIcon}</span>}
            {children}
            {!isLoading && rightIcon && <span className="flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button };
