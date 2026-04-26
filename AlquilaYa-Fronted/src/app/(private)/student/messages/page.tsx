'use client';

import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';

import { ConversationList } from '@/components/student/conversation-list';
import { SkeletonCard } from '@/components/shared/skeleton-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { conversationService } from '@/services/conversation-service';
import { notify } from '@/lib/notify';
import type { ConversacionResumen } from '@/types/chat';

export default function StudentMessagesPage() {
  const [conversaciones, setConversaciones] = useState<ConversacionResumen[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  useEffect(() => {
    let cancelado = false;
    setEstado('cargando');
    conversationService
      .listarMias()
      .then((data) => {
        if (cancelado) return;
        setConversaciones(data);
        setEstado('ok');
      })
      .catch((err) => {
        if (cancelado) return;
        notify.error(err, 'No pudimos cargar tus conversaciones');
        setEstado('error');
      });
    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 space-y-2">
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          Mensajes
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Conversaciones con arrendadores sobre cuartos disponibles.
        </p>
      </header>

      {estado === 'cargando' && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {estado === 'error' && (
        <ErrorState
          title="No pudimos cargar tus conversaciones"
          description="Inténtalo de nuevo en un momento."
          retryLabel="Reintentar"
          onRetry={() => window.location.reload()}
        />
      )}

      {estado === 'ok' && conversaciones.length === 0 && (
        <EmptyState
          icon={MessageCircle}
          title="Sin conversaciones todavía"
          description='Encuentra un cuarto y haz clic en "Contactar arrendador" para empezar.'
          action={{ type: 'link', label: 'Explorar cuartos', href: '/search' }}
        />
      )}

      {estado === 'ok' && conversaciones.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <ConversationList items={conversaciones} />
        </div>
      )}
    </div>
  );
}
