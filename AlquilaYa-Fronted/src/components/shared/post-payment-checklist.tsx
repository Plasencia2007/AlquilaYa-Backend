'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, MessageCircle, Truck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';
import { conversationService } from '@/services/conversation-service';
import { reservationService } from '@/services/reservation-service';
import type { Reserva } from '@/types/reserva';

interface Props {
  reservaId: string;
}

const ESTADOS_CON_CONTRATO: Reserva['estado'][] = ['PAGADA', 'FINALIZADA'];

/** Ítem 297: guía "¿Qué sigue?" en la página de éxito de pago. */
export function PostPaymentChecklist({ reservaId }: Props) {
  const router = useRouter();
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [contactando, setContactando] = useState(false);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        const r = await reservationService.obtenerPorId(reservaId);
        if (activo) setReserva(r);
      } catch {
        // La guía sigue siendo útil aunque no carguemos el detalle de la reserva.
      }
    };
    void cargar();
    return () => {
      activo = false;
    };
  }, [reservaId]);

  const contactar = async () => {
    if (!reserva?.arrendadorId) {
      notify.error(null, 'No encontramos al arrendador de esta reserva.');
      return;
    }
    setContactando(true);
    try {
      const conv = await conversationService.crearOObtener(
        Number(reserva.arrendadorId),
        Number(reserva.propiedadId),
      );
      router.push(`/student/messages/${conv.id}`);
    } catch (err) {
      notify.error(err, 'No pudimos abrir el chat con el arrendador.');
      setContactando(false);
    }
  };

  const descargarContrato = async () => {
    setDescargando(true);
    try {
      const blob = await reservationService.descargarContrato(reservaId);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) notify.warning('Habilita las ventanas emergentes para ver el contrato.');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      notify.error(err, 'El contrato aún no está listo. Intenta de nuevo en unos segundos.');
    } finally {
      setDescargando(false);
    }
  };

  const contratoListo = reserva !== null && ESTADOS_CON_CONTRATO.includes(reserva.estado);

  const pasos = [
    {
      icon: MessageCircle,
      titulo: 'Contacta al arrendador',
      descripcion: 'Coordina por el chat la entrega de llaves y cualquier detalle antes de tu mudanza.',
      action: (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={contactar}
          disabled={contactando || !reserva}
        >
          {contactando ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
          Ir al chat
        </Button>
      ),
    },
    {
      icon: Truck,
      titulo: 'Coordina tu mudanza',
      descripcion: 'Define con el arrendador el día y la hora exacta en que recibirás las llaves.',
      action: null,
    },
    {
      icon: FileText,
      titulo: 'Descarga tu contrato',
      descripcion: contratoListo
        ? 'Guarda una copia del contrato para tus registros.'
        : 'Estará disponible en cuanto tu reserva quede confirmada como pagada.',
      action: (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={descargarContrato}
          disabled={descargando || !contratoListo}
        >
          {descargando ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
          Descargar
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 text-left">
      <h2 className="font-bold text-foreground">¿Qué sigue?</h2>
      <ul className="space-y-4">
        {pasos.map((paso) => (
          <li key={paso.titulo} className="flex items-start gap-3">
            <paso.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-foreground">{paso.titulo}</p>
              <p className="text-sm text-muted-foreground">{paso.descripcion}</p>
              {paso.action}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
