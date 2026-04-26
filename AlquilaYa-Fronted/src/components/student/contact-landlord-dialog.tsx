'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';

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
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';
import { conversationService } from '@/services/conversation-service';
import { notify } from '@/lib/notify';
import type { Propiedad } from '@/types/propiedad';

interface Props {
  propiedad: Propiedad;
  trigger: ReactNode;
}

const PRESET = '¡Hola! Soy estudiante UPeU, me interesa tu cuarto. ¿Sigue disponible?';

export function ContactLandlordDialog({ propiedad, trigger }: Props) {
  const router = useRouter();
  const { estaAutenticado, usuario } = useAuth();
  const { open: abrirAuth } = useAuthModal();

  const [open, setOpen] = useState(false);
  const [mensaje, setMensaje] = useState(PRESET);
  const [enviando, setEnviando] = useState(false);

  const handleTrigger = (e: React.MouseEvent) => {
    if (!estaAutenticado) {
      e.preventDefault();
      e.stopPropagation();
      abrirAuth('login');
      return;
    }
    if (usuario?.rol !== 'ESTUDIANTE') {
      e.preventDefault();
      notify.warning('Solo los estudiantes pueden contactar arrendadores');
      return;
    }
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensaje.trim()) {
      notify.warning('Escribe un mensaje primero');
      return;
    }
    setEnviando(true);
    try {
      const conv = await conversationService.crearOObtener(
        Number(propiedad.propietarioId),
        Number(propiedad.id),
      );
      await conversationService.enviarMensaje(conv.id, mensaje.trim());
      notify.success('Mensaje enviado');
      setOpen(false);
      router.push(`/student/messages/${conv.id}`);
    } catch (err) {
      notify.error(err, 'No pudimos enviar el mensaje');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <span onClick={handleTrigger}>{trigger}</span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-headline text-xl font-bold">
              <MessageCircle className="size-5 text-primary" />
              Contactar arrendador
            </DialogTitle>
            <DialogDescription>
              Envía tu primer mensaje. El arrendador responderá pronto.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="msg" className="text-xs font-bold uppercase tracking-wider">
                Tu mensaje
              </Label>
              <Textarea
                id="msg"
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={5}
                maxLength={500}
                placeholder="Cuéntale al arrendador en qué estás interesado…"
              />
              <p className="text-right text-[10px] text-muted-foreground">
                {mensaje.length}/500
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={enviando || !mensaje.trim()}>
                {enviando ? 'Enviando…' : 'Enviar mensaje'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
