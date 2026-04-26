import { toast } from 'sonner';
import { parseAxiosError } from './api-errors';

/**
 * Wrapper unificado sobre sonner. Reusa `parseAxiosError` para extraer mensajes
 * legibles del backend automáticamente, evitando que se muestre JSON crudo.
 *
 * Uso típico:
 *   notify.success('Cuenta creada');
 *   notify.error(err);                 // error de Axios -> mensaje del backend
 *   notify.error(err, 'Fallo al guardar');
 *   notify.promise(api.post('/x'), { loading: 'Guardando…', success: 'Guardado' });
 */
export const notify = {
  success: (message: string, description?: string) =>
    toast.success(message, description ? { description } : undefined),

  info: (message: string, description?: string) =>
    toast.info(message, description ? { description } : undefined),

  warning: (message: string, description?: string) =>
    toast.warning(message, description ? { description } : undefined),

  error: (err: unknown, fallback?: string) =>
    toast.error(parseAxiosError(err, fallback)),

  promise: <T,>(
    promise: Promise<T>,
    options: { loading: string; success: string; error?: string },
  ) =>
    toast.promise(promise, {
      loading: options.loading,
      success: options.success,
      error: (e) => parseAxiosError(e, options.error),
    }),
};
