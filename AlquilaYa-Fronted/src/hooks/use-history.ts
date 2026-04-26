'use client';

import { useEffect, useState } from 'react';

import { useHistoryStore } from '@/stores/history-store';

/**
 * Hidrata el store de historial (skipHydration: true) y devuelve helpers.
 * Sin esta hidratación explícita, el store empieza vacío en el cliente y
 * pisa el localStorage en el primer mount.
 */
export function useHistory() {
  const [hidratado, setHidratado] = useState(false);
  const entradas = useHistoryStore((s) => s.entradas);
  const registrar = useHistoryStore((s) => s.registrar);
  const limpiar = useHistoryStore((s) => s.limpiar);

  useEffect(() => {
    useHistoryStore.persist.rehydrate()?.then(() => setHidratado(true));
  }, []);

  return { entradas: hidratado ? entradas : [], hidratado, registrar, limpiar };
}
