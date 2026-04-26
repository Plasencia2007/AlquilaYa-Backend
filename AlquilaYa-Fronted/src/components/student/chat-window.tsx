'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { AvatarInitial } from '@/components/student/avatar-initial';
import { ChatMessage } from '@/components/student/chat-message';
import { useConversation } from '@/hooks/use-conversation';

interface Props {
  conversacionId: string;
  contraparteNombre?: string;
  propiedadTitulo?: string;
}

export function ChatWindow({
  conversacionId,
  contraparteNombre = 'Arrendador',
  propiedadTitulo,
}: Props) {
  const router = useRouter();
  const {
    mensajes,
    cargando,
    error,
    otroEscribiendo,
    miPerfilId,
    enviar,
    notificarTyping,
  } = useConversation(conversacionId);

  const [borrador, setBorrador] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al fondo cuando llegan mensajes
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [mensajes.length, otroEscribiendo]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!borrador.trim()) return;
    const texto = borrador;
    setBorrador('');
    await enviar(texto);
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorState
          title="No pudimos abrir esta conversación"
          description="Inténtalo de nuevo en un momento."
          retryLabel="Reintentar"
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem-4rem)] max-w-3xl flex-col md:h-[calc(100vh-4rem)]">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur md:px-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/student/messages')}
          aria-label="Volver"
          className="md:hidden"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <AvatarInitial nombre={contraparteNombre} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{contraparteNombre}</p>
          {propiedadTitulo && (
            <p className="truncate text-[11px] text-muted-foreground">{propiedadTitulo}</p>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-background px-4 py-4 md:px-6">
        {cargando && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-3/4 rounded-2xl" />
            ))}
          </div>
        )}

        {!cargando && mensajes.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-muted-foreground">
              Aún no hay mensajes. ¡Sé el primero en saludar!
            </p>
          </div>
        )}

        {mensajes.map((m) => (
          <ChatMessage key={m.id} mensaje={m} esMio={m.emisorPerfilId === miPerfilId} />
        ))}

        {otroEscribiendo && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-muted px-4 py-2">
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 items-end gap-2 border-t border-border bg-card px-4 py-3 md:px-6"
      >
        <Textarea
          value={borrador}
          onChange={(e) => {
            setBorrador(e.target.value);
            if (e.target.value.length > 0) notificarTyping();
          }}
          onKeyDown={handleKey}
          placeholder="Escribe un mensaje…"
          rows={1}
          maxLength={2000}
          className="max-h-32 min-h-[44px] resize-none rounded-2xl"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!borrador.trim()}
          className="size-11 shrink-0 rounded-full"
          aria-label="Enviar"
        >
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
