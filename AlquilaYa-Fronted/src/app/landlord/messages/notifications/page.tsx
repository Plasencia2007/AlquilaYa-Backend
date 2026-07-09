'use client';

import { Card } from '@/components/ui/legacy-card';
import { Button } from '@/components/ui/legacy-button';
import { useNotifications } from '@/hooks/use-notifications';
import { cn } from '@/lib/cn';
import { tiempoRelativo } from '@/lib/relative-time';

export default function LandlordNotificationsPage() {
  const { items, noLeidas, marcarLeida, marcarTodasLeidas, cargada } = useNotifications();

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
          <Button variant="ghost" size="sm" onClick={() => marcarTodasLeidas()}>
            Marcar todas como leídas
          </Button>
        )}
      </header>

      <div className="space-y-3">
        {!cargada && (
          <Card className="bg-white/40 border border-border p-6 text-sm text-muted-foreground">
            Cargando notificaciones…
          </Card>
        )}
        {cargada && items.length === 0 && (
          <Card className="bg-white/40 border border-border p-6 text-sm text-muted-foreground">
            No tienes notificaciones todavía.
          </Card>
        )}
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => {
              if (!n.leida) marcarLeida(n.id);
            }}
            className="w-full text-left"
          >
            <Card
              className={cn(
                'border p-4 flex gap-4 items-start transition-colors',
                n.leida
                  ? 'bg-white/40 border-border'
                  : 'bg-primary/5 border-primary/20 hover:bg-primary/10',
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                  n.leida ? 'bg-foreground/10 text-foreground/50' : 'bg-primary/20 text-primary',
                )}
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <h4 className="font-black text-sm text-foreground/90 truncate">{n.titulo}</h4>
                  <span className="text-[10px] text-foreground/40 font-bold shrink-0">
                    {tiempoRelativo(n.fechaCreacion)}
                  </span>
                </div>
                <p className="text-[12px] text-muted-foreground font-medium mt-1 leading-relaxed">
                  {n.mensaje}
                </p>
                <p className="text-[9px] text-foreground/40 font-black uppercase tracking-widest mt-2">
                  {n.tipo.replace(/_/g, ' ')}
                </p>
              </div>
              {!n.leida && (
                <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" aria-hidden />
              )}
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
