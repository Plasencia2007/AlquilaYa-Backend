'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { History as HistoryIcon, MapPin, Trash2 } from 'lucide-react';

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
import { useHistory } from '@/hooks/use-history';
import { servicioPropiedades } from '@/services/property-service';
import { tiempoRelativo } from '@/lib/relative-time';
import { distanciaAUpeuKm, formatearDistancia } from '@/lib/geo';
import type { Propiedad } from '@/types/propiedad';

export default function StudentHistoryPage() {
  const { entradas, hidratado, limpiar } = useHistory();
  const [propiedades, setPropiedades] = useState<Map<string, Propiedad>>(new Map());
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!hidratado) return;
    if (entradas.length === 0) {
      setCargando(false);
      setPropiedades(new Map());
      return;
    }

    let cancelado = false;
    setCargando(true);

    Promise.all(
      entradas.map((e) =>
        servicioPropiedades.obtenerPorId(e.propiedadId).catch(() => null),
      ),
    ).then((resultados) => {
      if (cancelado) return;
      const map = new Map<string, Propiedad>();
      resultados.forEach((p) => {
        if (p) map.set(p.id, p);
      });
      setPropiedades(map);
      setCargando(false);
    });

    return () => {
      cancelado = true;
    };
  }, [entradas, hidratado]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
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

      {!hidratado || cargando ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
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
              <li key={e.propiedadId}>
                <Link
                  href={`/property/${p.id}`}
                  className="group flex gap-4 overflow-hidden rounded-2xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
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
                      <p className="text-base font-black text-primary">
                        S/ {p.precio.toLocaleString('es-PE')}
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
