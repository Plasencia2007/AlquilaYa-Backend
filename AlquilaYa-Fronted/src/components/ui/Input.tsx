import * as React from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: string;
  error?: string;
  wrapperClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, error, wrapperClassName, ...props }, ref) => {
    return (
      <div className={cn('space-y-2 w-full', wrapperClassName)}>
        <div className="relative group">
          {icon && (
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors duration-300">
              {icon}
            </span>
          )}
          <input
            type={type}
            className={cn(
              'w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl text-on-surface placeholder:text-outline/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium py-4 px-4',
              icon && 'pl-12',
              error && 'border-error focus:ring-error/20 focus:border-error',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && (
          <p className="text-error text-[10px] font-bold px-2 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
            <span className="material-symbols-outlined text-[14px]">error</span>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
