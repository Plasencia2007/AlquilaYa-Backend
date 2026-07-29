/**
 * Capa de telemetría CLIENTE (ítem 139 + sink backend ítem 455).
 *
 * `track()` deja el evento en dos sitios:
 *   1. `console.debug` en desarrollo (visibilidad inmediata).
 *   2. Un buffer acotado en `localStorage` (`leerEventos`/`limpiarEventos`), para inspección
 *      manual o un futuro dashboard admin CLIENTE-side.
 *
 * SINK REAL (ítem 455): además, cada evento se encola para enviarse en BATCH al backend
 * (`POST .../usuarios/analytics/eventos`, servicio-usuarios) — ver la sección "Envío al
 * backend" más abajo. El resto del código sigue llamando a `track(evento, props)` sin cambios;
 * enchufar o cambiar el backend es local a este archivo.
 */

import { api } from '@/lib/api';

export interface AnalyticsEvent {
  evento: string;
  props: Record<string, unknown>;
  /** epoch ms */
  en: number;
}

const BUFFER_KEY = 'alquilaya-analytics';
const MAX_EVENTOS = 200;

// ---------------------------------------------------------------------------------------
// Envío al backend (ítem 455)
// ---------------------------------------------------------------------------------------

/** Cola de eventos pendientes de enviar, persistida en localStorage para sobrevivir un reload. */
const PENDING_KEY = 'alquilaya-analytics-pending';
/** Tope de la cola pendiente: si el backend está caído por mucho tiempo, no crece sin límite. */
const MAX_PENDING = 200;
/** Nº de eventos en cola que dispara un flush inmediato (sin esperar al intervalo). */
const FLUSH_THRESHOLD = 10;
/** Intervalo del flush periódico. */
const FLUSH_INTERVAL_MS = 10_000;
/** Máx. eventos por request — debe calzar con el límite del batch en el backend. */
const MAX_BATCH_SIZE = 50;
/** sessionStorage (no localStorage): el id se renueva por pestaña/sesión de navegación. */
const SESSION_KEY = 'alquilaya-analytics-session';

interface EventoPendiente {
  evento: string;
  props: Record<string, unknown>;
  sessionId: string;
  /** epoch ms en el cliente (informativo; el backend usa su propio reloj). */
  timestamp: number;
}

let flushTimerIniciado = false;
let flushEnCurso = false;

function nuevoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Id anónimo de sesión de navegador, generado una vez y cacheado en `sessionStorage` (no
 * `localStorage`: debe renovarse por pestaña/sesión, no persistir indefinidamente). Best-effort:
 * si `sessionStorage` no está disponible, devuelve un id de un solo uso.
 */
function obtenerSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = nuevoId();
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return nuevoId();
  }
}

function leerPendientes(): EventoPendiente[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as EventoPendiente[]) : [];
  } catch {
    return [];
  }
}

function guardarPendientes(items: EventoPendiente[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(items.slice(-MAX_PENDING)));
  } catch {
    /* localStorage lleno / bloqueado → best-effort, se ignora */
  }
}

function urlEventos(): string {
  const base = api.defaults.baseURL || '';
  return `${base}usuarios/analytics/eventos`;
}

/** Encola un evento para el backend y dispara un flush inmediato si ya hay bastante acumulado. */
function encolarParaBackend(entry: EventoPendiente): void {
  const pendientes = leerPendientes();
  pendientes.push(entry);
  guardarPendientes(pendientes);
  asegurarFlushTimer();
  if (pendientes.length >= FLUSH_THRESHOLD) {
    void flush();
  }
}

/** Arranca el temporizador de flush periódico y los listeners de cierre de pestaña (una sola vez). */
function asegurarFlushTimer(): void {
  if (flushTimerIniciado || typeof window === 'undefined') return;
  flushTimerIniciado = true;

  setInterval(() => {
    void flush();
  }, FLUSH_INTERVAL_MS);

  // Última oportunidad de mandar lo pendiente si el usuario cierra u oculta la pestaña.
  window.addEventListener('pagehide', flushFinal);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushFinal();
    });
  }
}

/**
 * Manda hasta `MAX_BATCH_SIZE` eventos pendientes al backend con `fetch`. Sólo vacía la cola
 * (los que se mandaron) si el backend confirmó una respuesta 2xx; si falla (red caída, backend
 * caído, 4xx/5xx), la cola queda intacta para reintentar en el próximo ciclo. Nunca lanza ni
 * rompe al caller — `track()` no espera esta promesa.
 */
