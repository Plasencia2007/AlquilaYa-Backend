'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { History as HistoryIcon, MapPin, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { SkeletonCard } from '@/components/shared/skeleton-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { useHistory } from '@/hooks/use-history';
import { useHistoryStore, type HistorialEntry } from '@/stores/history-store';
import { servicioPropiedades } from '@/services/property-service';
import { notify } from '@/lib/notify';
import { tiempoRelativo } from '@/lib/relative-time';
import { distanciaAUpeuKm, formatearDistancia } from '@/lib/geo';
import { formatPEN } from '@/lib/money';
import type { Propiedad } from '@/types/propiedad';

export default function StudentHistoryPage() {
  const { entradas, hidratado, limpiar, remover } = useHistory();
  const [propiedades, setPropiedades] = useState<Map<string, Propiedad>>(new Map());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);

  // Sin entradas no hay nada que pedir al backend: se resuelve en el render
  // (más abajo) sin pasar por el efecto, así evitamos setState síncrono
  // innecesario dentro del efecto para ese caso.
  const mostrarCargando = !hidratado || (entradas.length > 0 && cargando);

  useEffect(() => {
    if (!hidratado || entradas.length === 0) return;

    let cancelado = false;
    let huboErrorRed = false;

    Promise.all(
      entradas.map((e) =>
        servicioPropiedades.obtenerPorId(e.propiedadId).catch((err) => {
          // 404 = la propiedad ya no existe, se omite en silencio. Cualquier
          // otro error (red/servidor caído) se trata distinto más abajo.
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status !== 404) huboErrorRed = true;
          return null;
        }),
      ),
    ).then((resultados) => {
      if (cancelado) return;
      const map = new Map<string, Propiedad>();
      resultados.forEach((p) => {
        if (p) map.set(p.id, p);
      });
      if (huboErrorRed && map.size === 0) {
        setError(true);
      } else {
        setError(false);
        if (huboErrorRed) {
          notify.error(null, 'Algunos cuartos de tu historial no se pudieron cargar.');
        }
      }
      setPropiedades(map);
      setCargando(false);
    });

    return () => {
      cancelado = true;
    };
  }, [entradas, hidratado, intento]);

  const reintentar = () => {
    setCargando(true);
    setError(false);
    setIntento((i) => i + 1);
  };

  // Quita una entrada individual con opción de deshacer. `entrada` se captura
  // completa (con su `visitadoEn` original) antes de removerla: si el usuario
  // deshace, se reinserta tal cual en vez de pasar por `registrar` (que
  // pisaría el timestamp con la hora actual).
  const handleRemove = (
    e: React.MouseEvent,
    entrada: HistorialEntry,
    titulo: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    remover(entrada.propiedadId);
    toast(`"${titulo}" quitado del historial`, {
      duration: 5000,
      action: {
        label: 'Deshacer',
        onClick: () => {
          useHistoryStore.setState((state) => {
            if (state.entradas.some((x) => x.propiedadId === entrada.propiedadId)) return state;
            return {
              entradas: [...state.entradas, entrada].sort((a, b) => b.visitadoEn - a.visitadoEn),
            };
          });
        },
      },
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-h1">
            Historial
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Los últimos cuartos que visitaste.
          </p>
        </div>

        {entradas.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-xs font-bold text-muted-foreground hover:text-primary">
                <Trash2 className="size-4" /> Limpiar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Limpiar historial?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se borrarán los {entradas.length} cuartos guardados localmente. Tus favoritos no se verán afectados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={limpiar}>Limpiar todo</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </header>

      {mostrarCargando ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="No pudimos cargar tu historial"
          description="Algo salió mal al recuperar los cuartos que visitaste."
          onRetry={reintentar}
        />
      ) : entradas.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="Aún no visitaste ningún cuarto"
          description="Cada cuarto que abras aparecerá aquí para volver a verlo cuando quieras."
          action={{ type: 'link', label: 'Explorar cuartos', href: '/search' }}
        />
      ) : (
        <ul className="space-y-3">
          {entradas.map((e) => {
            const p = propiedades.get(e.propiedadId);
            if (!p) return null;
            const distancia = distanciaAUpeuKm(p.coordenadas);
            return (
              <li key={e.propiedadId} className="group relative">
                <button
                  type="button"
                  onClick={(ev) => handleRemove(ev, e, p.titulo)}
                  aria-label={`Quitar ${p.titulo} del historial`}
                  className="absolute right-4 top-4 z-10 flex size-7 items-center justify-center rounded-full bg-white/95 text-muted-foreground opacity-0 shadow-md backdrop-blur-md transition-all hover:scale-110 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
                <Link
                  href={`/property/${p.id}`}
                  className="flex gap-4 overflow-hidden rounded-2xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-28">
                    <Image
                      fill
                      sizes="112px"
                      src={p.imagenes[0] ?? '/rooms/placeholder.jpg'}
                      alt={p.titulo}
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <h3 className="line-clamp-1 text-sm font-bold text-foreground sm:text-base">
                        {p.titulo}
                      </h3>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3.5" /> {p.ubicacion}
                        {distancia !== null && (
                          <>
                            <span aria-hidden>·</span>
                            <span className="font-semibold text-primary">
                              a {formatearDistancia(distancia)}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="tnum text-base font-black text-primary">
                        {formatPEN(p.precio)}
                        <span className="ml-1 text-[10px] font-normal text-muted-foreground">/mes</span>
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {tiempoRelativo(e.visitadoEn)}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
