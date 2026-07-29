'use client';

import { useEffect, useState } from 'react';
import { Quote } from 'lucide-react';

import { resenaService, type Testimonio } from '@/services/resena-service';
import { Rating } from '@/components/ui/rating';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Stagger } from '@/components/motion';

/**
 * Prueba social de la home (#85): carrusel/grid de reseñas destacadas REALES
 * (rating alto + comentario), traídas del backend ya anonimizadas (nombre parcial
 * + carrera; nunca PII).
 *
 * Es una sección OPCIONAL: si el fetch falla, aún está cargando, o no hay reseñas
 * destacadas, renderiza `null` — nunca una sección vacía ni un bloque de error en
 * medio de la home.
 */
export function Testimonials() {
  const [testimonios, setTestimonios] = useState<Testimonio[] | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    resenaService
      .getDestacadas(5)
      .then((data) => {
        if (!cancelado) setTestimonios(data);
      })
      .catch(() => {
        if (!cancelado) setFallo(true);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (fallo || !testimonios || testimonios.length === 0) return null;

  return (
    <section className="bg-background px-6 py-16 sm:px-12 md:py-24">
      <header className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
        <span className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">
          <span className="h-px w-8 bg-primary" aria-hidden />
          Historias reales
        </span>
        <h2 className="text-3xl font-extrabold leading-tight tracking-tighter text-foreground md:text-5xl">
          Lo que dicen los estudiantes
        </h2>
        <p className="mt-3 text-sm text-muted-foreground md:text-base">
          Reseñas verificadas de quienes ya encontraron su cuarto cerca de la UPeU.
        </p>
      </header>

      <Stagger className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {testimonios.map((t) => (
          <article
            key={t.id}
            className="flex h-full flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-card"
          >
            <div className="flex items-center justify-between">
              <Rating mode="readonly" value={t.calificacion} size="sm" />
              <Quote className="size-6 shrink-0 text-primary/20" aria-hidden />
            </div>

            <p className="flex-1 text-sm leading-relaxed text-foreground/90">
              &ldquo;{t.comentario}&rdquo;
            </p>

            <div className="mt-auto flex items-center gap-3 border-t border-border pt-4">
              <UserAvatar nombre={t.autor} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{t.autor}</p>
                {t.carrera && (
                  <p className="truncate text-xs text-muted-foreground">{t.carrera}</p>
                )}
              </div>
            </div>
          </article>
        ))}
      </Stagger>
    </section>
  );
}
