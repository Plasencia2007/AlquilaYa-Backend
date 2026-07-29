'use client';

import { useRouter } from 'next/navigation';
import {
  Bell,
  BellRing,
  Building2,
  Calendar,
  CheckCircle2,
  FileWarning,
  Flag,
  Heart,
  type LucideIcon,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/use-notifications';
import { useMediaQuery } from '@/hooks/use-media-query';
import { tiempoRelativo } from '@/lib/relative-time';
import { cn } from '@/lib/cn';
import type { Notificacion, TipoNotificacion } from '@/types/notificacion';

const ICON_BY_TIPO: Record<TipoNotificacion, LucideIcon> = {
  RESERVA_APROBADA: CheckCircle2,
  RESERVA_RECHAZADA: Calendar,
  RESERVA_PAGADA: CheckCircle2,
  RESERVA_CANCELADA: Calendar,
  MENSAJE_NUEVO: MessageCircle,
  DOCUMENTO_APROBADO: ShieldCheck,
  DOCUMENTO_RECHAZADO: ShieldCheck,
  BIENVENIDA: Sparkles,
  RECORDATORIO_PAGO: Calendar,
  ALERTA_ZONA: Heart,
  SISTEMA: Bell,
  // Ítem 378 (admin): documento KYC nuevo pendiente de revisión.
  DOCUMENTO_NUEVO: FileWarning,
  // Notif admin (gap #2/3): denuncia nueva sobre una propiedad, pendiente de revisión.
  DENUNCIA_NUEVA: Flag,
  // Notif admin (gap #2/3): propiedad nueva (o reenviada) pendiente de revisión.
  PROPIEDAD_PENDIENTE: Building2,
};

function BellTriggerButton({ noLeidas }: { noLeidas: number }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative size-10 rounded-full"
      aria-label={`${noLeidas} notificaciones sin leer`}
    >
      {noLeidas > 0 ? (
        <BellRing className="size-5" aria-hidden />
      ) : (
        <Bell className="size-5" aria-hidden />
      )}
      {noLeidas > 0 && (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
        >
          {noLeidas > 9 ? '9+' : noLeidas}
        </span>
      )}
      {/* Ítem 399: el badge de arriba es puramente visual (aria-hidden) — el aria-label del
          botón informa el conteo, pero solo se lee cuando el elemento recibe foco. Este nodo
          persiste siempre en el DOM (no se monta/desmonta con noLeidas) para que un lector de
          pantalla anuncie los cambios de conteo sin que el usuario tenga el foco aquí. */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {noLeidas > 0 ? `${noLeidas} notificaciones sin leer` : 'Sin notificaciones sin leer'}
      </span>
    </Button>
  );
}

interface PanelBodyProps {
  items: Notificacion[];
  noLeidas: number;
  onItemClick: (n: Notificacion) => void;
  onMarcarTodas: () => void;
  onVerTodas: () => void;
  /** En el Sheet móvil el header reserva espacio para la X de cierre por defecto. */
  reserveCloseSpace?: boolean;
  /** En el Sheet móvil la lista ocupa el alto disponible en vez de topear a 400px. */
  fillHeight?: boolean;
}

function NotificationsPanelBody({
  items,
  noLeidas,
  onItemClick,
  onMarcarTodas,
  onVerTodas,
  reserveCloseSpace = false,
  fillHeight = false,
}: PanelBodyProps) {
  return (
    <>
      {/* Header */}
      <header
        className={cn(
          'flex items-center justify-between bg-muted/40 px-5 py-3.5 border-b border-border',
          reserveCloseSpace && 'pr-14',
        )}
      >
        <div className="flex items-center gap-2.5">
          {noLeidas > 0
            ? <BellRing className="size-4 text-primary" aria-hidden />
            : <Bell className="size-4 text-muted-foreground" aria-hidden />
          }
          <div>
            <p className="text-sm font-bold text-foreground leading-none">Notificaciones</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {noLeidas > 0 ? `${noLeidas} sin leer` : 'Estás al día'}
            </p>
          </div>
        </div>
        {noLeidas > 0 && (
          <button
            type="button"
            onClick={onMarcarTodas}
            className="text-[11px] font-bold text-primary hover:underline"
          >
            Marcar todas
          </button>
        )}
      </header>

      {/* Lista */}
      <ScrollArea className={fillHeight ? 'min-h-0 flex-1' : 'max-h-[400px]'}>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
            <Bell className="size-8 text-muted-foreground/30" aria-hidden />
            <p className="text-sm font-medium text-muted-foreground">Sin notificaciones por ahora</p>
            <p className="text-xs text-muted-foreground/60">Te avisaremos cuando haya novedades</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => {
              const Icon = ICON_BY_TIPO[n.tipo] ?? Bell;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onItemClick(n)}
                    className={cn(
                      'flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/60',
                      !n.leida && 'bg-primary/4',
                    )}
                  >
                    <span className={cn(
                      'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                      n.leida ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
                    )}>
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        'text-sm leading-snug',
                        n.leida ? 'font-medium text-foreground/70' : 'font-semibold text-foreground',
                      )}>
                        {n.titulo}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.mensaje}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground/60">
                        {tiempoRelativo(n.fechaCreacion)}
                      </p>
                    </div>
                    {!n.leida && (
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>

      {/* Footer */}
      {items.length > 0 && (
        <div className="border-t border-border px-5 py-2.5">
          <button
            type="button"
            onClick={onVerTodas}
            className="w-full text-center text-xs font-bold text-primary hover:underline"
          >
            Ver todas las notificaciones
          </button>
        </div>
      )}
    </>
  );
}

interface NotificationBellProps {
  /**
   * Destino de "Ver todas las notificaciones". Ítem 378: el panel admin no tiene una
   * página dedicada de notificaciones (a diferencia de `/student/notifications`), así que
   * este componente reusado ahí pasa el destino más accionable en su lugar.
   */
  verTodasHref?: string;
}

export function NotificationBell({ verTodasHref = '/student/notifications' }: NotificationBellProps = {}) {
  const router = useRouter();
  const { items, noLeidas, marcarLeida, marcarTodasLeidas } = useNotifications();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const onItemClick = (n: Notificacion) => {
    if (!n.leida) marcarLeida(n.id);
    if (n.urlDestino) router.push(n.urlDestino);
  };

  const onVerTodas = () => router.push(verTodasHref);

  if (isDesktop) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <BellTriggerButton noLeidas={noLeidas} />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={10} className="w-[380px] overflow-hidden !rounded-none border border-border/60 p-0 shadow-lg">
          <NotificationsPanelBody
            items={items}
            noLeidas={noLeidas}
            onItemClick={onItemClick}
            onMarcarTodas={marcarTodasLeidas}
            onVerTodas={onVerTodas}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <BellTriggerButton noLeidas={noLeidas} />
      </SheetTrigger>

      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="flex max-h-[85dvh] flex-col gap-0 rounded-t-2xl border-t p-0"
      >
        <SheetTitle className="sr-only">Notificaciones</SheetTitle>
        <NotificationsPanelBody
          items={items}
          noLeidas={noLeidas}
          onItemClick={onItemClick}
          onMarcarTodas={marcarTodasLeidas}
          onVerTodas={onVerTodas}
          reserveCloseSpace
          fillHeight
        />
      </SheetContent>
    </Sheet>
  );
}
