'use client';

import { type ReactNode } from 'react';

import { useNotifications } from '@/hooks/use-notifications';
import { useStomp } from '@/hooks/use-stomp';

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

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <StudentSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <StudentTopbar />
        <main className="flex-1 overflow-x-hidden pb-24 md:pb-12">{children}</main>
      </div>
      <StudentBottomNav />
    </div>
  );
}
