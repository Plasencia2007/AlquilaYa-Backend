'use client';

import { Button } from '@/components/ui/legacy-button';
import { NotificationList } from '@/components/shared/notification-list';
import { useNotificationList } from '@/hooks/use-notification-list';

/**
 * Ítem 343: paridad con `(private)/student/notifications` — antes esta página solo leía del
 * store global (tope ~30, sin paginar ni agrupar). Ahora comparte `useNotificationList()` +
 * `<NotificationList />` con el panel estudiante: fetch paginado propio, agrupación Hoy/Ayer/Esta
 * semana/Anteriores con headers sticky, ícono por tipo, y estados de carga/error/vacío. Solo el
 * encabezado (título, subtítulo y botón "marcar todas") se queda con el estilo propio del panel
 * arrendador (`legacy-button`, tipografía "torre de control").
 */
export default function LandlordNotificationsPage() {
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter opacity-90">
            Notificaciones
          </h1>
          <p className="text-muted-foreground text-[12px] font-medium mt-0.5 tracking-tight">
            {noLeidas > 0
              ? `Tienes ${noLeidas} ${noLeidas === 1 ? 'notificación' : 'notificaciones'} sin leer.`
              : 'Estás al día.'}
          </p>
        </div>
        {noLeidas > 0 && (
          <Button variant="ghost" size="sm" onClick={onMarcarTodas}>
            Marcar todas como leídas
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
        // El shell arrendador solo tiene topbar sticky en móvil (h-14); en desktop (`lg:`) no hay
        // header fijo por encima del contenido, a diferencia del shell estudiante.
        stickyOffsetClassName="top-14 lg:top-0"
      />
    </div>
  );
}
