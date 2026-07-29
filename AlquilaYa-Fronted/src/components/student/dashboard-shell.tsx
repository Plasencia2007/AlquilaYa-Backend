'use client';

import { type ReactNode, useEffect } from 'react';

import { useNotifications } from '@/hooks/use-notifications';
import { useStomp } from '@/hooks/use-stomp';
import { conversationService } from '@/services/conversation-service';
import { useUnreadMessagesStore } from '@/stores/unread-messages-store';

import { StudentBottomNav } from './student-bottom-nav';
import { StudentSidebar } from './student-sidebar';
import { StudentTopbar } from './student-topbar';

/**
 * Layout shell del dashboard estudiante. Inicializa la conexión STOMP y la
 * suscripción a notificaciones in-app — debe montarse UNA SOLA VEZ por sesión
 * en el layout privado.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  useStomp();
  useNotifications();

  const setTotalNoLeidos = useUnreadMessagesStore((s) => s.setTotal);

  // Ítem 245: sin este fetch, el badge de "Mensajes" (bottom nav / sidebar)
  // se quedaba en 0 hasta que el estudiante visitara /student/messages, ya
  // que ese era el único lugar que poblaba `unread-messages-store`. Este
  // shell se monta una sola vez por sesión en el layout privado (igual que
  // `useNotifications()` arriba), así que basta un fetch al montar — mismo
  // patrón que `student/messages/page.tsx` (no hay endpoint de solo-conteo
  // en servicio-mensajeria, así que sumamos `noLeidos` de `listarMias()`).
  useEffect(() => {
    let cancelado = false;
    conversationService
      .listarMias()
      .then((data) => {
        if (cancelado) return;
        setTotalNoLeidos(data.reduce((acc, c) => acc + (c.noLeidos || 0), 0));
      })
      .catch(() => {
        // Silencioso: el badge simplemente no se poblará; cada página de
        // mensajes reintenta su propio fetch y corrige el total.
      });
    return () => {
      cancelado = true;
    };
  }, [setTotalNoLeidos]);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <StudentSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <StudentTopbar />
        <main id="contenido" className="flex-1 overflow-x-hidden pb-24 md:pb-12">{children}</main>
      </div>
      <StudentBottomNav />
    </div>
  );
}
