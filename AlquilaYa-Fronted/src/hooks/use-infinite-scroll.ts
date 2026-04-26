'use client';

import { useEffect, type RefObject } from 'react';

interface Options {
  enabled?: boolean;
  rootMargin?: string;
  threshold?: number;
}

/**
 * Llama a `onIntersect` cuando el elemento referenciado entra en el viewport.
 * Pensado para infinite scroll: pon un sentinel `<div>` al final del listado.
 */
export function useInfiniteScroll(
  ref: RefObject<HTMLElement | null>,
  onIntersect: () => void,
  { enabled = true, rootMargin = '400px', threshold = 0 }: Options = {},
) {
  useEffect(() => {
    const node = ref.current;
    if (!enabled || !node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onIntersect();
            break;
          }
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, enabled, rootMargin, threshold, onIntersect]);
}
