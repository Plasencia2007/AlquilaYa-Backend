'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, Star } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { resenaService } from '@/services/resena-service';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/cn';
import type { Reserva } from '@/types/reserva';

interface Props {
  reserva: Reserva;
  trigger: ReactNode;
}

function StarPicker({
  value,
  onChange,
  size = 'lg',
}: {
  value: number;
  onChange: (v: number) => void;
  size?: 'md' | 'lg';
}) {
  const [hover, setHover] = useState(0);
  const activo = hover || value;
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Calificación">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          aria-label={`${s} ${s === 1 ? 'estrella' : 'estrellas'}`}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              size === 'lg' ? 'size-8' : 'size-6',
              s <= activo
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-muted text-muted-foreground/30',
            )}
          />
        </button>
      ))}
    </div>
  );
}

/**
 * Reseña post-estadía: visible solo para reservas FINALIZADAS (el backend
 * valida lo mismo). Califica la propiedad y, opcionalmente, al arrendador.
 */
export function ReviewFormDialog({ reserva, trigger }: Props) {
  const { usuario } = useAuth();

  const [open, setOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [verificandoPrevias, setVerificandoPrevias] = useState(true);
  const [yaResenoPropiedad, setYaResenoPropiedad] = useState(false);
  const [yaResenoArrendador, setYaResenoArrendador] = useState(false);
  const [enviada, setEnviada] = useState(false);

  const [ratingPropiedad, setRatingPropiedad] = useState(0);
  const [comentarioPropiedad, setComentarioPropiedad] = useState('');
  const [calificarArrendador, setCalificarArrendador] = useState(false);
  const [ratingArrendador, setRatingArrendador] = useState(0);
  const [comentarioArrendador, setComentarioArrendador] = useState('');

  useEffect(() => {
    if (!open) {
      setEnviada(false);
      setRatingPropiedad(0);
      setComentarioPropiedad('');
      setCalificarArrendador(false);
      setRatingArrendador(0);
      setComentarioArrendador('');
      return;
    }

    // Al abrir: detectar si este estudiante ya dejó reseñas (el backend no
    // bloquea duplicados de propiedad/arrendador, así que evitamos repetir).
    let cancelado = false;
    const miPerfilId = usuario?.perfilId;
    setVerificandoPrevias(true);
    Promise.allSettled([
      resenaService.getResenasPorPropiedad(reserva.propiedadId),
      reserva.arrendadorId
        ? resenaService.getResenasPorArrendador(reserva.arrendadorId)
        : Promise.resolve([]),
    ])
      .then(([propRes, arrRes]) => {
        if (cancelado) return;
        const esMia = (r: { estudianteId?: number }) =>
          miPerfilId != null && r.estudianteId === miPerfilId;
        setYaResenoPropiedad(propRes.status === 'fulfilled' && propRes.value.some(esMia));
        setYaResenoArrendador(arrRes.status === 'fulfilled' && arrRes.value.some(esMia));
      })
      .finally(() => {
        if (!cancelado) setVerificandoPrevias(false);
      });
    return () => {
      cancelado = true;
    };
  }, [open, reserva.propiedadId, reserva.arrendadorId, usuario?.perfilId]);

  const todoResenado = yaResenoPropiedad && (yaResenoArrendador || !reserva.arrendadorId);
  const puedeArrendador = !!reserva.arrendadorId && !yaResenoArrendador;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yaResenoPropiedad && ratingPropiedad === 0) {
      notify.warning('Elige una calificación para el cuarto');
      return;
    }
    if (calificarArrendador && ratingArrendador === 0) {
      notify.warning('Elige una calificación para el arrendador');
      return;
    }
    setEnviando(true);
    try {
      if (!yaResenoPropiedad) {
        await resenaService.crearResenaPropiedad(
          reserva.propiedadId,
          ratingPropiedad,
          comentarioPropiedad.trim(),
        );
      }
      if (calificarArrendador && puedeArrendador && reserva.arrendadorId) {
        await resenaService.crearResenaArrendador(
          reserva.arrendadorId,
          ratingArrendador,
          comentarioArrendador.trim(),
        );
      }
      setEnviada(true);
      notify.success('¡Gracias por tu reseña!', 'Ayudas a otros estudiantes a elegir mejor.');
    } catch (err) {
      notify.error(err, 'No pudimos guardar tu reseña');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl font-bold">
              Califica tu estadía
            </DialogTitle>
            <DialogDescription>
              {reserva.propiedadTitulo ?? 'Tu cuarto'} — tu opinión ayuda a otros estudiantes.
            </DialogDescription>
          </DialogHeader>

          {enviada || (!verificandoPrevias && todoResenado) ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="size-12 text-green-500" />
              <p className="text-sm font-semibold text-foreground">
                {enviada ? '¡Reseña enviada!' : 'Ya dejaste tu reseña para esta estadía'}
              </p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Gracias por compartir tu experiencia con la comunidad UPeU.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 rounded-full"
                onClick={() => setOpen(false)}
              >
                Cerrar
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6">
              {!yaResenoPropiedad && (
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider">
                    ¿Cómo estuvo el cuarto?
                  </Label>
                  <StarPicker value={ratingPropiedad} onChange={setRatingPropiedad} />
                  <Textarea
                    value={comentarioPropiedad}
                    onChange={(e) => setComentarioPropiedad(e.target.value)}
                    placeholder="Cuéntanos sobre el cuarto: limpieza, ruido, servicios… (opcional)"
                    maxLength={2000}
                    rows={3}
                  />
                </div>
              )}

              {puedeArrendador && (
                <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider">
                      Calificar también a{' '}
                      {reserva.arrendadorNombre ?? 'tu arrendador'}
                    </Label>
                    <Switch
                      checked={calificarArrendador}
                      onCheckedChange={setCalificarArrendador}
                    />
                  </div>
                  {calificarArrendador && (
                    <>
                      <StarPicker
                        value={ratingArrendador}
                        onChange={setRatingArrendador}
                        size="md"
                      />
                      <Textarea
                        value={comentarioArrendador}
                        onChange={(e) => setComentarioArrendador(e.target.value)}
                        placeholder="¿Cómo fue el trato, la comunicación, la puntualidad? (opcional)"
                        maxLength={2000}
                        rows={2}
                      />
                    </>
                  )}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={enviando || verificandoPrevias}
                className="h-12 w-full rounded-full text-sm font-bold"
              >
                {enviando ? 'Enviando…' : 'Publicar reseña'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
