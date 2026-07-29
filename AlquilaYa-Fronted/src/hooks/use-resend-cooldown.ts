'use client';

import { useCallback, useEffect, useState } from 'react';

interface UseResendCooldownResult {
  /** Segundos que faltan para poder reenviar. 0 = ya se puede. */
  segundosRestantes: number;
  /** Atajo de `segundosRestantes <= 0`. */
  puedeReenviar: boolean;
  /** Reinicia la cuenta regresiva a `segundos` (llamar tras un reenvío exitoso). */
  iniciarCooldown: () => void;
}

/**
 * Cooldown de reenvío (ítem 191): unifica la cuenta regresiva de "espera Ns antes de
 * reenviar" que estaba duplicada casi idéntica en otp-step.tsx, email-code-step.tsx y
 * verify-email/page.tsx.
 *
 * Nota: `POST /resend-otp` ya informa `intentosRestantes` (ítem 191, resuelto) — otp-step.tsx
 * lo lee de la respuesta directamente, no vive en este hook (es específico de ese endpoint).
 * `POST /resend-email-verification` sigue sin ese dato a propósito: es anti-enumeración
 * (ítem 194, idempotente/silencioso sin importar si el correo existe), y un contador real
 * ahí filtraría información de la cuenta.
 *
 * @param segundos duración del cooldown en segundos cada vez que se llama `iniciarCooldown()`.
 * @param iniciarInmediatamente si es `true`, el cooldown arranca ya corriendo al montar (caso
 *   otp-step/email-code-step: el código se acaba de enviar como parte del registro). Si es
 *   `false` (default), arranca en 0 — caso verify-email/page.tsx, donde el usuario puede llegar
 *   sin haber pedido ningún código todavía.
 */
export function useResendCooldown(
  segundos = 60,
  iniciarInmediatamente = false,
): UseResendCooldownResult {
  const [segundosRestantes, setSegundosRestantes] = useState(iniciarInmediatamente ? segundos : 0);

  useEffect(() => {
    if (segundosRestantes <= 0) return;
    const timer = setTimeout(() => setSegundosRestantes((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [segundosRestantes]);

  const iniciarCooldown = useCallback(() => {
    setSegundosRestantes(segundos);
  }, [segundos]);

  return {
    segundosRestantes,
    puedeReenviar: segundosRestantes <= 0,
    iniciarCooldown,
  };
}
