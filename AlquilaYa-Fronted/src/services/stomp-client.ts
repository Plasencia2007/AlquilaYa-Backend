'use client';

import { Client, type IFrame, type IMessage, type StompSubscription } from '@stomp/stompjs';

/**
 * Resuelve la URL del WebSocket. Igual que `api.ts` para la API REST:
 * - Dev (la página es localhost): usa el default `ws://localhost:8086/ws-mensajeria`.
 * - Prod/ngrok (la página NO es localhost): usa el MISMO origen que la página, con `wss://`
 *   si la página es https. nginx enruta `/ws-mensajeria` → servicio-mensajeria:8086.
 * - Si `NEXT_PUBLIC_WS_URL` apunta a un host propio, se respeta tal cual.
 * Se resuelve en el connect (cliente), no al importar, para leer bien `window.location`.
 */
function resolveWsUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8086/ws-mensajeria';
  if (
    typeof window !== 'undefined' &&
    configured.includes('localhost') &&
    window.location.hostname !== 'localhost'
  ) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws-mensajeria`;
  }
  return configured;
}

type Listener = (msg: IMessage) => void;

interface PendingSub {
  destination: string;
  listener: Listener;
}

/**
 * Singleton cliente STOMP. Una sola conexión WebSocket por pestaña.
 *
 * - Reconnect automático con backoff (5s).
 * - S5: el JWT ya NO se lee acá (vive en un cookie httpOnly, JS no puede tocarlo). El
 *   handshake WS (una petición HTTP normal antes del upgrade) manda ese cookie solo — el
 *   backend lo lee ahí (WebSocketCookieHandshakeInterceptor) y autentica el frame CONNECT
 *   sin necesitar un header Authorization armado por el cliente. Sólo hay que llamar a
 *   `connect()` cuando el caller YA sabe que hay sesión (ver `useStomp`, que verifica
 *   `estaAutenticado` del store antes de llamar).
 * - `subscribe` se puede llamar antes de la conexión: queda pendiente y se
 *   activa cuando el cliente está conectado.
 * - `disconnect` limpia todo (logout).
 */
class StompClientSingleton {
  private client: Client | null = null;
  private connected = false;
  private subscriptions = new Map<string, StompSubscription>();
  private pending: PendingSub[] = [];
  private connectListeners = new Set<() => void>();
  private disconnectListeners = new Set<() => void>();

  isConnected(): boolean {
    return this.connected;
  }

  onConnect(cb: () => void): () => void {
    this.connectListeners.add(cb);
    if (this.connected) cb();
    return () => this.connectListeners.delete(cb);
  }

  onDisconnect(cb: () => void): () => void {
    this.disconnectListeners.add(cb);
    return () => this.disconnectListeners.delete(cb);
  }

  connect(): void {
    if (this.client && this.client.active) return;

    this.client = new Client({
      brokerURL: resolveWsUrl(),
      // S5: sin connectHeaders — la autenticación viaja en el cookie httpOnly del handshake.
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // debug: (str) => console.log('[STOMP]', str),
      onConnect: () => {
        this.connected = true;
        // Activar suscripciones pendientes
        for (const sub of this.pending) {
          this.activateSubscription(sub.destination, sub.listener);
        }
        this.pending = [];
        for (const cb of this.connectListeners) cb();
      },
      onWebSocketClose: () => {
        this.connected = false;
        for (const cb of this.disconnectListeners) cb();
      },
      onStompError: (frame: IFrame) => {
        console.warn('[STOMP] error:', frame.headers['message'], frame.body);
      },
    });

    this.client.activate();
  }

  /**
   * Suscribe a un destino. Si la conexión aún no está activa, queda pendiente.
   * Devuelve función de unsubscribe.
   */
  subscribe(destination: string, listener: Listener): () => void {
    if (!this.client || !this.connected) {
      const entry = { destination, listener };
      this.pending.push(entry);
      return () => {
        this.pending = this.pending.filter((p) => p !== entry);
        const sub = this.subscriptions.get(destination);
        if (sub) {
          sub.unsubscribe();
          this.subscriptions.delete(destination);
        }
      };
    }
    return this.activateSubscription(destination, listener);
  }

  private activateSubscription(destination: string, listener: Listener): () => void {
    if (!this.client || !this.connected) return () => {};
    const sub = this.client.subscribe(destination, listener);
    this.subscriptions.set(destination, sub);
    return () => {
      try {
        sub.unsubscribe();
      } catch {
        /* ya desuscrito */
      }
      this.subscriptions.delete(destination);
    };
  }

  publish(destination: string, body?: object): void {
    if (!this.client || !this.connected) return;
    this.client.publish({
      destination,
      body: body ? JSON.stringify(body) : '',
    });
  }

  disconnect(): void {
    if (!this.client) return;
    for (const sub of this.subscriptions.values()) {
      try {
        sub.unsubscribe();
      } catch {
        /* noop */
      }
    }
    this.subscriptions.clear();
    this.pending = [];
    this.client.deactivate();
    this.client = null;
    this.connected = false;
    for (const cb of this.disconnectListeners) cb();
  }
}

export const stompClient = new StompClientSingleton();
