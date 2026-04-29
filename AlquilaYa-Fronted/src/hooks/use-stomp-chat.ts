'use client';

import { useCallback, useEffect, useState } from 'react';

import { messagingService } from '@/services/messaging-service';
import { stompClient } from '@/services/stomp-client';
import type { Mensaje } from '@/types/messaging';

/**
 * Hook ligero de chat por STOMP para una conversación dada.
 *
 * - Carga histórico vía REST al montar.
 * - Suscribe a `/user/queue/conversacion.{id}` para recibir mensajes nuevos
 *   en vivo (el backend hace `convertAndSendToUser` a ambos participantes).
 * - Envía vía REST (`POST /mensajes`) — el servidor reenvía por STOMP.
 *
 * Para chat más completo (read-receipts, typing) usar `useConversation`.
 */
export function useStompChat(conversacionId: number | string | null | undefined) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [conectado, setConectado] = useState<boolean>(stompClient.isConnected());
  const [cargando, setCargando] = useState<boolean>(false);

  // Carga inicial
  useEffect(() => {
    if (!conversacionId) {
      setMensajes([]);
      return;
    }
    let cancelado = false;
    setCargando(true);
    messagingService
      .obtenerMensajes(conversacionId)
      .then((lista) => {
        if (cancelado) return;
        // El backend devuelve más recientes primero (Page DESC). Normalizamos
        // a orden cronológico ascendente para el render.
        const orden = lista
          .slice()
          .sort((a, b) => new Date(a.fechaEnvio).getTime() - new Date(b.fechaEnvio).getTime());
        setMensajes(orden);
        // Marcar como leído al abrir
        messagingService.marcarLeido(conversacionId).catch(() => {});
      })
      .catch(() => {
        if (cancelado) return;
        setMensajes([]);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [conversacionId]);

  // Suscripción STOMP
  useEffect(() => {
    if (!conversacionId) return;

    let unsub: (() => void) | null = null;

    const suscribir = () => {
      setConectado(true);
      unsub = stompClient.subscribe(
        `/user/queue/conversacion.${conversacionId}`,
        (msg) => {
          try {
            const nuevo: Mensaje = JSON.parse(msg.body);
            setMensajes((prev) =>
              prev.some((m) => m.id === nuevo.id) ? prev : [...prev, nuevo],
            );
            messagingService.marcarLeido(conversacionId).catch(() => {});
          } catch {
            /* noop */
          }
        },
      );
    };

    if (stompClient.isConnected()) {
      suscribir();
    } else {
      const off = stompClient.onConnect(suscribir);
      const offD = stompClient.onDisconnect(() => setConectado(false));
      return () => {
        off();
        offD();
        if (unsub) unsub();
      };
    }

    return () => {
      if (unsub) unsub();
    };
  }, [conversacionId]);

  const enviar = useCallback(
    async (contenido: string) => {
      if (!conversacionId || !contenido.trim()) return;
      try {
        const nuevo = await messagingService.enviarMensaje(conversacionId, contenido.trim());
        setMensajes((prev) =>
          prev.some((m) => m.id === nuevo.id) ? prev : [...prev, nuevo],
        );
      } catch {
        /* errores los maneja el caller con notify */
        throw new Error('No se pudo enviar el mensaje');
      }
    },
    [conversacionId],
  );

  return { mensajes, enviar, conectado, cargando };
}
