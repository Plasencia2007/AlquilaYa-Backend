'use client';

import { useState, type ReactNode } from 'react';
import { Flag, ShieldAlert } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth';
import { denunciarPropiedad, type MotivoDenuncia } from '@/services/property-service';
import { notify } from '@/lib/notify';

interface Props {
  propiedadId: string | number;
  trigger: ReactNode;
}

const MOTIVOS: { value: MotivoDenuncia; label: string; hint: string }[] = [
  { value: 'FRAUDE', label: 'Parece una estafa', hint: 'Pide adelantos raros, presiona, etc.' },
  { value: 'INFO_FALSA', label: 'Información o fotos falsas', hint: 'No coincide con la realidad.' },
  { value: 'DUPLICADO', label: 'Aviso duplicado', hint: 'Ya existe la misma publicación.' },
  { value: 'CONTACTO_EXTERNO', label: 'Quiere salir de la plataforma', hint: 'Pide tratar por fuera.' },
  { value: 'INAPROPIADO', label: 'Contenido inapropiado', hint: 'Ofensivo o fuera de lugar.' },
  { value: 'OTRO', label: 'Otro motivo', hint: 'Cuéntanos abajo.' },
];

export function ReportListingDialog({ propiedadId, trigger }: Props) {
  const { estaAutenticado } = useAuth();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState<MotivoDenuncia | ''>('');
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!motivo) {
      notify.warning('Elige un motivo para reportar.');
      return;
    }
    setEnviando(true);
    try {
      await denunciarPropiedad(propiedadId, motivo, descripcion.trim() || undefined);
      notify.success('Reporte enviado', 'Gracias, nuestro equipo lo revisará.');
      setOpen(false);
      setMotivo('');
      setDescripcion('');
    } catch (err) {
      notify.error(err, 'No se pudo enviar el reporte.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/*
        El trigger es inyectado por quien use el diálogo (usualmente un botón
        icon-only). Envolvemos con Tooltip acá para que el hover/foco explique
        la acción sin depender de que cada caller lo agregue por su cuenta.
        Nota: sin `display:contents` en el span, porque ese modo no genera caja
        propia y el navegador no dispara pointerenter/pointerleave sobre él
        (rompería el Tooltip). El impacto visual es nulo: el span solo envuelve
        un único botón.
      */}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span onClick={() => setOpen(true)}>{trigger}</span>
          </TooltipTrigger>
          <TooltipContent>Reportar publicación</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" />
            Reportar publicación
          </DialogTitle>
          <DialogDescription>
            Ayúdanos a mantener AlquilaYa seguro. Tu reporte es confidencial.
          </DialogDescription>
        </DialogHeader>

        {!estaAutenticado ? (
          <p className="text-sm text-muted-foreground">
            Inicia sesión para poder reportar una publicación.
          </p>
        ) : (
          <div className="space-y-4">
            <RadioGroup value={motivo} onValueChange={(v) => setMotivo(v as MotivoDenuncia)}>
              <div className="space-y-2">
                {MOTIVOS.map((m) => (
                  <label
                    key={m.value}
                    htmlFor={`motivo-${m.value}`}
                    className="flex items-start gap-3 rounded-lg border border-border p-2.5 cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <RadioGroupItem id={`motivo-${m.value}`} value={m.value} className="mt-0.5" />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium text-foreground">{m.label}</span>
                      <span className="block text-xs text-muted-foreground">{m.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </RadioGroup>

            <div className="space-y-1.5">
              <Label htmlFor="denuncia-desc">Detalle (opcional)</Label>
              <Textarea
                id="denuncia-desc"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Cuéntanos qué notaste…"
              />
            </div>

            <Button onClick={enviar} disabled={enviando || !motivo} className="w-full gap-2">
              <Flag className="size-4" />
              {enviando ? 'Enviando…' : 'Enviar reporte'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
