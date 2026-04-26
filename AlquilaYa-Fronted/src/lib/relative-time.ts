import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * "hace 2 horas", "hace 3 días", etc. en español.
 */
export function tiempoRelativo(date: Date | string | number | null | undefined): string {
  if (!date) return '';
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    return formatDistanceToNow(d, { addSuffix: true, locale: es });
  } catch {
    return '';
  }
}

/**
 * Fecha legible: "25 abr 2026" o "25 abr 2026, 14:30".
 */
export function formatearFecha(
  date: Date | string | number | null | undefined,
  conHora = false,
): string {
  if (!date) return '';
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    return format(d, conHora ? "d 'de' MMM yyyy, HH:mm" : "d 'de' MMM yyyy", { locale: es });
  } catch {
    return '';
  }
}

/**
 * Fecha corta tipo chat: "10:42" si es hoy, "ayer" si fue ayer, "DD/MM" si esta semana, "DD/MM/YY" sino.
 */
export function tiempoChat(date: Date | string | number | null | undefined): string {
  if (!date) return '';
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const ahora = new Date();
    const diffMs = ahora.getTime() - d.getTime();
    const dia = 24 * 60 * 60 * 1000;
    if (
      ahora.getDate() === d.getDate() &&
      ahora.getMonth() === d.getMonth() &&
      ahora.getFullYear() === d.getFullYear()
    ) {
      return format(d, 'HH:mm');
    }
    if (diffMs < 2 * dia) return 'ayer';
    if (diffMs < 7 * dia) return format(d, 'EEE', { locale: es });
    return format(d, 'dd/MM/yy');
  } catch {
    return '';
  }
}
