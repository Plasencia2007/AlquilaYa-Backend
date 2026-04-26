import { Suspense } from 'react';

import { SkeletonCardGrid } from '@/components/shared/skeleton-card';

import { SearchClient } from './search-client';

export const metadata = {
  title: 'Buscar cuartos · AlquilaYa',
  description:
    'Explora todos los cuartos disponibles cerca de la UPeU. Filtra por precio, distancia, servicios y más.',
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-28 sm:px-12">
          <SkeletonCardGrid count={6} />
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
