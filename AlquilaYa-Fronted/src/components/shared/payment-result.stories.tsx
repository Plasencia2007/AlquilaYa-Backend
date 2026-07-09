import { PaymentResult } from './payment-result';
import { Button } from '@/components/ui/button';

export default {
  title: 'shared / PaymentResult',
};

export const Exito = () => (
  <PaymentResult
    variant="exito"
    title="¡Pago realizado con éxito!"
    description="Tu pago fue procesado correctamente. Tu reserva pasará a estado PAGADA en unos segundos."
    actions={<Button>Ver mis reservas</Button>}
  />
);

export const Fallo = () => (
  <PaymentResult
    variant="fallo"
    title="El pago no se completó"
    description="Hubo un problema al procesar tu pago. Tu reserva sigue activa y puedes intentarlo de nuevo cuando quieras."
    actions={
      <div className="flex gap-3">
        <Button>Reintentar pago</Button>
        <Button variant="outline">Ver mis reservas</Button>
      </div>
    }
  />
);

export const Pendiente = () => (
  <PaymentResult
    variant="pendiente"
    title="Pago en proceso"
    description="Tu pago está siendo procesado. Cuando se confirme, tu reserva pasará automáticamente a estado PAGADA."
    actions={<Button variant="outline">Ver mis reservas</Button>}
  />
);
