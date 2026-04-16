import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/utils/cn';
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
      primary: 'bg-primary text-on-primary shadow-lg shadow-primary/20 hover:bg-primary-container hover:shadow-xl',
      outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-on-primary',
      ghost: 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary',
      dark: 'bg-on-surface text-surface hover:bg-on-surface/90 shadow-xl',
      white: 'bg-white text-primary hover:bg-surface-container-low shadow-xl',
    };

    const sizes = {
      sm: 'px-4 py-1.5 text-[11px] font-black uppercase tracking-wider',
      md: 'px-6 py-2.5 text-sm',
      lg: 'px-8 py-3.5 text-base',
      xl: 'px-12 py-5 text-lg',
    };

    return (
      <Comp
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
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
