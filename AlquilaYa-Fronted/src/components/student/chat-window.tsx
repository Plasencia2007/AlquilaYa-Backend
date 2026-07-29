'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { isToday, isYesterday, isThisWeek, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Archive,
  ArrowLeft,
  Bell,
  BellOff,
  ChevronDown,
  MoreVertical,
  Paperclip,
  Send,
  Smile,
} from 'lucide-react';
import type { EmojiClickData, Theme as EmojiTheme } from 'emoji-picker-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ErrorState } from '@/components/shared/error-state';
import { AvatarInitial } from '@/components/student/avatar-initial';
import { ChatMessage } from '@/components/student/chat-message';
import { useConversation } from '@/hooks/use-conversation';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { useDesktopNotifications } from '@/hooks/use-desktop-notifications';
import { useThemeStore } from '@/stores/theme-store';
import { conversationService } from '@/services/conversation-service';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/cn';
import type { Mensaje } from '@/types/chat';

// Ítem 259: el picker pesa ~300KB, se carga solo cuando se abre (nunca en el bundle inicial).
const EmojiPickerLazy = dynamic(() => import('emoji-picker-react'), { ssr: false });

// Ítem 260: chips visibles solo en conversaciones sin mensajes aún.
const RESPUESTAS_RAPIDAS = ['¿Sigue disponible?', '¿Puedo visitarlo?', '¿Cuál es el precio final?'];

interface Props {
  conversacionId: string;
  contraparteNombre?: string;
  propiedadTitulo?: string;
  /** Ítem 244: true mientras la página aún resuelve nombre del arrendador / título de la
   * propiedad, para mostrar un skeleton del header en vez del nombre por defecto ('Arrendador'). */
  cargandoHeader?: boolean;
}

/** Ítem 258: mismo agrupamiento que el chat del arrendador (landlord/messages/students). */
function grupoFechaMsg(fecha: string): string {
  const d = new Date(fecha);
  if (isToday(d)) return 'Hoy';
  if (isYesterday(d)) return 'Ayer';
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, 'EEEE', { locale: es });
  return format(d, "d 'de' MMMM", { locale: es });
}

type ItemLista =
  | { tipo: 'sep'; label: string; key: string }
  | { tipo: 'msg'; msg: Mensaje };

