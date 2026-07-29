'use client';

import type { RefObject } from 'react';
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

import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { tiempoRelativo } from '@/lib/relative-time';
import { cn } from '@/lib/cn';
import type { Notificacion, TipoNotificacion } from '@/types/notificacion';
import type { GrupoNotificaciones } from '@/hooks/use-notification-list';

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

function SkeletonNotificacion() {
  return (
    <li className="flex items-start gap-4 border-b border-border px-5 py-4 last:border-b-0">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-2 w-16" />
      </div>
    </li>
  );
}

interface NotificationListProps {
  cargando: boolean;
  error: boolean;
  grupos: GrupoNotificaciones[];
  hayMas: boolean;
  cargandoMas: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onItemClick: (n: Notificacion) => void;
  onRetry: () => void;
  /**
   * Clase(s) de offset del `sticky` de los headers de grupo (Hoy/Ayer/…), en Tailwind. Cada shell
   * privado tiene una topbar de altura distinta: el shell estudiante trae una topbar fija de 4rem
   * en todo tamaño de pantalla (`top-16` por defecto, igual que el diseño original de esta
   * lista); el shell arrendador solo tiene topbar en móvil (h-14) y ninguna en desktop.
   */
  stickyOffsetClassName?: string;
}

/**
 * Ítem 343: lista de notificaciones (skeleton/error/empty + grupos por fecha con headers sticky
 * + ícono por tipo) compartida entre `(private)/student/notifications` y
 * `landlord/messages/notifications`. Puramente presentacional — recibe todo resuelto de
 * `useNotificationList()`, que cada página llama una sola vez (también para su propio header con
 * el conteo de no leídas y el botón "marcar todas", que queda fuera de este componente porque
 * cada panel usa su propio estilo de encabezado).
 */
export function NotificationList({
  cargando,
  error,
  grupos,
  hayMas,
  cargandoMas,
  sentinelRef,
  onItemClick,
  onRetry,
  stickyOffsetClassName = 'top-16',
}: NotificationListProps) {
  if (cargando) {
    return (
      <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonNotificacion key={i} />
        ))}
      </ul>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="No pudimos cargar tus notificaciones"
        description="Algo salió mal al recuperar tus notificaciones."
        onRetry={onRetry}
      />
    );
  }

  if (grupos.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="No tienes notificaciones"
        description="Cuando haya novedades sobre tus reservas, mensajes o cuenta, aparecerán aquí."
      />
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {grupos.map(({ grupo, items: itemsGrupo }, gi) => (
          <div key={grupo}>
            <div
              className={cn(
                'sticky z-[5] flex items-center justify-between border-b border-border bg-muted/70 px-5 py-2 backdrop-blur',
                stickyOffsetClassName,
              )}
            >
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {grupo}
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground">
                {itemsGrupo.length}
              </span>
            </div>
            <ul>
              {itemsGrupo.map((n, ii) => {
                const Icon = ICON_BY_TIPO[n.tipo] ?? Bell;
                const esUltimo = gi === grupos.length - 1 && ii === itemsGrupo.length - 1;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => onItemClick(n)}
                      className={cn(
                        'flex w-full items-start gap-4 border-b border-border px-5 py-4 text-left transition-colors hover:bg-muted',
                        esUltimo && 'border-b-0',
                        !n.leida && 'bg-primary/5',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full',
                          n.leida ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
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
                        <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {hayMas && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {cargandoMas && <span className="text-xs text-muted-foreground">Cargando más…</span>}
        </div>
      )}
    </>
  );
}
