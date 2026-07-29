'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface UseTabParamOptions<T extends string> {
  values: readonly T[];
  defaultValue: T;
  paramName?: string;
}

/**
 * Igual que `useSearchParamsState` pero para una sola tab: la URL (`?tab=`) es
 * la fuente de verdad, el valor por defecto se omite de la query, y setear un
 * valor ya activo no dispara navegación.
 */
export function useTabParam<T extends string>({
  values,
  defaultValue,
  paramName = 'tab',
}: UseTabParamOptions<T>) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const qsActual = searchParams?.toString() ?? '';
  const raw = searchParams?.get(paramName) ?? null;

  const tab = useMemo<T>(() => {
    return raw && (values as readonly string[]).includes(raw) ? (raw as T) : defaultValue;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, defaultValue]);

  const setTab = useCallback(
    (next: T) => {
      const params = new URLSearchParams(qsActual);
      if (next === defaultValue) {
        params.delete(paramName);
      } else {
        params.set(paramName, next);
      }
      const qs = params.toString();
      if (qs === qsActual) return;
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [qsActual, defaultValue, paramName, pathname, router],
  );

  return [tab, setTab] as const;
}
