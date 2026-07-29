'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

interface Props {
  /** Token verificado, listo para mandar al backend en `turnstileToken`. */
  onVerify: (token: string) => void;
  onExpire?: () => void;
  className?: string;
}

/**
 * Widget anti-bots de Cloudflare Turnstile (#184), en register/forgot-password. Sin fricción
 * visual (modo "managed": normalmente invisible, solo desafía si detecta comportamiento
 * sospechoso). Si `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no está configurada (no hay cuenta de
 * Cloudflare todavía), el componente no renderiza nada — el backend (`TurnstileService`)
 * ya degrada a "permitir siempre" en ese caso, así que ocultar el widget es coherente, no
 * rompe el flujo en desarrollo.
 */
export function TurnstileWidget({ onVerify, onExpire, className }: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptListo, setScriptListo] = useState(false);

  useEffect(() => {
    if (!siteKey || !scriptListo || !containerRef.current || !window.turnstile) return;
    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      'expired-callback': onExpire,
      theme: 'auto',
    });
    widgetIdRef.current = widgetId;
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, scriptListo]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
        onReady={() => setScriptListo(true)}
      />
      <div ref={containerRef} className={className} />
    </>
  );
}
