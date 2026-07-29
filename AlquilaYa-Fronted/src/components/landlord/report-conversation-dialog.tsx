'use client';

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { notify } from '@/lib/notify';
import type { MotivoReporte } from '@/types/chat';

interface Props {
  conversacionId: number;
  contraparteNombre?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MOTIVOS: { value: MotivoReporte; label: string }[] = [
  { value: 'ACOSO', label: 'Acoso' },
  { value: 'FRAUDE', label: 'Fraude o estafa' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'CONTENIDO_INAPROPIADO', label: 'Contenido inapropiado' },
  { value: 'OTRO', label: 'Otro motivo' },
];

export function ReportConversationDialog({ conversacionId, contraparteNombre, open, onOpenChange }: Props) {
  const [motivo, setMotivo] = useState<MotivoReporte | ''>('');
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!motivo) {
      notify.warning('Elige un motivo para reportar.');
      return;
    }
    setEnviando(true);
    try {
      await api.post(`/mensajeria/conversaciones/${conversacionId}/reportar`, {
        motivo,
        descripcion: descripcion.trim() || undefined,
      });
      notify.success('Reporte enviado', 'Nuestro equipo lo revisará pronto.');
      onOpenChange(false);
      setMotivo('');
      setDescripcion('');
    } catch (err) {
      notify.error(err, 'No se pudo enviar el reporte');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" />
            Reportar a {contraparteNombre || 'este usuario'}
          </DialogTitle>
          <DialogDescription>
            Ayúdanos a mantener AlquilaYa seguro. Tu reporte es confidencial y lo revisará el equipo de moderación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reporte-motivo">Motivo</Label>
            <Select value={motivo} onValueChange={(v) => setMotivo(v as MotivoReporte)}>
              <SelectTrigger id="reporte-motivo">
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reporte-desc">Descripción (opcional)</Label>
            <Textarea
              id="reporte-desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Cuéntanos qué pasó…"
            />
          </div>

          <Button onClick={enviar} disabled={!motivo} loading={enviando} className="w-full gap-2">
            <Flag className="size-4" />
            Enviar reporte
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
