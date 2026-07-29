/**
 * Ítem 299: traduce el `status_detail` que Mercado Pago agrega como query param al redirigir
 * a la URL de fallo, a un mensaje accionable en español. Códigos oficiales de Checkout Pro
 * (https://www.mercadopago.com.pe/developers/es/docs/checkout-api/response-handling/collection-status).
 */
const MENSAJES_STATUS_DETAIL: Record<string, string> = {
  cc_rejected_insufficient_amount:
    'Tu tarjeta no tiene fondos suficientes. Intenta con otra tarjeta o paga con Yape.',
  cc_rejected_bad_filled_card_number:
    'Revisa el número de tarjeta: parece estar mal escrito.',
  cc_rejected_bad_filled_date:
    'Revisa la fecha de vencimiento de la tarjeta.',
  cc_rejected_bad_filled_other:
    'Revisa los datos de la tarjeta: algún campo no es válido.',
  cc_rejected_bad_filled_security_code:
    'Revisa el código de seguridad (CVV) de tu tarjeta.',
  cc_rejected_blacklist:
    'Tu tarjeta no pudo procesarse por motivos de seguridad. Intenta con otro medio de pago.',
  cc_rejected_call_for_authorize:
    'Tu banco requiere que autorices el pago directamente con ellos antes de intentar de nuevo.',
  cc_rejected_card_disabled:
    'Tu tarjeta está deshabilitada para pagos online. Llama a tu banco o usa otro medio de pago.',
  cc_rejected_card_error:
    'No pudimos procesar tu tarjeta. Intenta con otra o con Yape.',
  cc_rejected_duplicated_payment:
    'Ya hiciste un pago por este mismo monto hace poco. Revisa tus reservas antes de intentar de nuevo.',
  cc_rejected_high_risk:
    'El pago fue rechazado por un control de seguridad. Intenta con otro medio de pago.',
  cc_rejected_invalid_installments:
    'Tu tarjeta no admite el número de cuotas elegido. Intenta con pago en una sola cuota.',
  cc_rejected_max_attempts:
    'Superaste el número de intentos permitidos. Intenta con otra tarjeta o medio de pago.',
  cc_rejected_other_reason:
    'Tu banco rechazó el pago sin dar más detalles. Intenta con otra tarjeta o con Yape.',
  cc_rejected_time_out:
    'La operación tardó demasiado y se canceló. Intenta de nuevo.',
  rejected_by_bank:
    'Tu banco rechazó el pago. Contáctalo o intenta con otro medio de pago.',
  rejected_by_regulations:
    'El pago fue rechazado por regulaciones vigentes. Intenta con otro medio de pago.',
  rejected_insufficient_data:
    'Faltaron datos para procesar el pago. Intenta de nuevo completando todos los campos.',
  rejected_by_max_deferred_payments:
    'Tu tarjeta no admite pagos en cuotas. Intenta con pago en una sola cuota.',
  expired:
    'El tiempo para completar el pago expiró. Genera un nuevo link de pago e intenta de nuevo.',
  pending_contingency:
    'Estamos esperando confirmación de tu pago. Puede tardar hasta 2 días hábiles.',
  pending_review_manual:
    'Tu pago está en revisión manual. Te avisaremos en cuanto se confirme.',
};

const MENSAJE_GENERICO =
  'No pudimos procesar tu pago. Verifica los datos e intenta de nuevo, o usa otro medio de pago.';

/** Mensaje accionable en español para un `status_detail` de Mercado Pago. */
export function traducirErrorMercadoPago(statusDetail: string | null | undefined): string {
  if (!statusDetail) return MENSAJE_GENERICO;
  return MENSAJES_STATUS_DETAIL[statusDetail] ?? MENSAJE_GENERICO;
}