async function flush(): Promise<void> {
  if (flushEnCurso || typeof window === 'undefined') return;
  const pendientes = leerPendientes();
  if (pendientes.length === 0) return;

  flushEnCurso = true;
  try {
    const lote = pendientes.slice(0, MAX_BATCH_SIZE);
    const resp = await fetch(urlEventos(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Endpoint público, pero manda el cookie de sesión si hay uno: así el backend puede
      // resolver usuarioId para usuarios logueados (ver AnalyticsController#usuarioIdOpcional).
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify({ eventos: lote }),
    });
    if (resp.ok) {
      // Sólo descarta del storage lo que efectivamente se mandó en este lote (por si se
      // encolaron eventos nuevos mientras el request estaba en vuelo, quedan intactos al final).
      guardarPendientes(leerPendientes().slice(lote.length));
    }
    // 4xx/5xx: se deja la cola intacta, se reintenta en el próximo ciclo. No se lanza.
  } catch {
    // Red caída / offline: se deja la cola intacta, se reintenta en el próximo ciclo.
  } finally {
    flushEnCurso = false;
  }
}

/**
 * Último intento de envío al ocultar/cerrar la pestaña: usa `navigator.sendBeacon` (no bloquea
 * la navegación y sobrevive al cierre de la página) si está disponible y aplica; si no, degrada
 * a un `fetch` con `keepalive`. Best-effort y síncrono: nunca lanza.
 */
function flushFinal(): void {
  if (typeof window === 'undefined') return;
  const pendientes = leerPendientes();
  if (pendientes.length === 0) return;
  const lote = pendientes.slice(0, MAX_BATCH_SIZE);
  const body = JSON.stringify({ eventos: lote });

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      // sendBeacon no confirma entrega, pero es la última oportunidad de todos modos: se
      // limpia la cola de forma optimista sólo si el navegador aceptó encolar el envío.
      if (navigator.sendBeacon(urlEventos(), blob)) {
        guardarPendientes(leerPendientes().slice(lote.length));
        return;
      }
    }
    void fetch(urlEventos(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true,
      body,
    }).catch(() => {
      /* la página ya se está cerrando/ocultando — best-effort, nada más que hacer */
    });
  } catch {
    /* nunca debe romper el cierre/ocultado de la pestaña */
  }
}

// ---------------------------------------------------------------------------------------
// API pública (firma sin cambios — no romper a los callers existentes de track())
// ---------------------------------------------------------------------------------------

/**
 * Emite un evento de telemetría. Best-effort: nunca lanza (si `localStorage` falla o no está
 * disponible, se ignora). Seguro en SSR (comprueba `window`).
 */
export function track(evento: string, props: Record<string, unknown> = {}): void {
  const entry: AnalyticsEvent = { evento, props, en: Date.now() };

  if (process.env.NODE_ENV !== 'production') {
    // Ítem 360: `no-console` ahora es regla de error (solo permite warn/error) — este debug
    // es intencional y ya está gateado a dev-only, así que se exceptúa en vez de borrarlo.
    // eslint-disable-next-line no-console
    console.debug('[analytics]', evento, props);
  }

  if (typeof window === 'undefined') return;

  try {
    const raw = window.localStorage.getItem(BUFFER_KEY);
    const buffer: AnalyticsEvent[] = raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
    buffer.push(entry);
    // Mantiene solo los últimos N para no crecer sin límite.
    window.localStorage.setItem(BUFFER_KEY, JSON.stringify(buffer.slice(-MAX_EVENTOS)));
  } catch {
    /* localStorage lleno / bloqueado → best-effort, se ignora */
  }

  // Sink real (ítem 455): además del buffer de debug de arriba, encola el evento para el
  // backend. Nunca debe propagar una excepción hacia el caller de track().
  try {
    encolarParaBackend({ evento, props, sessionId: obtenerSessionId(), timestamp: entry.en });
  } catch {
    /* best-effort, igual que el resto de esta función */
  }
}

/** Lee el buffer local de eventos (para un dashboard admin futuro). */
export function leerEventos(): AnalyticsEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(BUFFER_KEY);
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

/** Vacía el buffer local de eventos. */
export function limpiarEventos(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(BUFFER_KEY);
  } catch {
    /* no-op */
  }
}
