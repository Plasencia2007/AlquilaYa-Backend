'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { stompClient } from '@/services/stomp-client';
import { conversationService } from '@/services/conversation-service';
import { notify } from '@/lib/notify';
import { useAuth } from '@/hooks/use-auth';
import { servicioAuth } from '@/services/auth-service';
import Cookies from 'js-cookie';
import type {
  Conversacion,
  EventoConversacion,
  Mensaje,
} from '@/types/chat';

/**
 * Maneja el ciclo de vida de un chat individual:
 * - Carga la conversación + mensajes históricos.
 * - Suscribe al destino STOMP de mensajes nuevos.
 * - Suscribe al destino de eventos (read receipts + typing).
 * - Envía mensajes (REST), marca como leídos al abrir.
 * - Notifica typing al servidor con debounce.
 */
export function useConversation(conversacionId: number | string) {
  const { estaAutenticado } = useAuth();
  const [conversacion, setConversacion] = useState<Conversacion | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [otroEscribiendo, setOtroEscribiendo] = useState(false);

  const miPerfilId = obtenerMiPerfilId();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<boolean>(false);

  // Carga inicial + suscripciones
  useEffect(() => {
    if (!estaAutenticado || !conversacionId) return;

    let cancelado = false;
    let unsubMensajes: (() => void) | null = null;
    let unsubEventos: (() => void) | null = null;

    setCargando(true);
    setError(false);

    Promise.all([
      conversationService.obtener(conversacionId),
      conversationService.listarMensajes(conversacionId, 0, 100),
    ])
      .then(([conv, pagina]) => {
        if (cancelado) return;
        setConversacion(conv);
        // Backend devuelve ASC; mostramos del más antiguo arriba al más reciente abajo.
        setMensajes((pagina.content ?? []).slice().reverse().reverse());
        setCargando(false);
        // Marcar como leídos en background
        conversationService.marcarLeida(conv.id).catch(() => {/* noop */});
      })
      .catch(() => {
        if (cancelado) return;
        setError(true);
        setCargando(false);
      });

    const subscribirSiConectado = () => {
      const destinoMsgs = `/user/queue/conversacion.${conversacionId}`;
      const destinoEventos = `/user/queue/conversacion.${conversacionId}.eventos`;

      unsubMensajes = stompClient.subscribe(destinoMsgs, (msg) => {
        try {
          const nuevo: Mensaje = JSON.parse(msg.body);
          setMensajes((prev) => {
            if (prev.some((m) => m.id === nuevo.id)) return prev;
            return [...prev, nuevo];
          });
          // Si el mensaje no es mío, marcar como leído
          if (nuevo.emisorPerfilId !== miPerfilId) {
            conversationService
              .marcarLeida(conversacionId)
              .catch(() => {/* noop */});
          }
        } catch {
          /* noop */
        }
      });

      unsubEventos = stompClient.subscribe(destinoEventos, (msg) => {
        try {
          const evento: EventoConversacion = JSON.parse(msg.body);
          if (evento.tipo === 'MENSAJES_LEIDOS') {
            // El otro leyó mis mensajes: marcar mensajes míos sin fechaLectura.
            if (evento.lectorPerfilId !== miPerfilId) {
              setMensajes((prev) =>
                prev.map((m) =>
                  m.emisorPerfilId === miPerfilId && !m.fechaLectura
                    ? { ...m, fechaLectura: new Date().toISOString(), estado: 'LEIDO' }
                    : m,
                ),
              );
            }
          } else if (evento.tipo === 'TYPING') {
            if (evento.emisorPerfilId !== miPerfilId) {
              setOtroEscribiendo(evento.escribiendo);
            }
          }
        } catch {
          /* noop */
        }
      });
    };

    if (stompClient.isConnected()) {
      subscribirSiConectado();
    } else {
      const off = stompClient.onConnect(subscribirSiConectado);
      return () => {
        cancelado = true;
        off();
        if (unsubMensajes) unsubMensajes();
        if (unsubEventos) unsubEventos();
      };
    }

    return () => {
      cancelado = true;
      if (unsubMensajes) unsubMensajes();
      if (unsubEventos) unsubEventos();
    };
  }, [conversacionId, estaAutenticado, miPerfilId]);

  const enviar = useCallback(
    async (contenido: string) => {
      if (!contenido.trim()) return;
      try {
        const nuevo = await conversationService.enviarMensaje(conversacionId, contenido.trim());
        setMensajes((prev) =>
          prev.some((m) => m.id === nuevo.id) ? prev : [...prev, nuevo],
        );
        // Limpia typing al enviar
        publicarTyping(false);
      } catch (err) {
        notify.error(err, 'No pudimos enviar el mensaje');
      }
    },
    [conversacionId],
  );

  const publicarTyping = useCallback(
    (escribiendo: boolean) => {
      if (lastTypingSentRef.current === escribiendo) return;
      lastTypingSentRef.current = escribiendo;
      stompClient.publish(`/app/chat.typing/${conversacionId}`, { escribiendo });
    },
    [conversacionId],
  );

  const notificarTyping = useCallback(() => {
    publicarTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => publicarTyping(false), 2500);
  }, [publicarTyping]);

  return {
    conversacion,
    mensajes,
    cargando,
    error,
    otroEscribiendo,
    miPerfilId,
    enviar,
    notificarTyping,
  };
}

function obtenerMiPerfilId(): number | null {
  const token = Cookies.get('auth-token');
  if (!token) return null;
  const usuario = servicioAuth.obtenerUsuarioActualDesdeToken(token);
  const v = usuario?.perfilId;
  return typeof v === 'number' ? v : v ? Number(v) : null;
}
