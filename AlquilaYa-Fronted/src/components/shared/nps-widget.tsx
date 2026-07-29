'use client';

import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { notify } from '@/lib/notify';
import { pagoService } from '@/services/pago-service';

interface Props {
  reservaId: string;
}

function claveLocalStorage(reservaId: string) {
  return `alquilaya:nps:${reservaId}`;
}

/** Ítem 298: encuesta NPS de 1 pregunta en la página de éxito de pago. Se muestra una sola vez
 * por reserva (persistido en localStorage), tanto si el usuario responde como si la descarta. */
export function NpsWidget({ reservaId }: Props) {
  const [visible, setVisible] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    const chequearRespondido = () => {
      setVisible(localStorage.getItem(claveLocalStorage(reservaId)) === null);
    };
    chequearRespondido();
  }, [reservaId]);

  if (!visible) return null;

  const descartar = () => {
    localStorage.setItem(claveLocalStorage(reservaId), 'descartado');
    setVisible(false);
  };

  const enviar = async () => {
    if (score === null) return;
    setEnviando(true);
    try {
      await pagoService.enviarNps({ reservaId, score, comentario: comentario.trim() || undefined });
      localStorage.setItem(claveLocalStorage(reservaId), 'respondido');
      setEnviado(true);
    } catch (err) {
      notify.error(err, 'No se pudo enviar tu respuesta.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 text-left">
      {enviado ? (
        <p className="text-sm font-semibold text-success">¡Gracias por tu respuesta!</p>
      ) : (
        <>
          <div className="space-y-1">
            <h2 className="font-bold text-foreground">¿Qué tan probable es que recomiendes AlquilaYa?</h2>
            <p className="text-xs text-muted-foreground">0 = Nada probable · 10 = Muy probable</p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Puntaje del 0 al 10">
            {Array.from({ length: 11 }, (_, n) => n).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                aria-pressed={score === n}
                className={cn(
                  'flex size-9 items-center justify-center rounded-lg border text-sm font-semibold transition',
                  score === n
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-foreground hover:bg-muted',
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="¿Algo que quieras contarnos? (opcional)"
            rows={2}
            aria-label="Comentario opcional"
            className="w-full resize-none rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={enviar}
              disabled={score === null || enviando}
              loading={enviando}
              className="gap-1.5"
            >
              <Send className="size-4" /> Enviar
            </Button>
            <Button size="sm" variant="ghost" onClick={descartar} disabled={enviando}>
              Ahora no
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
