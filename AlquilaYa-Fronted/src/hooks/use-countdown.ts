'use client';

import { useEffect, useState } from 'react';

const UN_MINUTO_MS = 60 * 1000;

interface CountdownResult {
  horasRestantes: number;
  minutosRestantes: number;
  expirado: boolean;
  texto: string;
}

function formatearRestante(ms: number): string {
  const totalMinutos = Math.floor(ms / 60000);
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  if (horas <= 0) return `${minutos}m`;
  return `${horas}h ${minutos}m`;
}

/**
 * Cuenta regresiva viva hasta `fechaExpiracion` (ítem 273) — lógica compartida entre la card
 * de reserva, el checkout y cualquier otro punto del flujo que necesite mostrar el mismo dato.
 * Se recalcula cada minuto con un `setInterval`; el `useState` inicial es perezoso (corre en el
 * primer render, no dentro del cuerpo del efecto), así que no dispara `react-hooks/set-state-in-effect`.
 */
export function useCountdown(fechaExpiracion: string | null | undefined): CountdownResult {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (!fechaExpiracion) return;
    const timer = setInterval(() => setAhora(Date.now()), UN_MINUTO_MS);
    return () => clearInterval(timer);
  }, [fechaExpiracion]);

  if (!fechaExpiracion) {
    return { horasRestantes: 0, minutosRestantes: 0, expirado: false, texto: '' };
  }

  const restanteMs = new Date(fechaExpiracion).getTime() - ahora;
  const expirado = restanteMs <= 0;
  const totalMinutos = Math.max(0, Math.floor(restanteMs / 60000));

  return {
    horasRestantes: Math.floor(totalMinutos / 60),
    minutosRestantes: totalMinutos % 60,
    expirado,
    texto: expirado ? 'Expirando...' : `Expira en ${formatearRestante(restanteMs)}`,
  };
}
