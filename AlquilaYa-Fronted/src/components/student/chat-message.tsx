'use client';

import { Check, CheckCheck } from 'lucide-react';

import { cn } from '@/lib/cn';
import { tiempoChat } from '@/lib/relative-time';
import type { Mensaje } from '@/types/chat';

interface Props {
  mensaje: Mensaje;
  esMio: boolean;
}

export function ChatMessage({ mensaje, esMio }: Props) {
  const leido = !!mensaje.fechaLectura || mensaje.estado === 'LEIDO';

  return (
    <div className={cn('flex w-full', esMio ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[78%] rounded-2xl px-4 py-2 text-sm shadow-sm',
          esMio
            ? 'rounded-br-md bg-primary text-primary-foreground'
            : 'rounded-bl-md bg-muted text-foreground',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{mensaje.contenido}</p>
        <p
          className={cn(
            'mt-1 flex items-center justify-end gap-1 text-[10px]',
            esMio ? 'text-primary-foreground/70' : 'text-muted-foreground',
          )}
        >
          <span>{tiempoChat(mensaje.fechaEnvio)}</span>
          {esMio &&
            (leido ? (
              <CheckCheck className="size-3 text-blue-300" aria-label="Leído" />
            ) : (
              <Check className="size-3" aria-label="Enviado" />
            ))}
        </p>
      </div>
    </div>
  );
}
