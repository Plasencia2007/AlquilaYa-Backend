'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Card } from '@/components/ui/legacy-card';
import { useStompChat } from '@/hooks/use-stomp-chat';
import { cn } from '@/lib/cn';
import { tiempoChat, tiempoRelativo } from '@/lib/relative-time';
import { messagingService } from '@/services/messaging-service';
import { servicioAuth } from '@/services/auth-service';
import { notify } from '@/lib/notify';
import Cookies from 'js-cookie';
import type { ConversacionResumen } from '@/types/messaging';

function obtenerMiPerfilId(): number | null {
  const token = Cookies.get('auth-token');
  if (!token) return null;
  const u = servicioAuth.obtenerUsuarioActualDesdeToken(token);
  const v = u?.perfilId;
  return typeof v === 'number' ? v : v ? Number(v) : null;
}

export default function LandlordMessagesStudentsPage() {
  const [conversaciones, setConversaciones] = useState<ConversacionResumen[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [seleccionada, setSeleccionada] = useState<ConversacionResumen | null>(null);
  const [borrador, setBorrador] = useState('');
  const miPerfilId = useMemo(() => obtenerMiPerfilId(), []);

  const { mensajes, enviar, conectado, cargando: cargandoMensajes } = useStompChat(
    seleccionada?.id ?? null,
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Cargar lista de conversaciones
  useEffect(() => {
    let cancelado = false;
    setCargandoLista(true);
    messagingService
      .listarConversaciones()
      .then((lista) => {
        if (cancelado) return;
        const ordenadas = lista
          .slice()
          .sort(
            (a, b) =>
              new Date(b.fechaUltimaActividad).getTime() -
              new Date(a.fechaUltimaActividad).getTime(),
          );
        setConversaciones(ordenadas);
        if (ordenadas.length > 0) setSeleccionada(ordenadas[0]);
      })
      .catch((err) => notify.error(err, 'No se pudieron cargar las conversaciones'))
      .finally(() => {
        if (!cancelado) setCargandoLista(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // Auto-scroll al fondo cuando llegan mensajes
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [mensajes.length, seleccionada?.id]);

  const onEnviar = async () => {
    const txt = borrador.trim();
    if (!txt || !seleccionada) return;
    setBorrador('');
    try {
      await enviar(txt);
    } catch (err) {
      notify.error(err, 'No se pudo enviar el mensaje');
      setBorrador(txt);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-black text-on-surface tracking-tighter opacity-90">
          Mensajes con Estudiantes
        </h1>
        <p className="text-on-surface-variant text-[12px] font-medium mt-0.5 tracking-tight">
          Conversaciones en vivo con quienes están interesados en tus propiedades.
          {!conectado && (
            <span className="ml-2 text-amber-500">Reconectando…</span>
          )}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 h-[calc(100vh-220px)]">
        {/* Lista de conversaciones */}
        <Card padding="none" className="bg-white/40 border border-on-surface/5 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-on-surface/5">
            <h3 className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">
              Conversaciones {conversaciones.length > 0 && `(${conversaciones.length})`}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {cargandoLista && (
              <div className="p-6 text-sm text-on-surface-variant">Cargando…</div>
            )}
            {!cargandoLista && conversaciones.length === 0 && (
              <div className="p-6 text-sm text-on-surface-variant">
                Aún no tienes conversaciones.
              </div>
            )}
            {conversaciones.map((c) => {
              const activa = seleccionada?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSeleccionada(c)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-on-surface/5 flex gap-3 items-start hover:bg-on-surface/5 transition-colors',
                    activa && 'bg-blue-500/10 hover:bg-blue-500/10',
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-on-surface/10 flex items-center justify-center text-sm font-black text-on-surface/70 shrink-0">
                    {(c.contraparteNombre || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <h4 className="font-black text-sm text-on-surface/90 truncate">
                        {c.contraparteNombre || 'Estudiante'}
                      </h4>
                      <span className="text-[10px] text-on-surface/40 font-bold shrink-0">
                        {tiempoChat(c.fechaUltimaActividad)}
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant font-medium truncate mt-0.5">
                      {c.ultimoMensajePreview ?? 'Sin mensajes'}
                    </p>
                    <p className="text-[10px] text-on-surface/40 italic truncate mt-0.5">
                      {c.propiedadTitulo}
                    </p>
                  </div>
                  {c.noLeidos > 0 && !activa && (
                    <span className="bg-blue-500 text-white text-[10px] font-black rounded-full px-2 py-0.5 shrink-0">
                      {c.noLeidos}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Panel de chat */}
        <Card padding="none" className="bg-white/40 border border-on-surface/5 flex flex-col overflow-hidden">
          {!seleccionada ? (
            <div className="flex-1 flex items-center justify-center text-sm text-on-surface-variant">
              Selecciona una conversación para empezar.
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-on-surface/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-on-surface/10 flex items-center justify-center text-sm font-black text-on-surface/70">
                  {(seleccionada.contraparteNombre || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-black text-sm text-on-surface/90">
                    {seleccionada.contraparteNombre || 'Estudiante'}
                  </h4>
                  <p className="text-[10px] text-on-surface-variant font-medium italic">
                    {seleccionada.propiedadTitulo}
                  </p>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {cargandoMensajes && (
                  <p className="text-sm text-on-surface-variant text-center">Cargando mensajes…</p>
                )}
                {!cargandoMensajes && mensajes.length === 0 && (
                  <p className="text-sm text-on-surface-variant text-center">
                    Inicia la conversación enviando un mensaje.
                  </p>
                )}
                {mensajes.map((m) => {
                  const mio = m.emisorPerfilId === miPerfilId;
                  return (
                    <div
                      key={m.id}
                      className={cn('flex', mio ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[70%] rounded-2xl px-4 py-2',
                          mio
                            ? 'bg-blue-500 text-white rounded-br-sm'
                            : 'bg-on-surface/5 text-on-surface rounded-bl-sm',
                        )}
                      >
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                          {m.contenido}
                        </p>
                        <p
                          className={cn(
                            'text-[9px] font-bold mt-1 uppercase tracking-wider',
                            mio ? 'text-white/70' : 'text-on-surface/40',
                          )}
                        >
                          {tiempoRelativo(m.fechaEnvio)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-on-surface/5">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onEnviar();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={borrador}
                    onChange={(e) => setBorrador(e.target.value)}
                    placeholder="Escribe un mensaje…"
                    className="flex-1 px-4 py-2 rounded-full bg-on-surface/5 border border-on-surface/10 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!borrador.trim()}
                    className="bg-blue-500 text-white rounded-full px-5 py-2 text-sm font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                  >
                    Enviar
                  </button>
                </form>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
