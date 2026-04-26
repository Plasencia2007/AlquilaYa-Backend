'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ErrorState } from '@/components/shared/error-state';

interface RootErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

// Error boundary del segmento root. Next 16 cambia `reset` por `unstable_retry`.
export default function RootError({ error, unstable_retry }: RootErrorProps) {
  const t = useTranslations('errors.boundary');

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Root error boundary:', error);
  }, [error]);

  return (
    <ErrorState
      title={t('title')}
      description={t('description')}
      retryLabel={t('retry')}
      onRetry={unstable_retry}
    />
  );
}
