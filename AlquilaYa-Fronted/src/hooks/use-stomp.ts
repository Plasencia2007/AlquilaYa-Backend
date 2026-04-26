'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { stompClient } from '@/services/stomp-client';

/**
 * Conecta el cliente STOMP cuando hay sesión y lo desconecta al hacer logout.
 * Ejecutar UNA SOLA VEZ en el árbol (ej. en el shell privado).
 *
 * Devuelve `connected` reactivo para otras partes de la UI que necesiten saber
 * el estado del WebSocket.
 */
export function useStomp() {
  const { estaAutenticado, cargando } = useAuth();
  const [connected, setConnected] = useState(stompClient.isConnected());

  useEffect(() => {
    if (cargando) return;

    if (estaAutenticado) {
      stompClient.connect();
    } else {
      stompClient.disconnect();
      setConnected(false);
    }

    const offC = stompClient.onConnect(() => setConnected(true));
    const offD = stompClient.onDisconnect(() => setConnected(false));
    return () => {
      offC();
      offD();
    };
  }, [estaAutenticado, cargando]);

  return { connected };
}
