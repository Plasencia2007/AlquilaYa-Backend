import { useTranslations } from 'next-intl';
import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';

export default function NotFound() {
  const t = useTranslations('errors.notFound');
  return (
    <EmptyState
      icon={Compass}
      title={t('title')}
      description={t('description')}
      action={{ type: 'link', label: t('cta'), href: '/' }}
    />
  );
}
