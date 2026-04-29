'use client';

import { useEffect, useMemo, useState } from 'react';

import { Card } from '@/components/ui/legacy-card';
import { useAuth } from '@/hooks/use-auth';
import { tiempoRelativo } from '@/lib/relative-time';
import { reviewsService } from '@/services/reviews-service';
import type { Resena } from '@/types/review';

function Estrellas({ valor }: { valor: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`material-symbols-outlined text-[18px] ${
            i <= Math.round(valor) ? 'text-blue-500' : 'text-on-surface/20'
          }`}
        >
          star
        </span>
      ))}
    </div>
  );
}

export default function LandlordReviewsPage() {
  const { usuario } = useAuth();
  const arrendadorId = usuario?.perfilId;

  const [resenas, setResenas] = useState<Resena[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!arrendadorId) return;
    let cancelado = false;
    setCargando(true);
    reviewsService
      .listarResenasArrendador(arrendadorId)
      .then((data) => {
        if (!cancelado) setResenas(data);
      })
      .catch(() => {
        if (!cancelado) setError('No se pudieron cargar las reseñas.');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [arrendadorId]);

  const promedio = useMemo(() => {
    if (resenas.length === 0) return 0;
    return resenas.reduce((acc, r) => acc + (r.rating ?? 0), 0) / resenas.length;
  }, [resenas]);

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-black text-on-surface tracking-tighter opacity-90">
          Reputación y Reseñas
        </h1>
        <p className="text-on-surface-variant text-[12px] font-medium mt-0.5 tracking-tight">
          Lo que los estudiantes opinan sobre tu hospitalidad.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-on-surface/5 border-none p-6 flex flex-col items-center justify-center text-center">
          <p className="text-5xl font-black text-blue-500">{promedio.toFixed(1)}</p>
          <div className="flex gap-1 my-2">
            <Estrellas valor={promedio} />
          </div>
          <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
            Calificación Media
          </p>
        </Card>

        <Card className="bg-on-surface/5 border-none p-6 flex flex-col items-center justify-center text-center">
          <p className="text-5xl font-black text-orange-500">{resenas.length}</p>
          <div className="flex gap-1 my-2">
            <span className="material-symbols-outlined text-orange-500 text-[20px]">reviews</span>
          </div>
          <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
            Reseñas Totales
          </p>
        </Card>

        <Card className="bg-blue-500 p-6 flex flex-col items-center justify-center text-center text-white">
          <p className="text-sm font-black uppercase tracking-[0.2em] mb-2">Tu Reputación</p>
          <p className="text-xs font-medium opacity-80 leading-relaxed">
            {promedio >= 4.5
              ? '¡Excelente! Tu hospitalidad destaca entre los estudiantes.'
              : promedio >= 3.5
                ? 'Buena valoración general. Sigue cuidando los detalles.'
                : 'Identifica oportunidades de mejora con las reseñas recientes.'}
          </p>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-md font-black tracking-tight opacity-80">Comentarios Recientes</h3>
        {cargando && (
          <Card className="bg-white/40 border border-on-surface/5 p-6 text-sm text-on-surface-variant">
            Cargando reseñas…
          </Card>
        )}
        {error && (
          <Card className="bg-white/40 border border-on-surface/5 p-6 text-sm text-red-500">
            {error}
          </Card>
        )}
        {!cargando && !error && resenas.length === 0 && (
          <Card className="bg-white/40 border border-on-surface/5 p-6 text-sm text-on-surface-variant">
            Aún no tienes reseñas.
          </Card>
        )}
        <div className="space-y-4">
          {resenas.map((r) => (
            <Card
              key={r.id}
              variant="surface"
              className="border border-on-surface/5 bg-white/40 p-6 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-on-surface/10 flex items-center justify-center text-sm font-black">
                    {(r.estudianteNombre ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-black text-on-surface/90 text-sm leading-none">
                      {r.estudianteNombre ?? 'Estudiante'}
                    </h4>
                    <p className="text-[10px] text-on-surface-variant font-bold mt-1 opacity-70 italic">
                      {tiempoRelativo(r.fechaCreacion)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-on-surface/5 px-3 py-1 rounded-full">
                  <span className="text-[12px] font-black text-blue-500">{r.rating}</span>
                  <span className="material-symbols-outlined text-blue-500 text-[14px]">star</span>
                </div>
              </div>
              <p className="text-sm text-on-surface/80 font-medium leading-relaxed italic border-l-2 border-on-surface/10 pl-4 py-1">
                &ldquo;{r.comentario}&rdquo;
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
