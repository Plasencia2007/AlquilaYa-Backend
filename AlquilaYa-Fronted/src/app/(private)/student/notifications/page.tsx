'use client';

import { CheckCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { NotificationList } from '@/components/shared/notification-list';
import { useNotificationList } from '@/hooks/use-notification-list';

export default function StudentNotificationsPage() {
  const {
    noLeidas,
    grupos,
    cargando,
    cargandoMas,
    error,
    hayMas,
    sentinelRef,
    onItemClick,
    onMarcarTodas,
    reintentar,
  } = useNotificationList();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-h1">
            Notificaciones
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            {noLeidas > 0 ? `Tienes ${noLeidas} sin leer` : 'Estás al día'}
          </p>
        </div>

        {noLeidas > 0 && (
          <Button variant="outline" size="sm" onClick={onMarcarTodas} className="gap-2">
            <CheckCheck className="size-4" /> Marcar todas
          </Button>
        )}
      </header>

      <NotificationList
        cargando={cargando}
        error={error}
        grupos={grupos}
        hayMas={hayMas}
        cargandoMas={cargandoMas}
        sentinelRef={sentinelRef}
        onItemClick={onItemClick}
        onRetry={reintentar}
      />
    </div>
  );
}
