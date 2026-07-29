/**
 * Persistencia de la posición de scroll de los resultados (ítem 129).
 *
 * Volver de la ficha de una propiedad ya no manda al tope: guardamos el `scrollTop`
 * del contenedor scrolleable (o `window`) en `sessionStorage`, keyed por la URL de
 * búsqueda, y lo restauramos al volver. `sessionStorage` (no `localStorage`) porque
 * la restauración solo tiene sentido dentro de la misma sesión de navegación.
 *
 * En /search el scroller cambia según el breakpoint: en desktop la columna de cards
 * tiene su propio `overflow-y-auto`; en móvil/tablet scrollea la `window`. Por eso
 * `scrollerActivo()` decide en runtime cuál es el que realmente scrollea.
 */

const PREFIX = 'alquilaya-scroll:';

/**
 * Devuelve el elemento que realmente scrollea: el contenedor si tiene overflow
 * propio (desktop), o `window` si el contenido fluye en la página (móvil/tablet o
 * columna oculta en vista mapa).
 */
export function scrollerActivo(el: HTMLElement | null): HTMLElement | Window {
  if (el && el.scrollHeight > el.clientHeight + 4) return el;
  return window;
}

/** Lee el scrollTop actual del scroller activo. */
export function leerScrollActual(el: HTMLElement | null): number {
  const scroller = scrollerActivo(el);
  return scroller === window ? window.scrollY : (scroller as HTMLElement).scrollTop;
}

/** Aplica una posición de scroll al scroller activo (sincronización con el DOM). */
export function aplicarScroll(el: HTMLElement | null, top: number): void {
  const scroller = scrollerActivo(el);
  if (scroller === window) window.scrollTo(0, top);
  else (scroller as HTMLElement).scrollTop = top;
}

export function guardarScrollPos(key: string, value: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PREFIX + key, String(Math.round(value)));
  } catch {
    /* sessionStorage no disponible → best-effort */
  }
}

export function leerScrollPos(key: string): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.sessionStorage.getItem(PREFIX + key);
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
