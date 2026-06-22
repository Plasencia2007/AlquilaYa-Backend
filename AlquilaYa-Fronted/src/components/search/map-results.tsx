'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import type { Propiedad } from '@/types/propiedad';

const PropertiesMap = dynamic(() => import('@/components/shared/PropertiesMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-border">
      <Skeleton className="h-full w-full" />
    </div>
  ),
});

interface Props {
  propiedades: Propiedad[];
  className?: string;
  activeId?: string | null;
  onHover?: (id: string | null) => void;
}

export function MapResults({ propiedades, className, activeId, onHover }: Props) {
  return (
    <div
      className={cn(
        'h-full w-full overflow-hidden rounded-2xl border border-border shadow-sm',
        className,
      )}
    >
      <PropertiesMap
        propiedades={propiedades}
        className="h-full w-full"
        activeId={activeId}
        onHover={onHover}
      />
    </div>
  );
}