export function ChatWindow({
  conversacionId,
  contraparteNombre = 'Arrendador',
  propiedadTitulo,
  cargandoHeader = false,
}: Props) {
  const router = useRouter();
  const {
    mensajes,
    cargando,
    error,
    otroEscribiendo,
    miPerfilId,
    miRol,
    enviar,
    enviarImagen,
    reintentar,
    notificarTyping,
    cargarAntiguos,
    cargandoAntiguos,
    hayMasAntiguos,
    conectado,
  } = useConversation(conversacionId);

  const temaResuelto = useThemeStore((s) => s.resolved);
  const {
    habilitado: notifsHabilitadas,
    alternar: alternarNotifs,
    notificarMensajeNuevo,
  } = useDesktopNotifications();

  const [borrador, setBorrador] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [archivando, setArchivando] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Al anteponer mensajes antiguos no queremos auto-scroll al fondo, sino
  // preservar la posición visual del usuario (compensar el alto agregado arriba).
  const anteponiendoRef = useRef(false);
  const alturaAntesRef = useRef(0);
  // Ítem 267: actualizado por el handler de scroll (no por un efecto), refleja si el usuario
  // estaba a <100px del final justo ANTES de que llegara el mensaje nuevo.
  const cercaDelFondoRef = useRef(true);
  const primerSincronizadoRef = useRef(false);
  const conversacionIdRef = useRef(conversacionId);
  const ultimoMensajeIdRef = useRef<number | null>(null);

  const [vistoHastaLen, setVistoHastaLen] = useState(0);
  const [nuevosNoVistos, setNuevosNoVistos] = useState(0);

  // Ítem 267: ajuste de estado durante el render (no en un efecto) — reinicia los contadores
  // si cambia de conversación, y solo suma al contador de "nuevos" cuando el mensaje llega
  // después de la carga inicial, sin estar cerca del fondo y sin ser un prepend de antiguos.
  if (conversacionIdRef.current !== conversacionId) {
    conversacionIdRef.current = conversacionId;
    primerSincronizadoRef.current = false;
    ultimoMensajeIdRef.current = null;
    setVistoHastaLen(0);
    setNuevosNoVistos(0);
  }
  if (mensajes.length !== vistoHastaLen) {
    const delta = mensajes.length - vistoHastaLen;
    if (
      primerSincronizadoRef.current &&
      delta > 0 &&
      !anteponiendoRef.current &&
      !cercaDelFondoRef.current
    ) {
      setNuevosNoVistos((n) => n + delta);
    }
    primerSincronizadoRef.current = true;
    setVistoHastaLen(mensajes.length);
  }

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    if (anteponiendoRef.current) {
      node.scrollTop = node.scrollHeight - alturaAntesRef.current;
      anteponiendoRef.current = false;
      return;
    }
    if (cercaDelFondoRef.current) {
      node.scrollTop = node.scrollHeight;
    }
  }, [mensajes.length, otroEscribiendo]);

  // Ítem 256: dispara la notificación de escritorio cuando llega un mensaje nuevo ajeno
  // (se ignora la primera sincronización, que es la carga inicial de historial).
  useEffect(() => {
    if (mensajes.length === 0) return;
    const ultimo = mensajes[mensajes.length - 1];
    const esPrimeraCarga = ultimoMensajeIdRef.current === null;
    if (ultimoMensajeIdRef.current === ultimo.id) return;
    ultimoMensajeIdRef.current = ultimo.id;
    const esMio = ultimo.emisorPerfilId === miPerfilId && ultimo.emisorRol === miRol;
    if (!esPrimeraCarga && !esMio) {
      notificarMensajeNuevo(contraparteNombre, ultimo.contenido.slice(0, 120));
    }
  }, [mensajes, miPerfilId, miRol, contraparteNombre, notificarMensajeNuevo]);

  useInfiniteScroll(
    topSentinelRef,
    () => {
      const node = scrollRef.current;
      if (node) {
        anteponiendoRef.current = true;
        alturaAntesRef.current = node.scrollHeight;
      }
      cargarAntiguos();
    },
    { enabled: hayMasAntiguos && !cargando && !cargandoAntiguos, rootMargin: '200px' },
  );

  const handleScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    cercaDelFondoRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 100;
  };

  const irAlFondo = () => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
    cercaDelFondoRef.current = true;
    setNuevosNoVistos(0);
  };

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

  const enviarRespuestaRapida = (texto: string) => {
    setBorrador(texto);
    textareaRef.current?.focus();
  };

  // Ítem 254: adjuntar imagen. Valida en cliente antes de subir (el backend valida igual,
  // esto es solo para dar feedback inmediato sin gastar la llamada).
  const handleAdjuntarImagen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      notify.error(null, 'Solo se aceptan imágenes JPG, PNG o WEBP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      notify.error(null, 'La imagen no puede pesar más de 10MB.');
      return;
    }
    setSubiendoImagen(true);
    try {
      await enviarImagen(file);
    } finally {
      setSubiendoImagen(false);
    }
  };

  const archivarConversacion = async () => {
    const ok = window.confirm(
      `¿Archivar la conversación con ${contraparteNombre}? Volverá a aparecer si te escriben de nuevo.`,
    );
    if (!ok) return;
    setArchivando(true);
    try {
      await conversationService.archivar(conversacionId);
      notify.success('Conversación archivada');
      router.push('/student/messages');
    } catch (err) {
      notify.error(err, 'No se pudo archivar la conversación');
    } finally {
      setArchivando(false);
    }
  };

  const grupos = useMemo<ItemLista[]>(() => {
    const result: ItemLista[] = [];
    let lastLabel = '';
    for (const msg of mensajes) {
      const label = grupoFechaMsg(msg.fechaEnvio);
      if (label !== lastLabel) {
        result.push({ tipo: 'sep', label, key: `sep-${msg.id}` });
        lastLabel = label;
      }
      result.push({ tipo: 'msg', msg });
    }
    return result;
  }, [mensajes]);

  const emojiTheme = (temaResuelto === 'dark' ? 'dark' : 'light') as EmojiTheme;

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
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/student/messages')}
                aria-label="Volver"
                className="md:hidden"
              >
                <ArrowLeft className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Volver</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {cargandoHeader ? (
          <>
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32 rounded-full" />
              <Skeleton className="h-2.5 w-20 rounded-full" />
            </div>
          </>
        ) : (
          <>
            <AvatarInitial nombre={contraparteNombre} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{contraparteNombre}</p>
              {propiedadTitulo && (
                <p className="truncate text-[11px] text-muted-foreground">{propiedadTitulo}</p>
              )}
            </div>
          </>
        )}

        {/* Ítem 256: toggle opt-in de notificaciones de escritorio */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={alternarNotifs}
                aria-label={
                  notifsHabilitadas
                    ? 'Desactivar notificaciones de escritorio'
                    : 'Activar notificaciones de escritorio'
                }
                aria-pressed={notifsHabilitadas}
                className="shrink-0"
              >
                {notifsHabilitadas ? (
                  <Bell className="size-5 text-primary" />
                ) : (
                  <BellOff className="size-5 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {notifsHabilitadas ? 'Notificaciones activadas' : 'Activar notificaciones'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Ítem 262: menú de la conversación */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Más opciones"
              disabled={archivando}
              className="shrink-0"
            >
              <MoreVertical className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={archivando}
              onSelect={() => archivarConversacion()}
              className="cursor-pointer"
            >
              <Archive className="size-4" aria-hidden />
              <span>{archivando ? 'Archivando…' : 'Archivar conversación'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Ítem 257: banner de reconexión */}
      {!conectado && (
        <div className="shrink-0 bg-warning-light px-4 py-1.5 text-center text-xs font-semibold text-warning">
          Reconectando…
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          aria-live="polite"
          aria-relevant="additions"
          className="h-full space-y-2 overflow-y-auto bg-background px-4 py-4 md:px-6"
        >
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

          {!cargando && hayMasAntiguos && (
            <div ref={topSentinelRef} className="flex justify-center py-2">
              {cargandoAntiguos && (
                <span className="text-xs text-muted-foreground">Cargando mensajes anteriores…</span>
              )}
            </div>
          )}

          {grupos.map((item) => {
            if (item.tipo === 'sep') {
              return (
                <div key={item.key} className="flex items-center justify-center py-2">
                  <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                    {item.label}
                  </span>
                </div>
              );
            }
            const m = item.msg;
            const esMio = m.emisorPerfilId === miPerfilId && m.emisorRol === miRol;
            return (
              <ChatMessage
                key={m.id}
                mensaje={m}
                esMio={esMio}
                autorNombre={esMio ? 'Tú' : contraparteNombre}
                onReintentar={reintentar}
              />
            );
          })}

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

        {/* Ítem 267: botón flotante de mensajes nuevos (usuario no estaba cerca del fondo) */}
        {nuevosNoVistos > 0 && (
          <button
            type="button"
            onClick={irAlFondo}
            className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105"
          >
            <ChevronDown className="size-3.5" aria-hidden />
            {nuevosNoVistos} mensaje{nuevosNoVistos > 1 ? 's' : ''} nuevo{nuevosNoVistos > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Ítem 260: respuestas rápidas, solo en conversaciones sin mensajes aún */}
      {!cargando && mensajes.length === 0 && (
        <div className="flex shrink-0 flex-wrap gap-2 border-t border-border bg-card px-4 py-2.5 md:px-6">
          {RESPUESTAS_RAPIDAS.map((texto) => (
            <button
              key={texto}
              type="button"
              onClick={() => enviarRespuestaRapida(texto)}
              className={cn(
                'rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground',
                'transition-colors hover:bg-accent',
              )}
            >
              {texto}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 items-end gap-2 border-t border-border bg-card px-4 py-3 md:px-6"
      >
        {/* Ítem 254: adjuntar imagen */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAdjuntarImagen}
        />
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mb-0.5 size-9 shrink-0 rounded-full"
                aria-label="Adjuntar imagen"
                disabled={subiendoImagen}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {subiendoImagen ? 'Subiendo…' : 'Adjuntar imagen'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Ítem 259: emoji picker tematizado, lazy */}
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mb-0.5 size-9 shrink-0 rounded-full"
              aria-label="Insertar emoji"
            >
              <Smile className="size-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="start"
            sideOffset={8}
            className="w-auto border-none bg-transparent p-0 shadow-none"
          >
            <EmojiPickerLazy
              theme={emojiTheme}
              width={300}
              height={350}
              onEmojiClick={(data: EmojiClickData) => {
                setBorrador((prev) => prev + data.emoji);
                setEmojiOpen(false);
                textareaRef.current?.focus();
              }}
            />
          </PopoverContent>
        </Popover>

        <Textarea
          ref={textareaRef}
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
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="submit"
                size="icon"
                disabled={!borrador.trim()}
                className="size-11 shrink-0 rounded-full"
                aria-label="Enviar"
              >
                <Send className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Enviar</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </form>
    </div>
  );
}
