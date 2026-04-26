'use client';

import { useEffect } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { stompClient } from '@/services/stomp-client';
import { notificationService } from '@/services/notification-service';
import { useNotificationsStore } from '@/stores/notifications-store';
import { servicioAuth } from '@/services/auth-service';
import { notify } from '@/lib/notify';
import Cookies from 'js-cookie';
import type { Notificacion } from '@/types/notificacion';

/**
 * Inicializa la lista de notificaciones del usuario logueado y se mantiene
 * sincronizada vía WebSocket (`/topic/notificaciones.{userId}`).
 *
 * - Hidrata desde REST al montar.
 * - Suscribe al destino STOMP cuando STOMP esté conectado.
 * - Limpia el store al cerrar sesión.
 *
 * Devuelve helpers reactivos. Usar UNA SOLA VEZ en el shell privado.
 */
export function useNotifications() {
  const { estaAutenticado, cargando } = useAuth();
  const { items, noLeidas, cargada, setInicial, pushNueva, marcarLeida, marcarTodasLeidas, reset } =
    useNotificationsStore();

  const userId = obtenerUserIdDeCookie();

  useEffect(() => {
    if (cargando) return;
    if (!estaAutenticado) {
      if (cargada) reset();
      return;
    }
    if (cargada) return;

    let cancelado = false;
    Promise.all([notificationService.listar(0, 30), notificationService.contarNoLeidas()])
      .then(([pagina, count]) => {
        if (cancelado) return;
        setInicial(pagina.content ?? [], count);
      })
      .catch(() => {
        if (cancelado) return;
        setInicial([], 0);
      });

    return () => {
      cancelado = true;
    };
  }, [estaAutenticado, cargando, cargada, setInicial, reset]);

  // Suscripción WebSocket al topic personal
  useEffect(() => {
    if (!estaAutenticado || !userId) return;

    let unsubscribe: (() => void) | null = null;

    const connect = () => {
      unsubscribe = stompClient.subscribe(
        `/topic/notificaciones.${userId}`,
        (msg) => {
          try {
            const notif: Notificacion = JSON.parse(msg.body);
            pushNueva(notif);
            notify.info(notif.titulo, notif.mensaje);
          } catch {
            /* noop */
          }
        },
      );
    };

    if (stompClient.isConnected()) {
      connect();
    } else {
      const off = stompClient.onConnect(connect);
      return () => {
        off();
        if (unsubscribe) unsubscribe();
      };
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [estaAutenticado, userId, pushNueva]);

  const marcarLeidaConBackend = async (id: number) => {
    marcarLeida(id);
    try {
      await notificationService.marcarLeida(id);
    } catch (err) {
      notify.error(err, 'No se pudo marcar como leída');
    }
  };

  const marcarTodasLeidasConBackend = async () => {
    marcarTodasLeidas();
    try {
      await notificationService.marcarTodasLeidas();
    } catch (err) {
      notify.error(err, 'No se pudieron marcar como leídas');
    }
  };

  return {
    items,
    noLeidas,
    cargada,
    marcarLeida: marcarLeidaConBackend,
    marcarTodasLeidas: marcarTodasLeidasConBackend,
  };
}

function obtenerUserIdDeCookie(): string | null {
  const token = Cookies.get('auth-token');
  if (!token) return null;
  const usuario = servicioAuth.obtenerUsuarioActualDesdeToken(token);
  return usuario?.id ?? null;
}
