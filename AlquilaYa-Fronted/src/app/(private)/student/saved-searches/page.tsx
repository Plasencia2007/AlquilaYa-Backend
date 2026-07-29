'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bell, BellRing, Bookmark, Search, Trash2 } from 'lucide-react';

import { EmptyState } from '@/components/shared/empty-state';
import { useSavedSearchesStore, type BusquedaGuardada } from '@/stores/saved-searches-store';
import { parseFiltros } from '@/lib/search-url';
import { alertaService } from '@/services/alerta-service';
import { useAuth } from '@/hooks/use-auth';
import { notify } from '@/lib/notify';
import { tiempoRelativo } from '@/lib/relative-time';
import { cn } from '@/lib/cn';

interface ItemDerivado {
  b: BusquedaGuardada;
  /** El backend de alertas exige zona o universidad; si no hay, no se puede suscribir. */
  elegibleAlerta: boolean;
  universidadId?: number;
  zonaId?: number;
  precioMax?: number;
  /** Criterios extra que el backend de alertas ahora soporta (afinan el matching). */
  tipoPropiedad?: string;
  servicios?: string[];
  dormitoriosMin?: number;
  capacidadMin?: number;
}

export default function StudentSavedSearchesPage() {
  const { usuario } = useAuth();
  const busquedas = useSavedSearchesStore((s) => s.busquedas);
  const eliminar = useSavedSearchesStore((s) => s.eliminar);
  const marcarAlerta = useSavedSearchesStore((s) => s.marcarAlerta);

  const [hidratado, setHidratado] = useState(false);
  const [suscribiendo, setSuscribiendo] = useState<string | null>(null);

  useEffect(() => {
    useSavedSearchesStore.persist.rehydrate()?.then(() => setHidratado(true));
  }, []);

  const items = useMemo<ItemDerivado[]>(
    () =>
      busquedas.map((b) => {
        const f = parseFiltros(new URLSearchParams(b.query));
        return {
          b,
          elegibleAlerta: f.universidadId != null || f.zonaId != null,
          universidadId: f.universidadId,
          zonaId: f.zonaId,
          precioMax: f.precioMax,
          tipoPropiedad: f.tipo,
          servicios: f.servicios.length > 0 ? f.servicios : undefined,
          dormitoriosMin: f.dormitoriosMin,
          capacidadMin: f.capacidadMin,
        };
      }),
    [busquedas],
  );

  const activarAlerta = async (item: ItemDerivado) => {
    if (!item.elegibleAlerta) return;
    if (!usuario?.correo) {
      notify.warning('Necesitas una cuenta con correo para recibir alertas');
      return;
    }
    setSuscribiendo(item.b.id);
    try {
      await alertaService.suscribir({
        correo: usuario.correo,
        universidadId: item.universidadId,
        zonaId: item.zonaId,
        precioMax: item.precioMax,
        tipoPropiedad: item.tipoPropiedad,
        servicios: item.servicios,
        dormitoriosMin: item.dormitoriosMin,
        capacidadMin: item.capacidadMin,
      });
      marcarAlerta(item.b.id, true);
      notify.success('Alerta creada', 'Revisa tu correo para confirmar la suscripción.');
    } catch (err) {
      notify.error(err, 'No pudimos crear la alerta');
    } finally {
      setSuscribiendo(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 space-y-2">
        <h1 className="text-h1">Búsquedas guardadas</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Vuelve a ejecutar tus filtros favoritos con un clic y recibe avisos cuando salga algo así.
        </p>
      </header>

      {!hidratado ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 w-full animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Aún no guardas búsquedas"
          description='Aplica filtros en la búsqueda y toca "Guardar búsqueda" para tenerlos siempre a mano.'
          action={{ type: 'link', label: 'Ir a buscar cuartos', href: '/search' }}
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const { b } = item;
            return (
              <li
                key={b.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Search className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{b.etiqueta}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Guardada {tiempoRelativo(b.creadaEn)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {/* Alerta por correo (reusa POST /usuarios/alertas). Solo si hay zona o universidad. */}
                  {item.elegibleAlerta ? (
                    b.alertaActiva ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-2 text-xs font-bold text-success">
                        <BellRing className="size-4" aria-hidden />
                        Alerta activa
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => activarAlerta(item)}
                        disabled={suscribiendo === b.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary disabled:opacity-60"
                      >
                        <Bell className="size-4" aria-hidden />
                        {suscribiendo === b.id ? 'Activando…' : 'Avísame'}
                      </button>
                    )
                  ) : (
                    <span
                      className="hidden text-[11px] font-medium text-muted-foreground sm:inline"
                      title="Las alertas por correo requieren filtrar por universidad o zona."
                    >
                      Sin alerta
                    </span>
                  )}

                  <Link
                    href={`/search${b.query ? `?${b.query}` : ''}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
                  >
                    Ver resultados
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>

                  <button
                    type="button"
                    onClick={() => eliminar(b.id)}
                    aria-label={`Eliminar búsqueda "${b.etiqueta}"`}
                    className={cn(
                      'inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition',
                      'hover:bg-destructive/10 hover:text-destructive',
                    )}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
