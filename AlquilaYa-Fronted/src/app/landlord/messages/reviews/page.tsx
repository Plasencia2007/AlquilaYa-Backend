'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { tiempoRelativo } from '@/lib/relative-time';
import { reservationService } from '@/services/reservation-service';
import { reviewsService } from '@/services/reviews-service';
import type { Reserva } from '@/types/reserva';
import type { Resena } from '@/types/review';

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
];

function avatarColor(nombre: string) {
  const code = nombre.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[code];
}

function Estrellas({ valor, size = 'sm' }: { valor: number; size?: 'sm' | 'md' }) {
  const px = size === 'md' ? 'text-[22px]' : 'text-[15px]';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`material-symbols-outlined ${px} transition-colors ${
            i <= Math.round(valor) ? 'text-amber-400' : 'text-on-surface/15'
          }`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          star
        </span>
      ))}
    </div>
  );
}

function SelectorEstrellas({ valor, onChange }: { valor: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <span
            className={`material-symbols-outlined text-[28px] transition-colors ${
              i <= (hover || valor) ? 'text-amber-400' : 'text-on-surface/15'
            }`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            star
          </span>
        </button>
      ))}
    </div>
  );
}

interface EstudianteParaResenar {
  estudianteId: string;
  nombre: string;
}

/* ─── Tab: Reseñas recibidas ─────────────────────────────────────────── */

