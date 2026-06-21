'use client';

import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';

import { cn } from '@/lib/cn';
import { notify } from '@/lib/notify';
import { conversationService } from '@/services/conversation-service';
import { stompClient } from '@/services/stomp-client';
import { servicioAuth } from '@/services/auth-service';
import { useUnreadMessagesStore } from '@/stores/unread-messages-store';
import Cookies from 'js-cookie';
import type { ConversacionResumen, Mensaje } from '@/types/chat';
import type { RolUsuario } from '@/types/auth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-primary', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500',   'bg-cyan-500',    'bg-orange-500',
];

function avatarColor(nombre: string): string {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = nombre.charCodeAt(i) + hash * 31;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function horaMsg(fecha: string): string {
  try { return format(new Date(fecha), 'HH:mm'); } catch { return ''; }
}

function grupoFechaMsg(fecha: string): string {
  const d = new Date(fecha);
  if (isToday(d)) return 'Hoy';
  if (isYesterday(d)) return 'Ayer';
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, 'EEEE', { locale: es });
  return format(d, "d 'de' MMMM", { locale: es });
}

function fechaLista(fecha: string): string {
  const d = new Date(fecha);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'ayer';
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, 'EEE', { locale: es });
  return format(d, 'dd/MM/yy');
}

function obtenerMiIdentidad(): { perfilId: number | null; rol: RolUsuario | null } {
  const token = Cookies.get('auth-token');
  if (!token) return { perfilId: null, rol: null };
  const u = servicioAuth.obtenerUsuarioActualDesdeToken(token);
  const v = u?.perfilId;
  const perfilId = typeof v === 'number' ? v : v ? Number(v) : null;
  return { perfilId, rol: u?.rol ?? null };
}

/**
 * ¿Este mensaje lo envié yo? En un chat 1-a-1 estudiante↔arrendador el ROL ya
 * distingue de forma única quién habla (los dos participantes nunca comparten
 * rol), así que el rol es la señal principal. El perfilId se usa solo como
 * guard extra cuando el token lo trae — defensa ante colisión de ids entre
 * roles. Antes la comparación exigía perfilId, así que si el token no lo
 * incluía TODOS los mensajes se pintaban como "del otro": ahí estaba el bug de
 * "no noto cuál es mío".
 */
function esMensajeMio(
  msg: Pick<Mensaje, 'emisorPerfilId' | 'emisorRol'>,
  miPerfilId: number | null,
  miRol: RolUsuario | null,
): boolean {
  if (miRol === null || msg.emisorRol !== miRol) return false;
  return miPerfilId === null || msg.emisorPerfilId === miPerfilId;
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex justify-start px-2 py-1">
      <div className="flex items-center gap-1 bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function FechaSeparador({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center my-3 select-none">
      <span className="bg-white/80 text-gray-500 text-[11px] font-medium px-3 py-1 rounded-full shadow-sm">
        {label}
      </span>
    </div>
  );
}

