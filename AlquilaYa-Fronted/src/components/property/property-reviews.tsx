'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

import {
  resenaService,
  type Resena,
  type ResumenCategorias,
} from '@/services/resena-service';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { formatearFecha } from '@/lib/relative-time';

const CATEGORIAS: { key: keyof ResumenCategorias; label: string }[] = [
  { key: 'limpieza', label: 'Limpieza' },
  { key: 'ubicacion', label: 'Ubicación' },
  { key: 'precio', label: 'Precio' },
  { key: 'trato', label: 'Trato' },
];

interface Props {
  propiedadId: string;
  calificacion: number;
  totalResenas: number;
}

export function PropertyReviews({ propiedadId, calificacion, totalResenas }: Props) {
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [resumen, setResumen] = useState<ResumenCategorias | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    resenaService
      .getResenasPorPropiedad(propiedadId)
      .then((data) => {
        if (!cancelado) setResenas(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    resenaService
      .getResumenCategorias(propiedadId)
      .then((data) => {
        if (!cancelado) setResumen(data);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [propiedadId]);

  const categoriasConDatos = CATEGORIAS.filter(
    (c) => resumen?.[c.key] != null,
  );

  const distribucion = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: resenas.filter((r) => Math.round(r.calificacion) === stars).length,
  }));
  const maxCount = Math.max(...distribucion.map((d) => d.count), 1);

  return (
    <section className="space-y-6">
      <h2 className="text-h2">Reseñas</h2>

      {totalResenas > 0 && (
        <div className="flex gap-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-col items-center justify-center gap-1.5">
            <p className="text-4xl font-black text-foreground">{calificacion.toFixed(1)}</p>
            <StarRow value={calificacion} />
            <p className="text-xs text-muted-foreground">{totalResenas} reseñas</p>
          </div>
          {!cargando && resenas.length > 0 && (
            <div className="flex flex-1 flex-col justify-center gap-1.5">
              {distribucion.map(({ stars, count }) => (
                <div key={stars} className="flex items-center gap-2">
                  <span className="w-3 text-right text-[11px] text-muted-foreground">{stars}</span>
                  <Star className="size-3 shrink-0 fill-warning text-warning" aria-hidden />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-warning transition-all duration-500"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-4 text-[11px] text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Desglose por sub-categoría */}
      {categoriasConDatos.length > 0 && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-4">
          {categoriasConDatos.map((c) => {
            const valor = resumen![c.key]!;
            return (
              <div key={c.key} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                  <span className="text-xs font-bold text-foreground">{valor.toFixed(1)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-warning transition-all duration-500"
                    style={{ width: `${(valor / 5) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cargando ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2 rounded-2xl border border-border p-5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : resenas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {totalResenas > 0
            ? 'No se pudieron cargar las reseñas.'
            : 'Aún no hay reseñas para este cuarto.'}
        </p>
      ) : (
        <div className="space-y-4">
          {resenas.map((r) => (
            <div key={r.id} className="space-y-3 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {r.autorNombre?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {r.autorNombre ?? 'Estudiante'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatearFecha(r.fechaCreacion)}
                    </p>
                  </div>
                </div>
                <StarRow value={r.calificacion} />
              </div>
              {r.comentario && (
                <p className="text-sm leading-relaxed text-muted-foreground">{r.comentario}</p>
              )}
              {r.respuestaArrendador && (
                <div className="ml-3 rounded-xl border-l-2 border-primary/40 bg-muted/40 p-3">
                  <p className="text-[11px] font-bold text-primary">Respuesta del arrendador</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                    {r.respuestaArrendador}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            'size-3.5',
            s <= Math.round(value)
              ? 'fill-warning text-warning'
              : 'fill-muted text-muted-foreground/30',
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}
