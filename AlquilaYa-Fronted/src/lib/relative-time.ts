import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Convierte a Date con cuidado de un caso puntual: un ISO "solo fecha"
 * (`"2026-04-25"`, sin hora) se interpreta por spec como medianoche UTC, así
 * que en Perú (UTC-5) `new Date("2026-04-25")` muestra el día ANTERIOR. Le
 * agregamos hora local explícita antes de parsear para evitar ese corrimiento.
 */
function parseFecha(date: Date | string | number): Date {
  if (date instanceof Date) return date;
  if (typeof date === 'string' && SOLO_FECHA.test(date)) {
    return new Date(`${date}T00:00:00`);
  }
  return new Date(date);
}

/**
 * "hace 2 horas", "hace 3 días", etc. en español.
 */
export function tiempoRelativo(date: Date | string | number | null | undefined): string {
  if (!date) return '';
  try {
    const d = parseFecha(date);
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
    const d = parseFecha(date);
    if (Number.isNaN(d.getTime())) return '';
    return format(d, conHora ? "d 'de' MMM yyyy, HH:mm" : "d 'de' MMM yyyy", { locale: es });
  } catch {
    return '';
  }
}

/**
 * Rango de fechas legible: "25 abr — 30 abr 2026" (mismo año/mes se acorta),
 * o "28 dic 2026 — 3 ene 2027" si cruza de año.
 */
export function formatRango(
  desde: Date | string | number | null | undefined,
  hasta: Date | string | number | null | undefined,
): string {
  if (!desde || !hasta) return '';
  try {
    const d1 = parseFecha(desde);
    const d2 = parseFecha(hasta);
    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return '';

    const mismoAnio = d1.getFullYear() === d2.getFullYear();
    const inicio = format(d1, mismoAnio ? "d 'de' MMM" : "d 'de' MMM yyyy", { locale: es });
    const fin = format(d2, "d 'de' MMM yyyy", { locale: es });
    return `${inicio} — ${fin}`;
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
    const d = parseFecha(date);
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
