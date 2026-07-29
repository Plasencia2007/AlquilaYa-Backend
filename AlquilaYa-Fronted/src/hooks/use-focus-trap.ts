'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface UseFocusTrapOptions {
  /** Si es `false`, el hook no hace nada (overlay cerrado/desmontado lógicamente). */
  active?: boolean;
  /** Se invoca al presionar Escape. Normalmente cierra el overlay. */
  onEscape?: () => void;
}

// Pila de traps activos a nivel de módulo: cubre el caso real del panel admin
// donde un `RejectModal`/`PromoteDialog` se abre POR ENCIMA de otro overlay ya
// abierto (ej. `PropertyReviewPanel`). Sin esto, Tab/Escape los manejarían
// ambos overlays a la vez (los `keydown` en `document` no dejan de disparar
// entre sí solo con `stopPropagation`, porque comparten el mismo target). Solo
// el trap más reciente (el que está arriba visualmente) reacciona.
const activeTraps: symbol[] = [];

/**
 * Focus trap básico para overlays montados a mano con `createPortal` (sin
 * Radix) — ítem 396 de MEJORAS.md. Los overlays nuevos deberían preferir
 * `Dialog`/`Sheet`/`AlertDialog` de `@radix-ui/*` (ya migrados en el ítem 42),
 * que atrapan foco nativamente; este hook es solo para los `createPortal`
 * heredados que siguen vivos en el panel admin y algunos paneles laterales.
 *
 * Devuelve un `ref` para poner en el contenedor raíz del modal/panel
 * (el `div` que recibe `role="dialog"`). Ese contenedor necesita
 * `tabIndex={-1}` para poder recibir foco como fallback si no hay ningún
 * elemento enfocable dentro.
 *
 * Comportamiento:
 *  - Al activarse, guarda el elemento con foco actual y mueve el foco al
 *    primer elemento enfocable dentro del contenedor (o al contenedor mismo).
 *  - Tab / Shift+Tab quedan atrapados dentro del contenedor (wrap al
 *    primer/último elemento enfocable).
 *  - Escape invoca `onEscape` si se pasó.
 *  - Al desactivarse/desmontar, devuelve el foco al elemento que lo tenía
 *    antes de abrir (evita perder la posición de un usuario de teclado).
 */
export function useFocusTrap<T extends HTMLElement>({
  active = true,
  onEscape,
}: UseFocusTrapOptions = {}) {
  const containerRef = useRef<T | null>(null);
  const idRef = useRef<symbol | null>(null);
  if (idRef.current === null) idRef.current = Symbol('focus-trap');

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const trapId = idRef.current as symbol;
    activeTraps.push(trapId);

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null,
      );

    // Foco inicial: primer elemento enfocable, o el propio contenedor.
    const initial = getFocusable();
    (initial[0] ?? container).focus({ preventScroll: true });

    const handleKeyDown = (e: KeyboardEvent) => {
      // Si hay un overlay más reciente abierto encima (ej. un RejectModal sobre
      // este panel), que sea ese el que reaccione a Tab/Escape, no este.
      if (activeTraps[activeTraps.length - 1] !== trapId) return;

      if (e.key === 'Escape') {
        if (onEscape) {
          e.stopPropagation();
          onEscape();
        }
        return;
      }
      if (e.key !== 'Tab') return;

      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else if (activeEl === last || !container.contains(activeEl)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      const idx = activeTraps.indexOf(trapId);
      if (idx !== -1) activeTraps.splice(idx, 1);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [active, onEscape]);

  return containerRef;
}
