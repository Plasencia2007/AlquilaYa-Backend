import { cn } from '@/lib/cn';

export type StatusDotStatus = 'success' | 'warning' | 'error' | 'neutral';

interface StatusDotProps {
  status: StatusDotStatus;
  pulse?: boolean;
  label?: string;
  className?: string;
}

const DOT_CLASSES: Record<StatusDotStatus, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
  neutral: 'bg-muted-foreground/40',
};

export function StatusDot({ status, pulse = false, label, className }: StatusDotProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative inline-flex size-1.5 shrink-0">
        {pulse && (
          <span
            className={cn(
              'absolute inline-flex size-full animate-ping rounded-full opacity-75',
              DOT_CLASSES[status],
            )}
            aria-hidden
          />
        )}
        <span
          className={cn('relative inline-flex size-1.5 rounded-full', DOT_CLASSES[status], className)}
          aria-hidden
        />
      </span>
      {label && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      )}
    </span>
  );
}
