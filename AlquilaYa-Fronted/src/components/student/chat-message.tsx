'use client';

import Image from 'next/image';
import { AlertTriangle, Check, CheckCheck } from 'lucide-react';
import Linkify from 'linkify-react';

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PropertyShareCard } from '@/components/shared/property-share-card';
import { cn } from '@/lib/cn';
import { extraerPropiedadCompartida } from '@/lib/chat-links';
import { esImagenExterna } from '@/lib/img';
import { tiempoChat } from '@/lib/relative-time';
import type { Mensaje } from '@/types/chat';

interface Props {
  mensaje: Mensaje;
  esMio: boolean;
  /** Ítem 270: nombre para el `aria-label` de la burbuja ("Tú" o el nombre de la contraparte). */
  autorNombre: string;
  /** Ítem 268: reintenta el envío de este mensaje cuando `estadoEnvio === 'fallido'`. */
  onReintentar?: (mensajeTemporalId: number, contenido: string) => void;
}

// Ítem 269: nunca `dangerouslySetInnerHTML` — linkify-react arma los <a> de forma segura.
const LINKIFY_OPTIONS = {
  target: '_blank',
  rel: 'noopener noreferrer nofollow',
} as const;

export function ChatMessage({ mensaje, esMio, autorNombre, onReintentar }: Props) {
  const leido = !!mensaje.fechaLectura || mensaje.estado === 'LEIDO';
  const enviando = mensaje.estadoEnvio === 'enviando';
  const fallido = mensaje.estadoEnvio === 'fallido';
  const esImagen = mensaje.tipo === 'IMAGEN' && !!mensaje.urlAdjunto;
  const hora = tiempoChat(mensaje.fechaEnvio);
  // Ítem 255: propiedad compartida como mini-card (detección por texto, sin cambio de backend).
  const propiedadCompartidaId = esImagen ? null : extraerPropiedadCompartida(mensaje.contenido);

  return (
    <div className={cn('flex w-full', esMio ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[78%] rounded-2xl text-sm shadow-sm',
          esImagen ? 'overflow-hidden p-1' : 'px-4 py-2',
          esMio
            ? 'rounded-br-md bg-primary text-primary-foreground'
            : 'rounded-bl-md bg-muted text-foreground',
          fallido && 'opacity-70',
        )}
        aria-label={`Mensaje de ${autorNombre} a las ${hora}`}
      >
        {esImagen ? (
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" aria-label="Ver imagen ampliada" className="block w-full overflow-hidden rounded-xl">
                <Image
                  src={mensaje.urlAdjunto as string}
                  alt="Imagen adjunta en el chat"
                  width={280}
                  height={280}
                  unoptimized={esImagenExterna(mensaje.urlAdjunto as string)}
                  className="h-auto max-h-72 w-full object-cover"
                />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
              <DialogTitle className="sr-only">Imagen adjunta</DialogTitle>
              <Image
                src={mensaje.urlAdjunto as string}
                alt="Imagen adjunta en el chat"
                width={1200}
                height={1200}
                unoptimized={esImagenExterna(mensaje.urlAdjunto as string)}
                className="h-auto max-h-[85vh] w-full rounded-lg object-contain"
              />
            </DialogContent>
          </Dialog>
        ) : (
          <>
            <p className="whitespace-pre-wrap break-words">
              <Linkify options={LINKIFY_OPTIONS}>{mensaje.contenido}</Linkify>
            </p>
            {propiedadCompartidaId && <PropertyShareCard propiedadId={propiedadCompartidaId} />}
          </>
        )}
        <p
          className={cn(
            'mt-1 flex items-center justify-end gap-1 text-[10px]',
            esImagen && 'px-2 pb-1',
            esMio ? 'text-primary-foreground/70' : 'text-muted-foreground',
            esImagen && !esMio && 'text-muted-foreground',
          )}
        >
          {fallido && !esImagen ? (
            <button
              type="button"
              onClick={() => onReintentar?.(mensaje.id, mensaje.contenido)}
              className="flex items-center gap-1 font-semibold text-destructive underline-offset-2 hover:underline"
            >
              <AlertTriangle className="size-3" aria-hidden />
              Reintentar
            </button>
          ) : fallido ? (
            <span className="flex items-center gap-1 font-semibold text-destructive">
              <AlertTriangle className="size-3" aria-hidden />
              No se pudo enviar
            </span>
          ) : (
            <>
              <span>{enviando ? 'Enviando…' : hora}</span>
              {esMio &&
                !enviando &&
                (leido ? (
                  <CheckCheck className="size-3 text-info" aria-label="Leído" />
                ) : (
                  <Check className="size-3" aria-label="Enviado" />
                ))}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
