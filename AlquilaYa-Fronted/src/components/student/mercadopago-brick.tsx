'use client';

import { useEffect, useState } from 'react';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';

import { notify } from '@/lib/notify';
import { pagoService } from '@/services/pago-service';

interface Props {
  reservaId: string;
  monto: number;
  onExito: () => void;
  onPendiente: () => void;
  onFallo: (statusDetail: string | null) => void;
}

// El SDK de Mercado Pago solo debe inicializarse una vez por sesión de navegador,
// no una vez por montaje de este componente.
let publicKeyInicializada = false;

/**
 * Ítem 276: Payment Brick embebido — el formulario de tarjeta/Yape/PagoEfectivo vive dentro de
 * AlquilaYa en vez de redirigir a Mercado Pago. El `onSubmit` del Brick manda el `formData`
 * tokenizado (nunca el número de tarjeta en claro, eso ya lo maneja el SDK client-side) a
 * `POST /pagos/bricks/procesar/{reservaId}`, que crea el cobro directo en el backend. La
 * confirmación real de la reserva sigue llegando por el webhook — este componente solo decide a
 * qué pantalla de resultado navegar según la respuesta inmediata de Mercado Pago.
 */
export function MercadoPagoBrick({ reservaId, monto, onExito, onPendiente, onFallo }: Props) {
  const [listo, setListo] = useState(publicKeyInicializada);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (publicKeyInicializada) return;
    let cancelado = false;
    pagoService
      .obtenerPublicKey()
      .then((key) => {
        if (cancelado) return;
        if (!key) {
          setError('No se pudo inicializar el pago embebido.');
          return;
        }
        initMercadoPago(key, { locale: 'es-PE' });
        publicKeyInicializada = true;
        setListo(true);
      })
      .catch(() => {
        if (cancelado) return;
        setError('No se pudo inicializar el pago embebido.');
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (error) {
    return (
      <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (!listo) {
    return <div className="h-72 animate-pulse rounded-xl bg-muted" aria-hidden />;
  }

  return (
    <Payment
      initialization={{ amount: monto }}
      customization={{
        paymentMethods: {
          creditCard: 'all',
          debitCard: 'all',
          ticket: 'all',
          bankTransfer: 'all',
        },
      }}
      onSubmit={async ({ formData }) => {
        try {
          const resultado = await pagoService.procesarPagoBricks(
            reservaId,
            formData as unknown as Record<string, unknown>,
          );
          if (resultado.status === 'approved') {
            onExito();
          } else if (resultado.status === 'rejected') {
            onFallo(resultado.statusDetail);
          } else {
            onPendiente();
          }
        } catch (err) {
          notify.error(err, 'No pudimos procesar tu pago');
          // El Brick necesita que el onSubmit rechace la promesa para mostrar su propio
          // estado de error inline y dejar reintentar sin perder los datos ya ingresados.
          throw err;
        }
      }}
      onError={(brickError) => {
        console.error('[MercadoPagoBrick]', brickError);
      }}
    />
  );
}
