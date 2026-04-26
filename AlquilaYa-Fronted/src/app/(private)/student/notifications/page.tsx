'use client';

import { useRouter } from 'next/navigation';
import {
  Bell,
  BellRing,
  Calendar,
  CheckCheck,
  CheckCircle2,
  Heart,
  type LucideIcon,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
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

export default function StudentNotificationsPage() {
  const router = useRouter();
  const { items, noLeidas, marcarLeida, marcarTodasLeidas } = useNotifications();

  const onItemClick = (n: Notificacion) => {
    if (!n.leida) marcarLeida(n.id);
    if (n.urlDestino) router.push(n.urlDestino);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Notificaciones
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            {noLeidas > 0 ? `Tienes ${noLeidas} sin leer` : 'Estás al día'}
          </p>
        </div>

        {noLeidas > 0 && (
          <Button variant="outline" size="sm" onClick={marcarTodasLeidas} className="gap-2">
            <CheckCheck className="size-4" /> Marcar todas
          </Button>
        )}
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No tienes notificaciones"
          description="Cuando haya novedades sobre tus reservas, mensajes o cuenta, aparecerán aquí."
        />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {items.map((n) => {
            const Icon = ICON_BY_TIPO[n.tipo] ?? Bell;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onItemClick(n)}
                  className={cn(
                    'flex w-full items-start gap-4 border-b border-border px-5 py-4 text-left transition-colors hover:bg-muted last:border-b-0',
                    !n.leida && 'bg-primary/5',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full',
                      n.leida
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-primary/10 text-primary',
                    )}
                    aria-hidden
                  >
                    {n.leida ? <Icon className="size-5" /> : <BellRing className="size-5" />}
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
                    <p className="mt-1 text-xs text-muted-foreground">{n.mensaje}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {tiempoRelativo(n.fechaCreacion)}
                    </p>
                  </div>
                  {!n.leida && (
                    <span
                      className="mt-2 size-2 shrink-0 rounded-full bg-primary"
                      aria-hidden
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
