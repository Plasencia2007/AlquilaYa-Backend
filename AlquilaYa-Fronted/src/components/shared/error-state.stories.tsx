import { ErrorState } from './error-state';

export default {
  title: 'shared / ErrorState',
};

export const ConReintentar = () => <ErrorState onRetry={() => {}} />;

export const Personalizado = () => (
  <ErrorState
    title="No pudimos cargar este cuarto"
    description="Inténtalo de nuevo en un momento."
    retryLabel="Reintentar"
    onRetry={() => {}}
  />
);

export const SinAccion = () => <ErrorState />;