function TabRecibidasContent({
  resenas,
  cargando,
  error,
  promedio,
}: {
  resenas: Resena[];
  cargando: boolean;
  error: string | null;
  promedio: number;
}) {
  const reputacionMsg =
    promedio >= 4.5
      ? '¡Excelente! Tu hospitalidad destaca.'
      : promedio >= 3.5
        ? 'Buena valoración. Sigue cuidando los detalles.'
        : 'Identifica áreas de mejora con tus reseñas.';

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Calificación media */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-6 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 to-transparent pointer-events-none" />
          <p className="text-[3.5rem] font-black text-blue-500 leading-none tabular-nums">
            {promedio > 0 ? promedio.toFixed(1) : '—'}
          </p>
          <div className="mt-2 mb-3">
            <Estrellas valor={promedio} size="md" />
          </div>
          <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.18em]">
            Calificación media
          </p>
        </div>

        {/* Total reseñas */}
        <div className="rounded-2xl border border-on-surface/8 bg-white p-6 flex flex-col items-center justify-center text-center shadow-sm">
          <p className="text-[3.5rem] font-black text-on-surface/80 leading-none tabular-nums">
            {resenas.length}
          </p>
          <div className="mt-2 mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-on-surface/30 text-[18px]">
              chat_bubble
            </span>
            <span className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.18em]">
              Reseñas totales
            </span>
          </div>
        </div>

        {/* Reputación */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 flex flex-col items-center justify-center text-center text-white shadow-sm shadow-blue-200">
          <span className="material-symbols-outlined text-white/60 text-[28px] mb-2">
            workspace_premium
          </span>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">
            Tu Reputación
          </p>
          <p className="text-sm font-semibold leading-snug opacity-90">{reputacionMsg}</p>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-on-surface/50 uppercase tracking-widest">
            Comentarios recientes
          </h3>
          {resenas.length > 0 && (
            <span className="text-[11px] font-bold text-on-surface/30">
              {resenas.length} reseña{resenas.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {cargando && (
          <div className="rounded-2xl border border-on-surface/8 bg-white p-8 text-sm text-center text-on-surface/40">
            <span className="material-symbols-outlined text-[32px] mb-2 block animate-spin">
              progress_activity
            </span>
            Cargando reseñas…
          </div>
        )}

        {error && !cargando && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-500 flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px]">error</span>
            {error}
          </div>
        )}

        {!cargando && !error && resenas.length === 0 && (
          <div className="rounded-2xl border border-dashed border-on-surface/10 bg-white/60 p-10 flex flex-col items-center text-center gap-3">
            <span className="material-symbols-outlined text-[40px] text-on-surface/20">
              reviews
            </span>
            <p className="text-sm font-medium text-on-surface/40">
              Aún no tienes reseñas de estudiantes.
            </p>
          </div>
        )}

        {resenas.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-on-surface/8 bg-white p-5 shadow-sm space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full ${avatarColor(r.estudianteNombre ?? '?')} flex items-center justify-center text-white text-sm font-black flex-shrink-0`}
                >
                  {(r.estudianteNombre ?? '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface/90 leading-none">
                    {r.estudianteNombre ?? 'Estudiante'}
                  </p>
                  <p className="text-[11px] text-on-surface/35 mt-0.5">
                    {tiempoRelativo(r.fechaCreacion)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full flex-shrink-0">
                <span
                  className="material-symbols-outlined text-amber-400 text-[13px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
                <span className="text-[12px] font-black text-amber-500">{r.rating}</span>
              </div>
            </div>

            {r.comentario && (
              <p className="text-[13px] text-on-surface/65 leading-relaxed italic border-l-[3px] border-blue-100 pl-4 py-0.5">
                &ldquo;{r.comentario}&rdquo;
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Tab: Reseñar estudiante ─────────────────────────────────────────── */

function FormResenaEstudiante({
  estudiante,
  onEnviado,
}: {
  estudiante: EstudianteParaResenar;
  onEnviado: (id: string) => void;
}) {
  const [rating, setRating] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleEnviar = async () => {
    if (rating === 0) { setErrorMsg('Selecciona una calificación.'); return; }
    setEnviando(true);
    setErrorMsg(null);
    try {
      await reviewsService.crearResenaEstudiante(estudiante.estudianteId, rating, comentario);
      setEnviado(true);
      onEnviado(estudiante.estudianteId);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 400 || status === 409) {
        setErrorMsg('Ya has reseñado a este estudiante.');
        setEnviado(true);
      } else {
        setErrorMsg('No se pudo enviar la reseña. Intenta de nuevo.');
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="rounded-2xl border border-on-surface/8 bg-white p-5 shadow-sm space-y-4">
      {/* Cabecera estudiante */}
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-full ${avatarColor(estudiante.nombre)} flex items-center justify-center text-white text-sm font-black flex-shrink-0`}
        >
          {estudiante.nombre.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-bold text-on-surface/90">{estudiante.nombre}</p>
          <p className="text-[11px] text-on-surface/35">Reserva finalizada</p>
        </div>
      </div>

      {enviado && !errorMsg ? (
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span className="text-sm font-semibold">Reseña enviada correctamente.</span>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-on-surface/40 uppercase tracking-widest">
              Calificación
            </p>
            <SelectorEstrellas valor={rating} onChange={setRating} />
          </div>

          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Escribe un comentario sobre este estudiante (opcional)…"
            className="w-full text-sm border border-on-surface/10 bg-on-surface/3 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-300 text-on-surface placeholder:text-on-surface/30 transition"
          />

          {errorMsg && (
            <p className="text-xs text-red-500 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">error</span>
              {errorMsg}
            </p>
          )}

          <button
            type="button"
            disabled={enviando || rating === 0}
            onClick={handleEnviar}
            className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-sm font-bold disabled:opacity-35 disabled:cursor-not-allowed transition-all shadow-sm shadow-blue-200"
          >
            {enviando ? 'Enviando…' : 'Enviar reseña'}
          </button>
        </>
      )}

      {enviado && errorMsg && (
        <p className="text-xs text-red-500 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {errorMsg}
        </p>
      )}
    </div>
  );
}

function TabEnviarContent() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yaResenados, setYaResenados] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    reservationService
      .listarComoArrendador('FINALIZADA')
      .then((data) => { if (!cancelado) setReservas(data); })
      .catch(() => { if (!cancelado) setError('No se pudieron cargar las reservas finalizadas.'); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, []);

  const estudiantesUnicos = useMemo<EstudianteParaResenar[]>(() => {
    const vistos = new Set<string>();
    const resultado: EstudianteParaResenar[] = [];
    for (const r of reservas) {
      if (!vistos.has(r.estudianteId)) {
        vistos.add(r.estudianteId);
        resultado.push({
          estudianteId: r.estudianteId,
          nombre: r.estudianteNombre ?? `Estudiante #${r.estudianteId}`,
        });
      }
    }
    return resultado;
  }, [reservas]);

  const pendientes = estudiantesUnicos.filter((e) => !yaResenados.has(e.estudianteId));

  if (cargando) {
    return (
      <div className="rounded-2xl border border-on-surface/8 bg-white p-10 text-sm text-center text-on-surface/40 space-y-2">
        <span className="material-symbols-outlined text-[32px] block animate-spin">
          progress_activity
        </span>
        Cargando estudiantes…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-500 flex items-center gap-3">
        <span className="material-symbols-outlined text-[20px]">error</span>
        {error}
      </div>
    );
  }

  if (pendientes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-on-surface/10 bg-white/60 p-10 flex flex-col items-center text-center gap-3">
        <span className="material-symbols-outlined text-[40px] text-on-surface/20">
          how_to_reg
        </span>
        <p className="text-sm font-medium text-on-surface/40">
          {estudiantesUnicos.length === 0
            ? 'No tienes reservas finalizadas para reseñar.'
            : 'Ya has reseñado a todos tus estudiantes.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold text-on-surface/35 uppercase tracking-widest">
        {pendientes.length} estudiante{pendientes.length !== 1 ? 's' : ''} pendiente
        {pendientes.length !== 1 ? 's' : ''}
      </p>
      {pendientes.map((est) => (
        <FormResenaEstudiante
          key={est.estudianteId}
          estudiante={est}
          onEnviado={(id) => setYaResenados((prev) => new Set([...prev, id]))}
        />
      ))}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */

export default function LandlordReviewsPage() {
  const { usuario } = useAuth();
  const arrendadorId = usuario?.perfilId;

  const [resenas, setResenas] = useState<Resena[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'recibidas' | 'enviar'>('recibidas');

  useEffect(() => {
    if (!arrendadorId) return;
    let cancelado = false;
    setCargando(true);
    reviewsService
      .listarResenasArrendador(arrendadorId)
      .then((data) => { if (!cancelado) setResenas(data); })
      .catch(() => { if (!cancelado) setError('No se pudieron cargar las reseñas.'); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [arrendadorId]);

  const promedio = useMemo(() => {
    if (resenas.length === 0) return 0;
    return resenas.reduce((acc, r) => acc + (r.rating ?? 0), 0) / resenas.length;
  }, [resenas]);

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Reputación y Reseñas
          </h1>
          <p className="text-[12px] text-on-surface/45 font-medium mt-1">
            Lo que los estudiantes opinan sobre tu hospitalidad.
          </p>
        </div>
        {resenas.length > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-full px-3 py-1.5 flex-shrink-0">
            <span
              className="material-symbols-outlined text-amber-400 text-[14px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            <span className="text-sm font-black text-amber-500">{promedio.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="inline-flex bg-on-surface/5 rounded-full p-1 gap-1">
        {(['recibidas', 'enviar'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
              activeTab === tab
                ? 'bg-white text-on-surface shadow-sm shadow-on-surface/10'
                : 'text-on-surface/45 hover:text-on-surface/70'
            }`}
          >
            {tab === 'recibidas' ? 'Reseñas recibidas' : 'Reseñar estudiante'}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {activeTab === 'recibidas' && (
        <TabRecibidasContent
          resenas={resenas}
          cargando={cargando}
          error={error}
          promedio={promedio}
        />
      )}
      {activeTab === 'enviar' && <TabEnviarContent />}
    </div>
  );
}
