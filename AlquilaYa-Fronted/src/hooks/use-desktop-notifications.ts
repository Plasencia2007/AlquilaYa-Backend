'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface DesktopNotificationsPrefState {
  habilitado: boolean;
  setHabilitado: (v: boolean) => void;
}

/**
 * Preferencia opt-in de notificaciones de escritorio del chat (ítem 256), persistida en
 * localStorage. `skipHydration` evita el mismatch SSR/CSR (mismo patrón que
 * `history-store.ts`); el hook rehidrata al montar con `.persist.rehydrate()`.
 */
const usePrefStore = create<DesktopNotificationsPrefState>()(
  persist(
    (set) => ({
      habilitado: false,
      setHabilitado: (habilitado) => set({ habilitado }),
    }),
    {
      name: 'alquilaya-chat-desktop-notifications',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

const TITULO_BASE = 'AlquilaYa';
const BLINK_MS = 1000;

/** Beep corto generado con Web Audio API: evita depender de un asset .mp3 nuevo. */
function reproducirBeep() {
  if (typeof window === 'undefined') return;
  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;
  try {
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => {
      ctx.close().catch(() => {/* noop */});
    };
  } catch {
    /* noop: audio no soportado/bloqueado por el navegador */
  }
}

/**
 * Notificaciones de escritorio opt-in para el chat (ítem 256):
 * - `Notification` API (permiso opt-in) cuando llega un mensaje y la pestaña está oculta.
 * - Título de pestaña parpadeante "(N) AlquilaYa" mientras haya mensajes nuevos sin ver
 *   y la pestaña siga en background; se limpia al volver el foco.
 * - Beep corto (Web Audio API) al notificar.
 */
export function useDesktopNotifications() {
  const [hidratado, setHidratado] = useState(false);
  const habilitado = usePrefStore((s) => s.habilitado);
  const setHabilitadoStore = usePrefStore((s) => s.setHabilitado);

  const blinkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tituloOriginalRef = useRef('AlquilaYa');
  const pendientesRef = useRef(0);

  useEffect(() => {
    usePrefStore.persist.rehydrate()?.then(() => setHidratado(true));
  }, []);

  const detenerParpadeo = useCallback(() => {
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
      blinkIntervalRef.current = null;
    }
    pendientesRef.current = 0;
    if (typeof document !== 'undefined') document.title = tituloOriginalRef.current;
  }, []);

  useEffect(() => {
    function onVisibilityChange() {
      if (!document.hidden) detenerParpadeo();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [detenerParpadeo]);

  useEffect(() => {
    return () => detenerParpadeo();
  }, [detenerParpadeo]);

  const alternar = useCallback(() => {
    const next = !usePrefStore.getState().habilitado;
    if (next && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().then(() => setHabilitadoStore(next));
      return;
    }
    setHabilitadoStore(next);
  }, [setHabilitadoStore]);

  const notificarMensajeNuevo = useCallback(
    (titulo: string, cuerpo: string) => {
      if (!habilitado || typeof document === 'undefined' || !document.hidden) return;

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification(titulo, { body: cuerpo });
        } catch {
          /* noop */
        }
      }

      pendientesRef.current += 1;
      if (!blinkIntervalRef.current) {
        tituloOriginalRef.current = document.title;
        document.title = `(${pendientesRef.current}) ${TITULO_BASE}`;
        blinkIntervalRef.current = setInterval(() => {
          document.title =
            document.title === tituloOriginalRef.current
              ? `(${pendientesRef.current}) ${TITULO_BASE}`
              : tituloOriginalRef.current;
        }, BLINK_MS);
      }

      reproducirBeep();
    },
    [habilitado],
  );

  return {
    habilitado: hidratado && habilitado,
    alternar,
    notificarMensajeNuevo,
  };
}
