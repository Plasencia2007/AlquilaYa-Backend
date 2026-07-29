import type { FieldValues, UseFormSetError } from 'react-hook-form';

/**
 * Extrae un mensaje legible de un error del backend.
 *
 * El backend devuelve siempre un JSON con esta forma:
 *   {
 *     timestamp, status, error,
 *     message: "Texto para el usuario",
 *     path,
 *     validationErrors?: { campo: "razón", ... }
 *   }
 *
 * Acepta:
 *  - `Response` (de fetch)
 *  - cualquier error de Axios (con `error.response.data`)
 *  - cualquier `Error` con `.message`
 *  - desconocido (string final)
 */
export type BackendError = {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  path?: string;
  validationErrors?: Record<string, string>;
};

/**
 * Convierte una `Response` (fetch) en un mensaje amigable.
 * Lee el body como texto, intenta parsear JSON; si tiene `message`, ese gana.
 */
export async function parseFetchError(response: Response, fallback?: string): Promise<string> {
  let text = '';
  try {
    text = await response.text();
  } catch {
    // body ilegible
  }
  return formatPayload(text, response.status, fallback);
}

/**
 * Convierte un error de Axios o cualquier excepción en un mensaje amigable.
 * Uso: `setError(parseAxiosError(err))` en un catch.
 */
export function parseAxiosError(error: unknown, fallback?: string): string {
  if (!error) return fallback ?? 'Error desconocido';

  const e = error as { response?: { status?: number; data?: unknown }; message?: string };

  // Error de Axios con respuesta del servidor
  if (e.response?.data !== undefined) {
    const status = e.response.status;
    const data = e.response.data;
    if (typeof data === 'string') {
      return formatPayload(data, status, fallback);
    }
    if (data && typeof data === 'object') {
      return formatBackendError(data as BackendError, status, fallback);
    }
  }

  // Error de red / sin respuesta
  if (e.message) {
    if (e.message.toLowerCase().includes('network')) {
      return 'No pudimos contactar al servidor. Revisa tu conexión.';
    }
    return e.message;
  }

  return fallback ?? 'Error desconocido';
}

/** Intenta parsear un body crudo (JSON) a `BackendError`. `undefined` si no es JSON válido. */
function tryParseBackendError(raw: string): BackendError | undefined {
  try {
    return JSON.parse(raw) as BackendError;
  } catch {
    return undefined;
  }
}

/** Intenta parsear un body crudo y formatear. Si no es JSON válido, lo devuelve tal cual. */
function formatPayload(raw: string, status?: number, fallback?: string): string {
  if (!raw) return fallback ?? mensajePorStatus(status) ?? 'Error desconocido';
  const obj = tryParseBackendError(raw);
  if (obj) return formatBackendError(obj, status, fallback);
  // No es JSON, devolver el texto plano truncado por si acaso
  return raw.length > 300 ? raw.slice(0, 300) + '…' : raw;
}

/**
 * Extrae el `BackendError` (ya parseado) del payload de un error de Axios, sea el body un
 * string JSON o ya un objeto. Mismo parsing que usa `parseAxiosError` internamente
 * (`tryParseBackendError`) — no lo reimplementa, lo comparte. `undefined` si no hay payload
 * reconocible.
 */
function extractBackendError(error: unknown): BackendError | undefined {
  if (!error) return undefined;
  const e = error as { response?: { data?: unknown } };
  const data = e.response?.data;
  if (data === undefined) return undefined;
  if (typeof data === 'string') return tryParseBackendError(data);
  if (data && typeof data === 'object') return data as BackendError;
  return undefined;
}

/**
 * Mapea los `validationErrors` del backend a errores de campo de react-hook-form (ítem 190).
 * A diferencia de `parseAxiosError` (que arma un string para un toast genérico), esta función
 * setea el error directamente en cada campo del formulario.
 *
 * Uso: `if (!applyServerErrors(form.setError, err)) notify.error(err, 'fallback')`.
 *
 * Tipado como `UseFormSetError<TFieldValues>` (el tipo real de `form.setError`) para que
 * cualquier formulario pueda pasar su `form.setError` directo, sin adaptarlo.
 *
 * @returns `true` si mapeó al menos un error de campo (el caller puede omitir el toast
 *   genérico); `false` si no había `validationErrors` (el caller debe mostrar un fallback).
 */
export function applyServerErrors<TFieldValues extends FieldValues = FieldValues>(
  setError: UseFormSetError<TFieldValues>,
  err: unknown,
): boolean {
  const data = extractBackendError(err);
  const entradas = Object.entries(data?.validationErrors ?? {});
  if (entradas.length === 0) return false;
  for (const [campo, mensaje] of entradas) {
    // El nombre de campo llega en runtime desde el backend: no se puede acotar en tiempo de
    // compilación al union literal (`FieldPath<TFieldValues>`) que exige react-hook-form.
    setError(campo as never, { message: mensaje });
  }
  return true;
}

function formatBackendError(data: BackendError, status?: number, fallback?: string): string {
  // 1. Si hay validationErrors, listamos los problemas por campo
  if (data.validationErrors && Object.keys(data.validationErrors).length > 0) {
    const lines = Object.entries(data.validationErrors).map(([campo, msg]) => `• ${campo}: ${msg}`);
    const titulo = data.message ? `${data.message}\n` : '';
    return `${titulo}${lines.join('\n')}`;
  }
  // 2. Si hay un message del backend, lo usamos
  if (data.message) return data.message;
  // 3. Si hay error genérico (ej. "Bad Request") + status
  if (data.error) return data.error;
  // 4. Fallback por status code
  return fallback ?? mensajePorStatus(status ?? data.status) ?? 'Error desconocido';
}

function mensajePorStatus(status?: number): string | undefined {
  if (!status) return undefined;
  const map: Record<number, string> = {
    400: 'Datos inválidos.',
    401: 'No autorizado. Inicia sesión nuevamente.',
    403: 'No tienes permiso para esta acción.',
    404: 'Recurso no encontrado.',
    409: 'Conflicto con los datos existentes.',
    429: 'Demasiadas solicitudes. Espera un minuto.',
    500: 'Error en el servidor. Inténtalo más tarde.',
    503: 'Servicio temporalmente no disponible.',
  };
  return map[status];
}
