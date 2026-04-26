import type { LucideIcon } from 'lucide-react';
import { FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?:
    | { type: 'button'; label: string; onClick: () => void }
    | { type: 'link'; label: string; href: string };
}

export function EmptyState({
  icon: Icon = FileX,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-7" aria-hidden />
      </div>
      <h2 className="font-headline text-xl font-bold tracking-tight">{title}</h2>
      {description && (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          {action.type === 'button' ? (
            <Button onClick={action.onClick}>{action.label}</Button>
          ) : (
            <Button asChild>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
