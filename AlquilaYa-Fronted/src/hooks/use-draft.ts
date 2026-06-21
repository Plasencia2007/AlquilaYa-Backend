'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type DraftStatus = 'idle' | 'guardando' | 'guardado';

/**
 * Autoguardado de borradores en localStorage. Restaura el borrador una vez al montar
 * (fusionándolo con el valor inicial) y guarda con debounce en cada cambio. Pensado para
 * formularios largos (ej. publicar propiedad) para no perder lo escrito.
 *
 * Nota: solo persiste datos serializables (no archivos/File). Las imágenes no se guardan.
 *
 * @param key       clave de localStorage (incluir el id de usuario para no mezclar borradores).
 * @param value     estado actual del formulario.
 * @param setValue  setter para aplicar el borrador restaurado.
 * @param opts.enabled     desactiva todo si es false (ej. mientras carga el usuario).
 * @param opts.hasContent  evita guardar/restaurar borradores "vacíos".
 */
export function useDraft<T>(
  key: string,
  value: T,
  setValue: (v: T) => void,
  opts?: { enabled?: boolean; debounceMs?: number; hasContent?: (v: T) => boolean },
) {
  const enabled = opts?.enabled ?? true;
  const [status, setStatus] = useState<DraftStatus>('idle');
  const [restaurado, setRestaurado] = useState(false);
  const cargado = useRef(false);

  // Restaurar una sola vez al montar (post-hidratación, para no romper SSR).
  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const merged = { ...(value as object), ...(JSON.parse(raw) as object) } as T;
        if (!opts?.hasContent || opts.hasContent(merged)) {
          setValue(merged);
          setRestaurado(true);
        }
      }
    } catch {
      /* borrador corrupto: se ignora */
    }
    cargado.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  // Autoguardar (debounced) una vez intentada la restauración.
  useEffect(() => {
    if (!enabled || !cargado.current) return;
    if (opts?.hasContent && !opts.hasContent(value)) return;
    setStatus('guardando');
    const t = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        setStatus('guardado');
      } catch {
        /* sin espacio / no disponible: se ignora */
      }
    }, opts?.debounceMs ?? 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, key, enabled]);

  /** Borra el borrador y resetea el indicador (usar tras publicar con éxito). */
  const limpiar = useCallback(() => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    setStatus('idle');
    setRestaurado(false);
  }, [key]);

  return { status, restaurado, limpiar };
}
