'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';

import { ConversationList } from '@/components/student/conversation-list';
import { SkeletonCard } from '@/components/shared/skeleton-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyMessagesIllustration } from '@/components/shared/illustrations';
import { Input } from '@/components/ui/input';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { conversationService } from '@/services/conversation-service';
import { api } from '@/lib/api';
import { notify } from '@/lib/notify';
import type { ConversacionResumen } from '@/types/chat';

type EstadoArchivadas = 'idle' | 'cargando' | 'ok' | 'error';

const PAGE_SIZE = 20;

export default function StudentMessagesPage() {
  const [conversaciones, setConversaciones] = useState<ConversacionResumen[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  // Ítem 264: scroll infinito paginado (GET /conversaciones/paginadas). El badge
  // global de no-leídos NO depende de este fetch — dashboard-shell.tsx ya lo
  // calcula por su cuenta con listarMias(), así que acá no hace falta duplicarlo.
  const [pagina, setPagina] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [busqueda, setBusqueda] = useState('');
  // Ítem 263 fase 1 + 264: la búsqueda necesita el listado COMPLETO (no solo lo
  // ya paginado), así que la primera vez que el usuario escribe algo se trae una
  // vez con listarMias() y se cachea; mientras tanto se busca sobre lo ya cargado.
  const [todasParaBuscar, setTodasParaBuscar] = useState<ConversacionResumen[] | null>(null);
  const intentoBusquedaRef = useRef(false);

  const [archivadas, setArchivadas] = useState<ConversacionResumen[]>([]);
  const [estadoArchivadas, setEstadoArchivadas] = useState<EstadoArchivadas>('idle');

  useEffect(() => {
    let cancelado = false;
    conversationService
      .listarMiasPaginadas(0, PAGE_SIZE)
      .then((data) => {
        if (cancelado) return;
        setConversaciones(data.content);
        setPagina(data.number);
        setHayMas(data.number + 1 < data.totalPages);
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

  const cargarMas = () => {
    if (cargandoMas || !hayMas) return;
    setCargandoMas(true);
    conversationService
      .listarMiasPaginadas(pagina + 1, PAGE_SIZE)
      .then((data) => {
        setConversaciones((prev) => [...prev, ...data.content]);
        setPagina(data.number);
        setHayMas(data.number + 1 < data.totalPages);
      })
      .catch((err) => notify.error(err, 'No pudimos cargar más conversaciones'))
      .finally(() => setCargandoMas(false));
  };

  const busquedaNormalizada = busqueda.trim().toLowerCase();

  useInfiniteScroll(sentinelRef, cargarMas, {
    enabled: estado === 'ok' && hayMas && !busquedaNormalizada,
  });

  // Ítem 263: trae el listado completo una sola vez, la primera vez que se busca algo.
  useEffect(() => {
    if (!busquedaNormalizada || intentoBusquedaRef.current) return;
    intentoBusquedaRef.current = true;
    let cancelado = false;
    conversationService
      .listarMias()
      .then((data) => {
        if (cancelado) return;
        setTodasParaBuscar(data);
      })
      .catch(() => {
        if (cancelado) return;
        notify.error(null, 'No pudimos buscar en todas tus conversaciones');
      });
    return () => {
      cancelado = true;
    };
  }, [busquedaNormalizada]);

  const buscandoGlobal = !!busquedaNormalizada && !todasParaBuscar;
  const fuenteBusqueda = todasParaBuscar ?? conversaciones;
  const conversacionesFiltradas = busquedaNormalizada
    ? fuenteBusqueda.filter(
        (c) =>
          c.contraparteNombre.toLowerCase().includes(busquedaNormalizada) ||
          (c.propiedadTitulo?.toLowerCase().includes(busquedaNormalizada) ?? false),
      )
    : conversaciones;

  const cargarArchivadas = () => {
    if (estadoArchivadas !== 'idle') return;
    setEstadoArchivadas('cargando');
    api
      .get<ConversacionResumen[]>('/mensajeria/conversaciones/archivadas')
      .then(({ data }) => {
        setArchivadas(data);
        setEstadoArchivadas('ok');
      })
      .catch((err) => {
        notify.error(err, 'No pudimos cargar las conversaciones archivadas');
        setEstadoArchivadas('error');
      });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 space-y-2">
        <h1 className="text-h1">
          Mensajes
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Conversaciones con arrendadores y compañeros de cuarto.
        </p>
      </header>

      {estado === 'ok' && conversaciones.length > 0 && (
        <div className="mb-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o propiedad…"
              className="h-11 rounded-xl pl-9"
              aria-label="Buscar en tus conversaciones"
            />
          </div>
          {buscandoGlobal && (
            <p className="mt-1.5 px-1 text-xs text-muted-foreground">
              Buscando en todas tus conversaciones…
            </p>
          )}
        </div>
      )}

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
          illustration={EmptyMessagesIllustration}
          title="Sin conversaciones todavía"
          description='Encuentra un cuarto y haz clic en "Contactar arrendador" para empezar.'
          action={{ type: 'link', label: 'Explorar cuartos', href: '/search' }}
        />
      )}

      {estado === 'ok' && conversaciones.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {conversacionesFiltradas.length > 0 ? (
            <ConversationList items={conversacionesFiltradas} />
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Sin resultados para tu búsqueda.
            </p>
          )}
        </div>
      )}

      {/* Ítem 264: sentinel de scroll infinito — solo fuera de una búsqueda activa,
          la búsqueda ya trajo el listado completo. */}
      {estado === 'ok' && !busquedaNormalizada && hayMas && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {cargandoMas && (
            <span className="text-xs text-muted-foreground">Cargando más conversaciones…</span>
          )}
        </div>
      )}

      {estado === 'ok' && (
        <details
          className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          onToggle={(e) => {
            if (e.currentTarget.open) cargarArchivadas();
          }}
        >
          <summary className="cursor-pointer select-none list-none px-4 py-3 text-sm font-bold text-foreground hover:bg-muted [&::-webkit-details-marker]:hidden">
            Archivadas{estadoArchivadas === 'ok' && ` (${archivadas.length})`}
          </summary>
          <div className="border-t border-border">
            {estadoArchivadas === 'cargando' && (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">Cargando…</p>
            )}
            {estadoArchivadas === 'error' && (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                No pudimos cargar las conversaciones archivadas.
              </p>
            )}
            {estadoArchivadas === 'ok' && archivadas.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                No tienes conversaciones archivadas.
              </p>
            )}
            {estadoArchivadas === 'ok' && archivadas.length > 0 && (
              <ConversationList items={archivadas} />
            )}
          </div>
        </details>
      )}
    </div>
  );
}