interface BurbujaMensajeProps {
  msg: Mensaje;
  mio: boolean;
  onReply: () => void;
}
function BurbujaMensaje({ msg, mio, onReply }: BurbujaMensajeProps) {
  const [hover, setHover] = useState(false);

  let quoteText: string | null = null;
  let mainText = msg.contenido;
  if (msg.contenido.startsWith('> ') && msg.contenido.includes('\n\n')) {
    const idx = msg.contenido.indexOf('\n\n');
    quoteText = msg.contenido.slice(2, idx);
    mainText = msg.contenido.slice(idx + 2);
  }

  const leido = msg.estado === 'LEIDO' || !!msg.fechaLectura;

  const botonReply = (
    <button
      onClick={onReply}
      className="mb-2 p-1 text-gray-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"
      title="Responder"
    >
      <span className="material-symbols-outlined text-[18px]">reply</span>
    </button>
  );

  return (
    <div
      className={cn('flex items-end gap-1 group', mio ? 'justify-end' : 'justify-start')}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {!mio && hover && botonReply}

      <div className={cn(
        // Estilo WhatsApp: verde claro para mis mensajes, blanco para los del otro.
        'relative max-w-[65%] rounded-lg px-2.5 py-1.5 shadow-sm text-gray-800',
        mio
          ? 'bg-[#d9fdd3] rounded-tr-none'
          : 'bg-white rounded-tl-none',
      )}>
        {quoteText && (
          <div className={cn(
            'border-l-4 pl-2 mb-1 text-[11px] rounded-r py-1 pr-2 max-w-full truncate',
            'border-emerald-500 bg-emerald-50 text-emerald-700',
          )}>
            {quoteText}
          </div>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{mainText}</p>
        <div className="flex items-center justify-end gap-0.5 mt-0.5">
          <span className="text-[10px] text-gray-500">
            {horaMsg(msg.fechaEnvio)}
          </span>
          {mio && (
            <span className={cn('text-[12px] ml-0.5 leading-none', leido ? 'text-sky-500' : 'text-gray-400')}>
              {leido ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>

      {mio && hover && botonReply}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function LandlordMessagesStudentsPage() {
  const [conversaciones, setConversaciones] = useState<ConversacionResumen[]>([]);
  const [cargandoLista, setCargandoLista]   = useState(true);
  const [seleccionada, setSeleccionada]     = useState<ConversacionResumen | null>(null);
  const [busqueda, setBusqueda]             = useState('');

  const [mensajes, setMensajes]             = useState<Mensaje[]>([]);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [otroEscribiendo, setOtroEscribiendo]   = useState(false);
  const [paginaActual, setPaginaActual]     = useState(0);
  const [hayMasAntiguos, setHayMasAntiguos] = useState(false);
  const [cargandoAntiguos, setCargandoAntiguos] = useState(false);

  const [borrador, setBorrador]             = useState('');
  const [quoteado, setQuoteado]             = useState<Mensaje | null>(null);
  const [mostrarEmojis, setMostrarEmojis]   = useState(false);
  const [mostrarMenuConv, setMostrarMenuConv] = useState(false);
  const [eliminando, setEliminando]         = useState(false);
  const [stompConectado, setStompConectado] = useState(stompClient.isConnected());
  const [vistaMovil, setVistaMovil]         = useState<'lista' | 'chat'>('lista');

  const scrollRef        = useRef<HTMLDivElement>(null);
  const inputRef         = useRef<HTMLTextAreaElement>(null);
  const emojiRef         = useRef<HTMLDivElement>(null);
  const menuConvRef      = useRef<HTMLDivElement>(null);
  const seleccionadaRef  = useRef<ConversacionResumen | null>(null);
  const typingTimeout    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingState  = useRef(false);

  const { perfilId: miPerfilId, rol: miRol } = useMemo(() => obtenerMiIdentidad(), []);
  const setTotal   = useUnreadMessagesStore((s) => s.setTotal);

  // Mantener ref sincronizada para evitar closures rancios en callbacks de STOMP
  useEffect(() => { seleccionadaRef.current = seleccionada; }, [seleccionada]);

  // Estado de conexión STOMP
  useEffect(() => {
    const offConn    = stompClient.onConnect(() => setStompConectado(true));
    const offDisconn = stompClient.onDisconnect(() => setStompConectado(false));
    return () => { offConn(); offDisconn(); };
  }, []);

  // ── Cargar lista de conversaciones ──────────────────────────────────────────
  const cargarConversaciones = useCallback(async () => {
    setCargandoLista(true);
    try {
      const lista = await conversationService.listarMias();
      const ordenadas = lista.sort(
        (a, b) => new Date(b.fechaUltimaActividad).getTime() - new Date(a.fechaUltimaActividad).getTime(),
      );
      setConversaciones(ordenadas);
      setTotal(ordenadas.reduce((acc, c) => acc + (c.noLeidos || 0), 0));
    } catch (err) {
      notify.error(err, 'No se pudieron cargar las conversaciones');
    } finally {
      setCargandoLista(false);
    }
  }, [setTotal]);

  useEffect(() => { cargarConversaciones(); }, [cargarConversaciones]);

  // ── Suscripción a TODAS las conversaciones (mensajes + toasts) ───────────────
  const convIds = conversaciones.map((c) => c.id).join(',');
  useEffect(() => {
    if (conversaciones.length === 0) return;

    const unsubs = conversaciones.map((conv) =>
      stompClient.subscribe(`/user/queue/conversacion.${conv.id}`, (raw) => {
        try {
          const msg: Mensaje = JSON.parse(raw.body);
          const esMio = esMensajeMio(msg, miPerfilId, miRol);

          if (seleccionadaRef.current?.id === conv.id) {
            // Conversación activa: agregar al chat
            setMensajes((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
            if (!esMio) conversationService.marcarLeida(conv.id).catch(() => {});
          } else if (!esMio) {
            // Otra conversación: toast + actualizar badge
            notify.info(conv.contraparteNombre, msg.contenido.substring(0, 70));
            setConversaciones((prev) => {
              const actualizada = prev.map((c) =>
                c.id === conv.id
                  ? { ...c, noLeidos: (c.noLeidos || 0) + 1, ultimoMensajePreview: msg.contenido, fechaUltimaActividad: new Date().toISOString() }
                  : c,
              ).sort((a, b) => new Date(b.fechaUltimaActividad).getTime() - new Date(a.fechaUltimaActividad).getTime());
              setTotal(actualizada.reduce((acc, c) => acc + (c.noLeidos || 0), 0));
              return actualizada;
            });
          }
        } catch { /* noop */ }
      }),
    );

    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convIds, miPerfilId, miRol]);

  // ── Suscripción a eventos de la conversación activa (typing + read receipts) ─
  useEffect(() => {
    if (!seleccionada) return;
    const id = seleccionada.id;

    const unsub = stompClient.subscribe(`/user/queue/conversacion.${id}.eventos`, (raw) => {
      try {
        const ev = JSON.parse(raw.body);
        if (ev.tipo === 'TYPING') {
          // El rol basta para saber si es el otro participante (chat 1-a-1).
          const emisorEsOtro = ev.emisorRol !== miRol;
          if (emisorEsOtro) setOtroEscribiendo(ev.escribiendo);
        } else if (ev.tipo === 'MENSAJES_LEIDOS') {
          const lectorEsOtro = ev.lectorRol !== miRol;
          if (lectorEsOtro) {
            setMensajes((prev) =>
              prev.map((m) =>
                esMensajeMio(m, miPerfilId, miRol) && !m.fechaLectura
                  ? { ...m, fechaLectura: new Date().toISOString(), estado: 'LEIDO' as const }
                  : m,
              ),
            );
          }
        }
      } catch { /* noop */ }
    });

    return () => unsub();
  }, [seleccionada?.id, miPerfilId, miRol]);

  // ── Cargar mensajes al seleccionar conversación ─────────────────────────────
  useEffect(() => {
    if (!seleccionada) { setMensajes([]); return; }
    const id = seleccionada.id;
    let cancelado = false;

    async function cargar() {
      setCargandoMensajes(true);
      setMensajes([]);
      setOtroEscribiendo(false);
      setHayMasAntiguos(false);
      try {
        // Paso 1: obtener total de mensajes
        const probe = await conversationService.listarMensajes(id, 0, 1);
        if (cancelado) return;
        const total = probe.totalElements;

        if (total === 0) { setCargandoMensajes(false); return; }

        // Paso 2: cargar última página (mensajes más recientes)
        const pageSize  = 50;
        const ultimaPag = Math.max(0, Math.ceil(total / pageSize) - 1);
        const pagina    = await conversationService.listarMensajes(id, ultimaPag, pageSize);
        if (cancelado) return;

        setMensajes(pagina.content);
        setPaginaActual(ultimaPag);
        setHayMasAntiguos(ultimaPag > 0);

        // Marcar como leída + resetear badge en lista
        conversationService.marcarLeida(id).catch(() => {});
        const noLeidosAntes = seleccionadaRef.current?.noLeidos ?? 0;
        setConversaciones((prev) => {
          const actualizada = prev.map((c) => c.id === id ? { ...c, noLeidos: 0 } : c);
          setTotal(Math.max(0, actualizada.reduce((acc, c) => acc + (c.noLeidos || 0), 0)));
          return actualizada;
        });
        void noLeidosAntes;
      } catch {
        if (!cancelado) notify.error(null, 'No se pudieron cargar los mensajes');
      } finally {
        if (!cancelado) setCargandoMensajes(false);
      }
    }

    cargar();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionada?.id]);

  // Auto-scroll al fondo cuando llegan mensajes nuevos
  useEffect(() => {
    if (cargandoMensajes || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [mensajes.length, otroEscribiendo, cargandoMensajes]);

  // Cerrar emoji picker al hacer clic afuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setMostrarEmojis(false);
      }
    }
    if (mostrarEmojis) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mostrarEmojis]);

  // Cerrar menú de conversación al hacer clic afuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuConvRef.current && !menuConvRef.current.contains(e.target as Node)) {
        setMostrarMenuConv(false);
      }
    }
    if (mostrarMenuConv) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mostrarMenuConv]);

  // ── Eliminar (soft-delete) conversación ─────────────────────────────────────
  const eliminarConversacion = useCallback(async () => {
    const conv = seleccionadaRef.current;
    if (!conv || eliminando) return;
    const ok = window.confirm(
      `¿Borrar tu copia de la conversación con ${conv.contraparteNombre || 'este estudiante'}?\n\nNo se eliminará para el estudiante. Si te escribe de nuevo, la conversación reaparecerá.`,
    );
    if (!ok) return;
    setEliminando(true);
    setMostrarMenuConv(false);
    try {
      await conversationService.eliminar(conv.id);
      setConversaciones((prev) => {
        const sigue = prev.filter((c) => c.id !== conv.id);
        setTotal(sigue.reduce((acc, c) => acc + (c.noLeidos || 0), 0));
        return sigue;
      });
      setSeleccionada(null);
      setVistaMovil('lista');
      setMensajes([]);
      notify.info('Conversación borrada', 'Se quitó de tu lista. Reaparecerá si el estudiante te escribe.');
    } catch (err) {
      notify.error(err, 'No se pudo borrar la conversación');
    } finally {
      setEliminando(false);
    }
  }, [eliminando, setTotal]);

  // ── Cargar mensajes anteriores ───────────────────────────────────────────────
  const cargarAntiguos = async () => {
    if (!seleccionada || paginaActual <= 0 || cargandoAntiguos) return;
    const scrollEl = scrollRef.current;
    const prevHeight = scrollEl?.scrollHeight ?? 0;
    setCargandoAntiguos(true);
    try {
      const prevPag = paginaActual - 1;
      const data    = await conversationService.listarMensajes(seleccionada.id, prevPag, 50);
      const ids     = new Set(mensajes.map((m) => m.id));
      const nuevos  = data.content.filter((m) => !ids.has(m.id));
      setMensajes((prev) => [...nuevos, ...prev]);
      setPaginaActual(prevPag);
      setHayMasAntiguos(prevPag > 0);
      requestAnimationFrame(() => {
        if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight - prevHeight;
      });
    } catch {
      notify.error(null, 'No se pudieron cargar mensajes anteriores');
    } finally {
      setCargandoAntiguos(false);
    }
  };

  // ── Indicador de escritura ────────────────────────────────────────────────────
  const notificarTyping = useCallback(() => {
    const conv = seleccionadaRef.current;
    if (!conv) return;
    if (!lastTypingState.current) {
      lastTypingState.current = true;
      stompClient.publish(`/app/chat.typing/${conv.id}`, { escribiendo: true });
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      lastTypingState.current = false;
      const c = seleccionadaRef.current;
      if (c) stompClient.publish(`/app/chat.typing/${c.id}`, { escribiendo: false });
    }, 2500);
  }, []);

  // ── Enviar mensaje ────────────────────────────────────────────────────────────
  const enviarMensaje = useCallback(async () => {
    const txt = borrador.trim();
    if (!txt || !seleccionadaRef.current) return;

    const conv = seleccionadaRef.current;
    const contenido = quoteado
      ? `> ${quoteado.contenido.slice(0, 120)}\n\n${txt}`
      : txt;

    setBorrador('');
    setQuoteado(null);
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }
    lastTypingState.current = false;
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    stompClient.publish(`/app/chat.typing/${conv.id}`, { escribiendo: false });

    try {
      const nuevo = await conversationService.enviarMensaje(conv.id, contenido);
      setMensajes((prev) => prev.some((m) => m.id === nuevo.id) ? prev : [...prev, nuevo]);
      setConversaciones((prev) =>
        prev.map((c) =>
          c.id === conv.id
            ? { ...c, ultimoMensajePreview: txt, fechaUltimaActividad: new Date().toISOString() }
            : c,
        ).sort((a, b) => new Date(b.fechaUltimaActividad).getTime() - new Date(a.fechaUltimaActividad).getTime()),
      );
    } catch (err) {
      notify.error(err, 'No se pudo enviar el mensaje');
      setBorrador(txt);
    }
  }, [borrador, quoteado]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje(); }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBorrador(e.target.value);
    notificarTyping();
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
  };

  const seleccionarConv = (conv: ConversacionResumen) => {
    setSeleccionada(conv);
    setVistaMovil('chat');
    setBorrador('');
    setQuoteado(null);
    setMostrarEmojis(false);
  };

  // ── Computed: conversaciones filtradas ────────────────────────────────────────
  const filtradas = conversaciones.filter((c) =>
    c.contraparteNombre.toLowerCase().includes(busqueda.toLowerCase()),
  );

  // ── Computed: mensajes con separadores de fecha ───────────────────────────────
  const mensajesConSeps = useMemo(() => {
    type Item =
      | { type: 'sep'; label: string; key: string }
      | { type: 'msg'; msg: Mensaje };
    const result: Item[] = [];
    let lastLabel = '';
    for (const msg of mensajes) {
      const label = grupoFechaMsg(msg.fechaEnvio);
      if (label !== lastLabel) {
        result.push({ type: 'sep', label, key: `sep-${msg.id}` });
        lastLabel = label;
      }
      result.push({ type: 'msg', msg });
    }
    return result;
  }, [mensajes]);

  // ─────────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    // En desktop ocupa el área a la derecha del sidebar (280px); en móvil va a pantalla
    // completa dejando visible la barra superior (h-14) para poder abrir el menú.
    <div className="fixed top-14 lg:top-0 right-0 bottom-0 left-0 lg:left-[280px] flex overflow-hidden z-10">

      {/* ══ Panel izquierdo: lista de conversaciones ══ */}
      <aside className={cn(
        'flex-col border-r border-gray-200 bg-white',
        'w-full md:w-[360px] md:shrink-0',
        vistaMovil === 'chat' ? 'hidden md:flex' : 'flex',
      )}>
        {/* Header azul indigo */}
        <div className="bg-primary px-4 pt-4 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-black text-lg tracking-tight">Mensajes</h2>
            {!stompConectado && (
              <span className="text-amber-300 text-[10px] font-bold animate-pulse">Reconectando…</span>
            )}
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary/40 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar conversación…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-primary/50 text-white placeholder-primary/40 pl-9 pr-4 py-2 rounded-full text-sm focus:outline-none focus:bg-primary/70 transition-colors"
            />
          </div>
        </div>

        {/* Lista scrollable */}
        <div className="flex-1 overflow-y-auto">
          {cargandoLista && (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
          {!cargandoLista && filtradas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
              <span className="material-symbols-outlined text-5xl text-gray-300">chat_bubble</span>
              <p className="text-sm text-gray-400">
                {busqueda ? 'Sin resultados para tu búsqueda' : 'Aún no tienes conversaciones'}
              </p>
            </div>
          )}

          {filtradas.map((conv) => {
            const activa   = seleccionada?.id === conv.id;
            const inicial  = (conv.contraparteNombre || '?').charAt(0).toUpperCase();
            const color    = avatarColor(conv.contraparteNombre || '');

            return (
              <button
                key={conv.id}
                onClick={() => seleccionarConv(conv)}
                className={cn(
                  'w-full text-left flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors',
                  activa && 'bg-primary/5 hover:bg-primary/5',
                )}
              >
                {/* Avatar con punto verde */}
                <div className="relative shrink-0">
                  <div className={cn('w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg', color)}>
                    {inicial}
                  </div>
                  <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                </div>

                {/* Información */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cn(
                      'text-sm truncate',
                      conv.noLeidos > 0 ? 'font-black text-gray-900' : 'font-semibold text-gray-800',
                    )}>
                      {conv.contraparteNombre || 'Estudiante'}
                    </span>
                    <span className={cn(
                      'text-[11px] shrink-0',
                      conv.noLeidos > 0 ? 'text-primary font-bold' : 'text-gray-400',
                    )}>
                      {fechaLista(conv.fechaUltimaActividad)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className="text-[12px] text-gray-500 truncate flex-1">
                      {conv.ultimoMensajePreview || <em>Sin mensajes aún</em>}
                    </p>
                    {conv.noLeidos > 0 && !activa && (
                      <span className="shrink-0 min-w-[20px] h-5 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center px-1.5">
                        {conv.noLeidos > 99 ? '99+' : conv.noLeidos}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">home</span>
                    {conv.propiedadTitulo}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ══ Panel derecho: área de chat ══ */}
      <main className={cn(
        'flex-1 flex flex-col min-w-0 bg-[#efeae2]',
        vistaMovil === 'lista' ? 'hidden md:flex' : 'flex',
      )}>
        {!seleccionada ? (
          /* Estado vacío */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-24 h-24 bg-white/60 rounded-full flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-6xl text-primary/40">chat</span>
            </div>
            <div>
              <p className="text-gray-600 font-bold text-xl tracking-tight">AlquilaYa Mensajes</p>
              <p className="text-gray-400 text-sm mt-1.5 max-w-xs">
                Selecciona una conversación de la lista para comenzar a chatear con tus estudiantes.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header del chat */}
            <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0 shadow-sm z-10">
              <button
                onClick={() => setVistaMovil('lista')}
                className="md:hidden p-1 -ml-1 text-gray-500 hover:text-gray-700"
              >
                <span className="material-symbols-outlined text-[24px]">arrow_back</span>
              </button>

              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-base shrink-0', avatarColor(seleccionada.contraparteNombre || ''))}>
                {(seleccionada.contraparteNombre || '?').charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm leading-tight truncate">
                  {seleccionada.contraparteNombre || 'Estudiante'}
                </p>
                <p className="text-[11px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[13px]">home</span>
                  {seleccionada.propiedadTitulo}
                </p>
              </div>

              <span className="hidden sm:inline-flex items-center gap-1 bg-primary/5 border border-primary/10 text-primary text-[11px] font-bold px-3 py-1 rounded-full shrink-0">
                <span className="material-symbols-outlined text-[14px]">apartment</span>
                Propiedad
              </span>

              {/* Menú ⋮ de la conversación */}
              <div ref={menuConvRef} className="relative shrink-0">
                <button
                  onClick={() => setMostrarMenuConv((v) => !v)}
                  className="p-1.5 -mr-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Más opciones"
                  disabled={eliminando}
                >
                  <span className="material-symbols-outlined text-[22px]">more_vert</span>
                </button>
                {mostrarMenuConv && (
                  <div className="absolute right-0 top-full mt-1 z-30 min-w-[200px] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    <button
                      onClick={eliminarConversacion}
                      disabled={eliminando}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                      {eliminando ? 'Borrando…' : 'Borrar conversación'}
                    </button>
                  </div>
                )}
              </div>
            </header>

            {/* Área de mensajes */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
              {/* Botón cargar mensajes anteriores */}
              {hayMasAntiguos && (
                <div className="flex justify-center pb-2">
                  <button
                    onClick={cargarAntiguos}
                    disabled={cargandoAntiguos}
                    className="text-[11px] font-bold text-primary bg-white/80 hover:bg-white border border-primary/10 px-4 py-1.5 rounded-full shadow-sm transition-colors disabled:opacity-50"
                  >
                    {cargandoAntiguos ? 'Cargando…' : '↑ Ver mensajes anteriores'}
                  </button>
                </div>
              )}

              {/* Spinner de carga */}
              {cargandoMensajes && (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}

              {/* Estado vacío de mensajes */}
              {!cargandoMensajes && mensajes.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center gap-2">
                  <span className="material-symbols-outlined text-4xl text-gray-300">forum</span>
                  <p className="text-gray-500 text-sm">Inicia la conversación enviando un mensaje</p>
                </div>
              )}

              {/* Mensajes */}
              {!cargandoMensajes && mensajesConSeps.map((item) => {
                if (item.type === 'sep') {
                  return <FechaSeparador key={item.key} label={item.label} />;
                }
                const mio = esMensajeMio(item.msg, miPerfilId, miRol);
                return (
                  <BurbujaMensaje
                    key={item.msg.id}
                    msg={item.msg}
                    mio={mio}
                    onReply={() => setQuoteado(item.msg)}
                  />
                );
              })}

              {/* Typing indicator */}
              {otroEscribiendo && <TypingDots />}
            </div>

            {/* Área de input */}
            <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
              {/* Preview del mensaje citado */}
              {quoteado && (
                <div className="flex items-start gap-2 mb-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                  <div className="w-1 self-stretch bg-primary rounded-full shrink-0 mt-0.5" />
                  <p className="flex-1 text-[12px] text-gray-600 line-clamp-2 leading-relaxed">
                    {quoteado.contenido}
                  </p>
                  <button
                    onClick={() => setQuoteado(null)}
                    className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2">
                {/* Emoji picker */}
                <div ref={emojiRef} className="relative shrink-0">
                  <button
                    onClick={() => setMostrarEmojis((v) => !v)}
                    className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[24px]">emoji_emotions</span>
                  </button>
                  {mostrarEmojis && (
                    <div className="absolute bottom-12 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden">
                      <EmojiPicker
                        onEmojiClick={(data: EmojiClickData) => {
                          setBorrador((prev) => prev + data.emoji);
                          inputRef.current?.focus();
                        }}
                        height={350}
                        width={300}
                      />
                    </div>
                  )}
                </div>

                {/* Textarea */}
                <textarea
                  ref={inputRef}
                  value={borrador}
                  onChange={onInputChange}
                  onKeyDown={onKeyDown}
                  placeholder="Escribe un mensaje…"
                  rows={1}
                  maxLength={2000}
                  className="flex-1 resize-none bg-gray-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:bg-gray-50 border border-transparent focus:border-primary/20 transition-colors overflow-y-auto"
                  style={{ maxHeight: '128px' }}
                />

                {/* Botón enviar */}
                <button
                  onClick={enviarMensaje}
                  disabled={!borrador.trim()}
                  className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
