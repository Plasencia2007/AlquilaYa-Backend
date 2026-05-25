'use client';

import dynamic from 'next/dynamic';

const PropertyCompareBar = dynamic(
  () =>
    import('@/components/student/property-compare-bar').then(
      (m) => m.PropertyCompareBar,
    ),
  { ssr: false },
);

export function ClientChrome() {
  return <PropertyCompareBar />;
}
