'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { tiempoRelativo } from '@/lib/relative-time';
import { reservationService } from '@/services/reservation-service';
import { reviewsService } from '@/services/reviews-service';
import { propiedadService } from '@/services/landlord-property-service';
import {
  resenaService,
  type ResumenCategorias,
  type Resena as ResenaPropiedad,
} from '@/services/resena-service';
import { notify } from '@/lib/notify';
import type { Reserva } from '@/types/reserva';
import type { Resena } from '@/types/review';

const CATEGORIAS_RESENA: { key: keyof ResumenCategorias; label: string }[] = [
  { key: 'limpieza', label: 'Limpieza' },
  { key: 'ubicacion', label: 'Ubicación' },
  { key: 'precio', label: 'Precio' },
  { key: 'trato', label: 'Trato' },
];

const AVATAR_COLORS = [
  'bg-primary',
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
            i <= Math.round(valor) ? 'text-amber-400' : 'text-foreground/15'
          }`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          star
        </span>
      ))}
    </div>
  );
}

function SelectorEstrellas({
  valor,
  onChange,
  describedBy,
}: {
  valor: number;
  onChange: (v: number) => void;
  /** Ítem 406: id del mensaje de error (p.ej. "Selecciona una calificación") a linkear aquí. */
  describedBy?: string;
}) {
  const [hover, setHover] = useState(0);
  return (
    // Los botones solo tenían un ícono sin texto — sin `aria-label` un lector de pantalla no
    // anunciaba nada útil. `role="group"` + `aria-label` describe el conjunto; cada botón
    // ahora dice qué calificación aplica y `aria-pressed` refleja la selección actual.
    <div className="flex gap-1" role="group" aria-label="Calificación" aria-describedby={describedBy}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          aria-label={`${i} ${i === 1 ? 'estrella' : 'estrellas'}`}
          aria-pressed={i <= valor}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <span
            className={`material-symbols-outlined text-[28px] transition-colors ${
              i <= (hover || valor) ? 'text-amber-400' : 'text-foreground/15'
            }`}
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden
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
        <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-white p-6 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-transparent pointer-events-none" />
          <p className="text-[3.5rem] font-black text-primary leading-none tabular-nums">
            {promedio > 0 ? promedio.toFixed(1) : '—'}
          </p>
          <div className="mt-2 mb-3">
            <Estrellas valor={promedio} size="md" />
          </div>
          <p className="text-[10px] font-bold text-primary/80 uppercase tracking-[0.18em]">
            Calificación media
          </p>
        </div>

        {/* Total reseñas */}
        <div className="rounded-2xl border border-border bg-white p-6 flex flex-col items-center justify-center text-center shadow-sm">
          <p className="text-[3.5rem] font-black text-foreground/80 leading-none tabular-nums">
            {resenas.length}
          </p>
          <div className="mt-2 mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-foreground/30 text-[18px]">
              chat_bubble
            </span>
            <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.18em]">
              Reseñas totales
            </span>
          </div>
        </div>

        {/* Reputación */}
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary p-6 flex flex-col items-center justify-center text-center text-white shadow-sm shadow-primary/20">
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
          <h3 className="text-sm font-bold text-foreground/50 uppercase tracking-widest">
            Comentarios recientes
          </h3>
          {resenas.length > 0 && (
            <span className="text-[11px] font-bold text-foreground/30">
              {resenas.length} reseña{resenas.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {cargando && (
          <div className="rounded-2xl border border-border bg-white p-8 text-sm text-center text-foreground/40">
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
          <div className="rounded-2xl border border-dashed border-border bg-white/60 p-10 flex flex-col items-center text-center gap-3">
            <span className="material-symbols-outlined text-[40px] text-foreground/20">
              reviews
            </span>
            <p className="text-sm font-medium text-foreground/40">
              Aún no tienes reseñas de estudiantes.
            </p>
          </div>
        )}

        {resenas.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full ${avatarColor(r.estudianteNombre ?? '?')} flex items-center justify-center text-white text-sm font-black flex-shrink-0`}
                >
                  {(r.estudianteNombre ?? '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground/90 leading-none">
                    {r.estudianteNombre ?? 'Estudiante'}
                  </p>
                  <p className="text-[11px] text-foreground/35 mt-0.5">
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
              <p className="text-[13px] text-foreground/65 leading-relaxed italic border-l-[3px] border-primary/10 pl-4 py-0.5">
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
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-4">
      {/* Cabecera estudiante */}
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-full ${avatarColor(estudiante.nombre)} flex items-center justify-center text-white text-sm font-black flex-shrink-0`}
        >
          {estudiante.nombre.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-bold text-foreground/90">{estudiante.nombre}</p>
          <p className="text-[11px] text-foreground/35">Reserva finalizada</p>
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
            <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
              Calificación
            </p>
            <SelectorEstrellas
              valor={rating}
              onChange={setRating}
              describedBy={errorMsg ? 'resena-error' : undefined}
            />
          </div>

          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Escribe un comentario sobre este estudiante (opcional)…"
            className="w-full text-sm border border-border bg-foreground/3 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 text-foreground placeholder:text-foreground/30 transition"
          />

          {errorMsg && (
            <p id="resena-error" role="alert" className="text-xs text-red-500 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]" aria-hidden>error</span>
              {errorMsg}
            </p>
          )}

          <button
            type="button"
            disabled={enviando || rating === 0}
            onClick={handleEnviar}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary active:scale-95 text-white text-sm font-bold disabled:opacity-35 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary/20"
          >
            {enviando ? 'Enviando…' : 'Enviar reseña'}
          </button>
        </>
      )}

      {enviado && errorMsg && (
        // Nota: esta rama es redundante con el <p id="resena-error"> de arriba — cuando
        // enviado && errorMsg son ambos true, el ternario de arriba ya renderiza la rama del
        // formulario (no la de éxito) y ESA rama ya muestra `errorMsg`. Es un bug preexistente
        // de duplicado, ajeno al alcance de accesibilidad de este cambio — no se toca la
        // lógica, solo se le da un id propio (no "resena-error") para no duplicar el id si
        // ambos llegan a montarse a la vez.
        <p id="resena-error-duplicado" role="alert" className="text-xs text-red-500 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px]" aria-hidden>error</span>
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
    // `cargando` ya arranca en `true` (useState(true)) y este efecto solo corre una vez
    // al montar ([] deps) — llamar setCargando(true) aquí sería un no-op redundante.
    let cancelado = false;
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
      <div className="rounded-2xl border border-border bg-white p-10 text-sm text-center text-foreground/40 space-y-2">
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
      <div className="rounded-2xl border border-dashed border-border bg-white/60 p-10 flex flex-col items-center text-center gap-3">
        <span className="material-symbols-outlined text-[40px] text-foreground/20">
          how_to_reg
        </span>
        <p className="text-sm font-medium text-foreground/40">
          {estudiantesUnicos.length === 0
            ? 'No tienes reservas finalizadas para reseñar.'
            : 'Ya has reseñado a todos tus estudiantes.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold text-foreground/35 uppercase tracking-widest">
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

/* ─── Reseñas de propiedades + respuesta del arrendador ────────────────────── */

function ReseñaConRespuesta({
  propiedadTitulo,
  resena,
}: {
  propiedadTitulo: string;
  resena: ResenaPropiedad;
}) {
  const [guardada, setGuardada] = useState(resena.respuestaArrendador ?? '');
  const [borrador, setBorrador] = useState(resena.respuestaArrendador ?? '');
  const [editando, setEditando] = useState(!resena.respuestaArrendador);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await resenaService.responderResenaPropiedad(resena.id, borrador.trim());
      const texto = r.respuestaArrendador ?? '';
      setGuardada(texto);
      setBorrador(texto);
      setEditando(texto === '');
      notify.success(texto ? 'Respuesta publicada' : 'Respuesta eliminada');
    } catch (err) {
      notify.error(err, 'No se pudo guardar la respuesta');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-foreground/55 truncate">{propiedadTitulo}</span>
        <Estrellas valor={resena.calificacion} />
      </div>
      <p className="text-[11px] text-foreground/40">
        {resena.autorNombre ?? 'Estudiante'}
        {resena.comentario ? '' : ' · sin comentario'}
      </p>
      {resena.comentario && <p className="text-sm text-foreground/70">{resena.comentario}</p>}

      {!editando && guardada ? (
        <div className="rounded-xl border-l-2 border-primary/40 bg-muted/50 p-3">
          <p className="text-[11px] font-bold text-primary">Tu respuesta</p>
          <p className="mt-0.5 text-sm text-foreground/70">{guardada}</p>
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="mt-1 text-[11px] font-bold text-primary hover:underline"
          >
            Editar
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={borrador}
            onChange={(e) => setBorrador(e.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="Responde públicamente a esta reseña…"
            className="w-full rounded-xl border border-border bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={guardar}
              disabled={guardando || borrador.trim() === ''}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground transition-opacity disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : guardada ? 'Actualizar' : 'Responder'}
            </button>
            {guardada && (
              <button
                type="button"
                onClick={() => {
                  setBorrador(guardada);
                  setEditando(false);
                }}
                className="text-xs font-bold text-foreground/50 hover:text-foreground/70"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface PropiedadConResenas {
  id: number;
  titulo: string;
  reviews: ResenaPropiedad[];
  resumen: ResumenCategorias;
}

/**
 * Trae las propiedades del arrendador y sus reseñas UNA sola vez, y muestra: (a) el
 * desglose por categoría (ítem 336: resumen ya promediado por el backend vía
 * `GET /resenas/propiedad/{id}/resumen`, no en el cliente) y (b) la lista de reseñas con
 * editor de respuesta. Reemplaza a dos componentes que hacían fetch por separado (anti N+1 doble).
 */
function PropiedadesResenasPanel({ arrendadorId }: { arrendadorId: number | string }) {
  const [data, setData] = useState<PropiedadConResenas[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const props = await propiedadService.obtenerPorArrendador(String(arrendadorId));
        const conResenas = await Promise.all(
          props.map(async (p) => {
            const [reviews, resumen] = await Promise.all([
              resenaService.getResenasPorPropiedad(p.id).catch(() => [] as ResenaPropiedad[]),
              resenaService
                .getResumenCategorias(p.id)
                .catch(() => ({ limpieza: null, ubicacion: null, precio: null, trato: null } as ResumenCategorias)),
            ]);
            return { id: p.id, titulo: p.titulo, reviews, resumen };
          }),
        );
        if (!cancelado) setData(conResenas.filter((p) => p.reviews.length > 0));
      } catch {
        /* silencio: sección secundaria */
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [arrendadorId]);

  if (cargando || data.length === 0) return null;

  const flat = data.flatMap((p) =>
    p.reviews.map((resena) => ({ propiedadTitulo: p.titulo, resena })),
  );
  const conCategorias = data.filter((p) => CATEGORIAS_RESENA.some((c) => p.resumen[c.key] != null));

  return (
    <div className="space-y-6">
      {conCategorias.length > 0 && (
        <div className="space-y-4 rounded-2xl border border-border bg-white p-5">
          <div>
            <h3 className="text-sm font-black text-foreground">Tus propiedades por categoría</h3>
            <p className="text-[11px] text-foreground/45">
              Promedio que dejan los estudiantes en cada aspecto. Útil para saber qué mejorar.
            </p>
          </div>
          <div className="space-y-4">
            {conCategorias.map((p) => (
              <div key={p.id} className="space-y-2">
                <p className="text-xs font-bold text-foreground/80 truncate">{p.titulo}</p>
                <div className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-4">
                  {CATEGORIAS_RESENA.filter((c) => p.resumen[c.key] != null).map((c) => {
                    const valor = p.resumen[c.key]!;
                    return (
                      <div key={c.key} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-foreground/55">{c.label}</span>
                          <span className="text-[11px] font-bold text-foreground">
                            {valor.toFixed(1)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-amber-400 transition-all duration-500"
                            style={{ width: `${(valor / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-black text-foreground">Reseñas de tus propiedades</h3>
          <p className="text-[11px] text-foreground/45">
            Responde públicamente — tu respuesta aparece bajo la reseña en la ficha.
          </p>
        </div>
        {flat.map(({ propiedadTitulo, resena }) => (
          <ReseñaConRespuesta key={resena.id} propiedadTitulo={propiedadTitulo} resena={resena} />
        ))}
      </div>
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
    // `cargando` ya arranca en `true`; `arrendadorId` solo pasa de undefined a un valor
    // real una vez (hidratación del auth-store), así que cuando este efecto corre por
    // primera vez `cargando` sigue en `true` — setCargando(true) aquí sería redundante.
    let cancelado = false;
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
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-2 duration-400">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            Reputación y Reseñas
          </h1>
          <p className="text-[12px] text-foreground/45 font-medium mt-1">
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
      <div className="inline-flex bg-muted rounded-full p-1 gap-1">
        {(['recibidas', 'enviar'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
              activeTab === tab
                ? 'bg-white text-foreground shadow-sm shadow-foreground/10'
                : 'text-foreground/45 hover:text-foreground/70'
            }`}
          >
            {tab === 'recibidas' ? 'Reseñas recibidas' : 'Reseñar estudiante'}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {activeTab === 'recibidas' && (
        <div className="space-y-6">
          {arrendadorId && <PropiedadesResenasPanel arrendadorId={arrendadorId} />}
          <TabRecibidasContent
            resenas={resenas}
            cargando={cargando}
            error={error}
            promedio={promedio}
          />
        </div>
      )}
      {activeTab === 'enviar' && <TabEnviarContent />}
    </div>
  );
}
