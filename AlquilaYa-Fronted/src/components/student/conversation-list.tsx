'use client';

import Link from 'next/link';
import { Building2 } from 'lucide-react';

import { AvatarInitial } from '@/components/student/avatar-initial';
import { tiempoChat } from '@/lib/relative-time';
import { cn } from '@/lib/cn';
import type { ConversacionResumen } from '@/types/chat';

interface Props {
  items: ConversacionResumen[];
  activaId?: number | string;
  hrefBuilder?: (id: number) => string;
}

export function ConversationList({
  items,
  activaId,
  hrefBuilder = (id) => `/student/messages/${id}`,
}: Props) {
  return (
    <ul className="divide-y divide-border">
      {items.map((c) => {
        const activa = String(c.id) === String(activaId);
        return (
          <li key={c.id}>
            <Link
              href={hrefBuilder(c.id)}
              className={cn(
                'flex gap-3 px-4 py-3 transition-colors hover:bg-muted',
                activa && 'bg-primary/5',
              )}
            >
              <AvatarInitial nombre={c.contraparteNombre} size="md" />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-foreground">
                    {c.contraparteNombre}
                  </p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {tiempoChat(c.fechaUltimaActividad)}
                  </span>
                </div>
                <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                  <Building2 className="size-3 shrink-0" /> {c.propiedadTitulo}
                </p>
                <p
                  className={cn(
                    'mt-0.5 truncate text-xs',
                    c.noLeidos > 0 ? 'font-bold text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {c.ultimoMensajePreview ?? 'Inicia la conversación…'}
                </p>
              </div>
              {c.noLeidos > 0 && (
                <span className="ml-2 self-center inline-flex min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {c.noLeidos > 9 ? '9+' : c.noLeidos}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
