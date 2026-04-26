'use client';

import { Client, type IFrame, type IMessage, type StompSubscription } from '@stomp/stompjs';
import Cookies from 'js-cookie';

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8086/ws-mensajeria';

type Listener = (msg: IMessage) => void;

interface PendingSub {
  destination: string;
  listener: Listener;
}

/**
 * Singleton cliente STOMP. Una sola conexión WebSocket por pestaña.
 *
 * - Reconnect automático con backoff (5s).
 * - Lee el token JWT de la cookie `auth-token` al conectar (se manda como header
 *   `Authorization: Bearer <token>` en el frame CONNECT).
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

    const token = Cookies.get('auth-token');
    if (!token) return; // no logueado, no conectar

    this.client = new Client({
      brokerURL: WS_URL,
      connectHeaders: { Authorization: `Bearer ${token}` },
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
