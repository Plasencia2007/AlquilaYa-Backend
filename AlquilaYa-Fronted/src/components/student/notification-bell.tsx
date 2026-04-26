'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BellRing,
  Calendar,
  CheckCircle2,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/use-notifications';
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
};

export function NotificationBell() {
  const router = useRouter();
  const { items, noLeidas, marcarLeida, marcarTodasLeidas } = useNotifications();
  const preview = items.slice(0, 5);

  const onItemClick = (n: Notificacion) => {
    if (!n.leida) marcarLeida(n.id);
    if (n.urlDestino) router.push(n.urlDestino);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
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
            <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {noLeidas > 9 ? '9+' : noLeidas}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={10} className="w-[360px] p-0">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-bold">Notificaciones</p>
            <p className="text-[11px] text-muted-foreground">
              {noLeidas > 0 ? `${noLeidas} sin leer` : 'Estás al día'}
            </p>
          </div>
          {noLeidas > 0 && (
            <button
              type="button"
              onClick={marcarTodasLeidas}
              className="text-[11px] font-bold text-primary hover:underline"
            >
              Marcar todas
            </button>
          )}
        </header>

        <ScrollArea className="max-h-[420px]">
          {preview.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              Sin notificaciones por ahora
            </div>
          ) : (
            <ul>
              {preview.map((n) => {
                const Icon = ICON_BY_TIPO[n.tipo] ?? Bell;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => onItemClick(n)}
                      className={cn(
                        'flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted',
                        !n.leida && 'bg-primary/5',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full',
                          n.leida
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-primary/10 text-primary',
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'text-sm leading-snug',
                            n.leida ? 'font-medium text-foreground/80' : 'font-bold text-foreground',
                          )}
                        >
                          {n.titulo}
                        </p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{n.mensaje}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {tiempoRelativo(n.fechaCreacion)}
                        </p>
                      </div>
                      {!n.leida && (
                        <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <footer className="border-t border-border p-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full text-xs font-bold"
          >
            <Link href="/student/notifications">Ver todas</Link>
          </Button>
        </footer>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
