import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from './config';

// Configuración server-side de next-intl. Por ahora un solo locale (es).
// Cuando se agreguen más, leer de cookie/header y devolver el match.
export default getRequestConfig(async () => ({
  locale: defaultLocale,
  messages: (await import('./messages/es.json')).default,
}));
