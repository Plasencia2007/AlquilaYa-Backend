'use client';

import { useEffect, useState } from 'react';
import { Home } from 'lucide-react';

import { preguntaService, type Pregunta } from '@/services/pregunta-service';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { notify } from '@/lib/notify';
import { tiempoRelativo } from '@/lib/relative-time';

interface Props {
  propiedadId: number;
  arrendadorId: number;
}

/**
 * Q&A pública por propiedad (ítem 166): cualquier estudiante puede preguntar algo público
 * sobre la propiedad y el arrendador dueño responde también públicamente. Lista siempre
 * visible; el formulario de pregunta solo aparece para estudiantes autenticados y el
 * editor de respuesta inline solo para el arrendador dueño de la propiedad.
 */
export function PropertyQuestions({ propiedadId, arrendadorId }: Props) {
  const { usuario, estaAutenticado } = useAuth();
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nuevaPregunta, setNuevaPregunta] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    preguntaService
      .getPreguntas(propiedadId)
      .then((data) => {
        if (!cancelado) setPreguntas(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [propiedadId]);

  const esEstudiante = estaAutenticado && usuario?.rol === 'ESTUDIANTE';
  const esDueño = estaAutenticado && usuario?.rol === 'ARRENDADOR' && usuario?.perfilId === arrendadorId;

  const enviarPregunta = async () => {
    const texto = nuevaPregunta.trim();
    if (!texto) {
      notify.warning('Escribe tu pregunta antes de enviarla.');
      return;
    }
    setEnviando(true);
    try {
      const creada = await preguntaService.crearPregunta(propiedadId, texto);
      setPreguntas((prev) => [creada, ...prev]);
      setNuevaPregunta('');
      notify.success('Pregunta enviada', 'El arrendador podrá responderte públicamente.');
    } catch (err) {
      notify.error(err, 'No se pudo enviar la pregunta.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-h2">Preguntas y respuestas</h2>

      {cargando ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2 rounded-2xl border border-border p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : preguntas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay preguntas para este cuarto. ¡Sé el primero en preguntar!
        </p>
      ) : (
        <div className="space-y-3">
          {preguntas.map((p) => (
            <PreguntaItem
              key={p.id}
              pregunta={p}
              propiedadId={propiedadId}
              puedeResponder={esDueño && !p.respuesta}
              onRespondida={(actualizada) =>
                setPreguntas((prev) =>
                  prev.map((q) => (q.id === actualizada.id ? actualizada : q)),
                )
              }
            />
          ))}
        </div>
      )}

      {esEstudiante && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <label htmlFor="nueva-pregunta" className="text-sm font-semibold text-foreground">
            ¿Tienes una pregunta sobre esta propiedad?
          </label>
          <Textarea
            id="nueva-pregunta"
            value={nuevaPregunta}
            onChange={(e) => setNuevaPregunta(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Escribe tu pregunta… el arrendador la verá y podrá responderte públicamente."
          />
          <Button onClick={enviarPregunta} disabled={enviando || !nuevaPregunta.trim()}>
            {enviando ? 'Enviando…' : 'Preguntar'}
          </Button>
        </div>
      )}
    </section>
  );
}

function PreguntaItem({
  pregunta,
  propiedadId,
  puedeResponder,
  onRespondida,
}: {
  pregunta: Pregunta;
  propiedadId: number;
  puedeResponder: boolean;
  onRespondida: (p: Pregunta) => void;
}) {
  const [respondiendo, setRespondiendo] = useState(false);
  const [borrador, setBorrador] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviarRespuesta = async () => {
    const texto = borrador.trim();
    if (!texto) {
      notify.warning('Escribe una respuesta antes de enviarla.');
      return;
    }
    setEnviando(true);
    try {
      const actualizada = await preguntaService.responderPregunta(propiedadId, pregunta.id, texto);
      onRespondida(actualizada);
      setRespondiendo(false);
      notify.success('Respuesta publicada');
    } catch (err) {
      notify.error(err, 'No se pudo publicar la respuesta.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {pregunta.estudianteNombre?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 space-y-0.5">
          <p className="text-sm font-semibold text-foreground">{pregunta.estudianteNombre}</p>
          <p className="text-[11px] text-muted-foreground">{tiempoRelativo(pregunta.fechaCreacion)}</p>
          <p className="mt-1 text-sm text-foreground">{pregunta.pregunta}</p>
        </div>
      </div>

      {pregunta.respuesta ? (
        <div className="ml-11 rounded-xl border-l-2 border-primary/40 bg-muted/40 p-3">
          <div className="flex items-center gap-2">
            <p className="flex items-center gap-1 text-[11px] font-bold text-primary">
              <Home className="size-3" aria-hidden />
              Respuesta del arrendador
            </p>
            {pregunta.fechaRespuesta && (
              <span className="text-[10px] text-muted-foreground">
                · {tiempoRelativo(pregunta.fechaRespuesta)}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{pregunta.respuesta}</p>
        </div>
      ) : puedeResponder ? (
        respondiendo ? (
          <div className="ml-11 space-y-2">
            <Textarea
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Responde públicamente a esta pregunta…"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={enviarRespuesta} disabled={enviando || !borrador.trim()}>
                {enviando ? 'Guardando…' : 'Responder'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRespondiendo(false)}
                disabled={enviando}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRespondiendo(true)}
            className="ml-11 text-xs font-semibold text-primary hover:underline"
          >
            Responder
          </button>
        )
      ) : (
        <p className="ml-11 text-xs italic text-muted-foreground">Aún sin respuesta</p>
      )}
    </div>
  );
}
