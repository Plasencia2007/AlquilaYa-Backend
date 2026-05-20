'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui/skeleton';
import type { Propiedad } from '@/types/propiedad';

const PropertiesMap = dynamic(() => import('@/components/shared/PropertiesMap'), {
  ssr: false,
  loading: () => (
    <div className="mx-auto aspect-square w-full max-w-2xl overflow-hidden rounded-2xl border border-border">
      <Skeleton className="h-full w-full" />
    </div>
  ),
});

interface Props {
  propiedades: Propiedad[];
}

export function MapResults({ propiedades }: Props) {
  return (
    <div className="mx-auto aspect-square w-full max-w-2xl overflow-hidden rounded-2xl border border-border shadow-sm">
      <PropertiesMap
        propiedades={propiedades}
        className="h-full w-full"
      />
    </div>
  );
}
