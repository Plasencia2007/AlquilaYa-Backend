'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { stompClient } from '@/services/stomp-client';
import { conversationService } from '@/services/conversation-service';
import { notify } from '@/lib/notify';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { useUnreadMessagesStore } from '@/stores/unread-messages-store';
import type {
  Conversacion,
  EventoConversacion,
  Mensaje,
  RolEmisor,
} from '@/types/chat';
import type { RolUsuario } from '@/types/auth';

/** Ítem 268: payload de `/user/queue/errors` (rate limit del backend, etc.). */
interface EventoErrorChat {
  tipo: 'RATE_LIMIT_EXCEEDED' | 'ERROR';
  error?: string;
}

/**
 * Maneja el ciclo de vida de un chat individual:
 * - Carga la conversación + mensajes históricos.
 * - Suscribe al destino STOMP de mensajes nuevos.
 * - Suscribe al destino de eventos (read receipts + typing).
 * - Envía mensajes (REST), marca como leídos al abrir.
 * - Notifica typing al servidor con debounce.
 */
const PAGE_SIZE = 50;

export function useConversation(conversacionId: number | string) {
  const { estaAutenticado } = useAuth();
  const [conversacion, setConversacion] = useState<Conversacion | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [otroEscribiendo, setOtroEscribiendo] = useState(false);
  const [cargandoAntiguos, setCargandoAntiguos] = useState(false);
  const [hayMasAntiguos, setHayMasAntiguos] = useState(false);
  // Ítem 257: estado de conexión del WS, expuesto para que la UI muestre "Reconectando…".
  const [conectado, setConectado] = useState(() => stompClient.isConnected());

  const { perfilId: miPerfilId, rol: miRol } = obtenerMiIdentidad();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<boolean>(false);
  // El backend pagina los mensajes ORDER BY fechaEnvio ASC (page 0 = los más
  // ANTIGUOS, no los más recientes). Para mostrar la conversación empezando
  // por lo último, ubicamos la última página en la carga inicial y desde ahí
  // caminamos hacia atrás (page - 1) cada vez que se pide historial anterior.
  const paginaMasAntiguaRef = useRef(0);

  // Carga inicial + suscripciones
  useEffect(() => {
    if (!estaAutenticado || !conversacionId) return;

    let cancelado = false;
    let unsubMensajes: (() => void) | null = null;
    let unsubEventos: (() => void) | null = null;
    let unsubErrores: (() => void) | null = null;

    setCargando(true);
    setError(false);
    setHayMasAntiguos(false);

    (async () => {
      try {
        const [conv, primeraPagina] = await Promise.all([
          conversationService.obtener(conversacionId),
          conversationService.listarMensajes(conversacionId, 0, PAGE_SIZE),
        ]);
        if (cancelado) return;

        let paginaFinal = primeraPagina;
        let indicePaginaFinal = 0;
        if (primeraPagina.totalPages > 1) {
          // Page 0 trajo los mensajes más antiguos: pedimos la última página real.
          indicePaginaFinal = primeraPagina.totalPages - 1;
          paginaFinal = await conversationService.listarMensajes(
            conversacionId,
            indicePaginaFinal,
            PAGE_SIZE,
          );
          if (cancelado) return;
        }

        setConversacion(conv);
        setMensajes(paginaFinal.content ?? []);
        paginaMasAntiguaRef.current = indicePaginaFinal;
        setHayMasAntiguos(indicePaginaFinal > 0);
        setCargando(false);
        // Marcar como leídos en background
        conversationService.marcarLeida(conv.id).catch(() => {/* noop */});
        useUnreadMessagesStore.getState().marcarLeida(conv.id);
      } catch {
        if (cancelado) return;
        setError(true);
        setCargando(false);
      }
    })();

    const subscribirSiConectado = () => {
      const destinoMsgs = `/user/queue/conversacion.${conversacionId}`;
      const destinoEventos = `/user/queue/conversacion.${conversacionId}.eventos`;

      unsubMensajes = stompClient.subscribe(destinoMsgs, (msg) => {
        try {
          const nuevo: Mensaje = JSON.parse(msg.body);
          setMensajes((prev) => {
            if (prev.some((m) => m.id === nuevo.id)) return prev;
            return [...prev, nuevo];
          });
          // perfilId solo es único dentro de un rol; comparamos también el rol
          // para no confundir al otro participante con uno mismo cuando los ids
          // colisionan entre tablas estudiantes/arrendadores.
          const esMio = nuevo.emisorPerfilId === miPerfilId && nuevo.emisorRol === miRol;
          if (!esMio) {
            // Ítem 266: alimenta el desglose por conversación del store global; como esta
            // conversación está abierta, `marcarLeida` la vuelve a poner en 0 justo después.
            useUnreadMessagesStore.getState().incrementar(Number(conversacionId));
            conversationService
              .marcarLeida(conversacionId)
              .catch(() => {/* noop */});
            useUnreadMessagesStore.getState().marcarLeida(Number(conversacionId));
          }
        } catch {
          /* noop */
        }
      });

      // Ítem 268: errores del backend por este canal (ej. rate limit al enviar mensajes).
      unsubErrores = stompClient.subscribe('/user/queue/errors', (msg) => {
        try {
          const evento: EventoErrorChat = JSON.parse(msg.body);
          if (evento.tipo === 'RATE_LIMIT_EXCEEDED') {
            notify.error(null, evento.error || 'Estás enviando mensajes muy rápido. Espera un momento.');
          } else if (evento.tipo === 'ERROR') {
            notify.error(null, evento.error || 'Ocurrió un error en el chat.');
          }
        } catch {
          /* noop */
        }
      });

      unsubEventos = stompClient.subscribe(destinoEventos, (msg) => {
        try {
          const evento: EventoConversacion = JSON.parse(msg.body);
          if (evento.tipo === 'MENSAJES_LEIDOS') {
            // El otro leyó mis mensajes: marcar mensajes míos sin fechaLectura.
            const lectorEsOtro =
              evento.lectorPerfilId !== miPerfilId || evento.lectorRol !== miRol;
            if (lectorEsOtro) {
              setMensajes((prev) =>
                prev.map((m) =>
                  m.emisorPerfilId === miPerfilId && m.emisorRol === miRol && !m.fechaLectura
                    ? { ...m, fechaLectura: new Date().toISOString(), estado: 'LEIDO' }
                    : m,
                ),
              );
            }
          } else if (evento.tipo === 'TYPING') {
            const emisorEsOtro =
              evento.emisorPerfilId !== miPerfilId || evento.emisorRol !== miRol;
            if (emisorEsOtro) {
              setOtroEscribiendo(evento.escribiendo);
            }
          }
        } catch {
          /* noop */
        }
      });
    };

    if (stompClient.isConnected()) {
      subscribirSiConectado();
    } else {
      const off = stompClient.onConnect(subscribirSiConectado);
      return () => {
        cancelado = true;
        off();
        if (unsubMensajes) unsubMensajes();
        if (unsubEventos) unsubEventos();
        if (unsubErrores) unsubErrores();
      };
    }

    return () => {
      cancelado = true;
      if (unsubMensajes) unsubMensajes();
      if (unsubEventos) unsubEventos();
      if (unsubErrores) unsubErrores();
    };
  }, [conversacionId, estaAutenticado, miPerfilId, miRol]);

  // Ítem 257: estado de conexión del singleton STOMP, independiente de la conversación
  // (se suscribe una sola vez; `stompClient` ya reconecta solo con backoff de 5s).
  useEffect(() => {
    const offConnect = stompClient.onConnect(() => setConectado(true));
    const offDisconnect = stompClient.onDisconnect(() => setConectado(false));
    return () => {
      offConnect();
      offDisconnect();
    };
  }, []);

  const publicarTyping = useCallback(
    (escribiendo: boolean) => {
      if (lastTypingSentRef.current === escribiendo) return;
      lastTypingSentRef.current = escribiendo;
      stompClient.publish(`/app/chat.typing/${conversacionId}`, { escribiendo });
    },
    [conversacionId],
  );

  const notificarTyping = useCallback(() => {
    publicarTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => publicarTyping(false), 2500);
  }, [publicarTyping]);

  /**
   * Ítem 268: optimistic UI. Agrega de inmediato un mensaje temporal (id negativo,
   * `estadoEnvio: 'enviando'`) antes de esperar la respuesta REST; si el POST tiene éxito
   * lo reemplaza por el mensaje real (mismo hueco en el array), si falla lo marca
   * `estadoEnvio: 'fallido'` sin borrarlo, para que `reintentar()` pueda reintentar el envío.
   */
  const enviar = useCallback(
    async (contenido: string) => {
      const texto = contenido.trim();
      if (!texto) return;
      const idTemporal = -Date.now();
      const optimista: Mensaje = {
        id: idTemporal,
        conversacionId: Number(conversacionId),
        emisorPerfilId: miPerfilId ?? -1,
        emisorRol: (miRol as RolEmisor) ?? 'ESTUDIANTE',
        contenido: texto,
        estado: 'ENVIADO',
        fechaEnvio: new Date().toISOString(),
        estadoEnvio: 'enviando',
      };
      setMensajes((prev) => [...prev, optimista]);
      publicarTyping(false);
      try {
        const nuevo = await conversationService.enviarMensaje(conversacionId, texto);
        setMensajes((prev) => prev.map((m) => (m.id === idTemporal ? nuevo : m)));
      } catch (err) {
        setMensajes((prev) =>
          prev.map((m) => (m.id === idTemporal ? { ...m, estadoEnvio: 'fallido' } : m)),
        );
        notify.error(err, 'No pudimos enviar el mensaje');
      }
    },
    [conversacionId, miPerfilId, miRol, publicarTyping],
  );

  /**
   * Ítem 254: sube una imagen (Cloudinary vía backend) y crea el mensaje tipo IMAGEN.
   * Mismo patrón optimista que `enviar()`: mensaje temporal con preview local (blob URL)
   * mientras sube, reemplazado por el real al terminar. Si falla, se marca `fallido` sin
   * botón de reintentar (ver `chat-message.tsx`) porque reintentar reenviaría el `File`
   * original, que este hook no conserva tras el primer intento.
   */
  const enviarImagen = useCallback(
    async (file: File) => {
      const idTemporal = -Date.now();
      const previewUrl = URL.createObjectURL(file);
      const optimista: Mensaje = {
        id: idTemporal,
        conversacionId: Number(conversacionId),
        emisorPerfilId: miPerfilId ?? -1,
        emisorRol: (miRol as RolEmisor) ?? 'ESTUDIANTE',
        contenido: '📷 Imagen',
        estado: 'ENVIADO',
        fechaEnvio: new Date().toISOString(),
        estadoEnvio: 'enviando',
        tipo: 'IMAGEN',
        urlAdjunto: previewUrl,
      };
      setMensajes((prev) => [...prev, optimista]);
      try {
        const { url } = await conversationService.subirImagenChat(conversacionId, file);
        const nuevo = await conversationService.enviarImagen(conversacionId, url);
        setMensajes((prev) => prev.map((m) => (m.id === idTemporal ? nuevo : m)));
        URL.revokeObjectURL(previewUrl);
      } catch (err) {
        setMensajes((prev) =>
          prev.map((m) => (m.id === idTemporal ? { ...m, estadoEnvio: 'fallido' } : m)),
        );
        notify.error(err, 'No pudimos enviar la imagen');
      }
    },
    [conversacionId, miPerfilId, miRol],
  );

  /** Ítem 268: reintenta el envío de un mensaje que quedó en `estadoEnvio: 'fallido'`. */
  const reintentar = useCallback(
    async (mensajeTemporalId: number, contenido: string) => {
      setMensajes((prev) =>
        prev.map((m) => (m.id === mensajeTemporalId ? { ...m, estadoEnvio: 'enviando' } : m)),
      );
      try {
        const nuevo = await conversationService.enviarMensaje(conversacionId, contenido);
        setMensajes((prev) => prev.map((m) => (m.id === mensajeTemporalId ? nuevo : m)));
      } catch (err) {
        setMensajes((prev) =>
          prev.map((m) => (m.id === mensajeTemporalId ? { ...m, estadoEnvio: 'fallido' } : m)),
        );
        notify.error(err, 'No pudimos enviar el mensaje');
      }
    },
    [conversacionId],
  );

  /**
   * Carga la página anterior (mensajes más antiguos) y la antepone a `mensajes`.
   * Camina hacia atrás desde `paginaMasAntiguaRef` (ver nota en la carga inicial).
   */
  const cargarAntiguos = useCallback(async () => {
    if (cargandoAntiguos || paginaMasAntiguaRef.current <= 0) return;
    setCargandoAntiguos(true);
    try {
      const paginaAnterior = paginaMasAntiguaRef.current - 1;
      const pagina = await conversationService.listarMensajes(
        conversacionId,
        paginaAnterior,
        PAGE_SIZE,
      );
      setMensajes((prev) => {
        const idsExistentes = new Set(prev.map((m) => m.id));
        const nuevos = (pagina.content ?? []).filter((m) => !idsExistentes.has(m.id));
        return [...nuevos, ...prev];
      });
      paginaMasAntiguaRef.current = paginaAnterior;
      setHayMasAntiguos(paginaAnterior > 0);
    } catch (err) {
      notify.error(err, 'No se pudieron cargar mensajes anteriores');
    } finally {
      setCargandoAntiguos(false);
    }
  }, [conversacionId, cargandoAntiguos]);

  return {
    conversacion,
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
  };
}

// S5: el usuario actual ya no se decodifica de un token (es httpOnly, JS no puede leerlo) —
// se lee del store, que `inicializar()`/`restaurarSesion()` ya hidrató desde el backend.
function obtenerMiIdentidad(): { perfilId: number | null; rol: RolUsuario | null } {
  const usuario = useAuthStore.getState().usuario;
  const v = usuario?.perfilId;
  const perfilId = typeof v === 'number' ? v : v ? Number(v) : null;
  return { perfilId, rol: (usuario?.rol as RolUsuario) ?? null };
}
