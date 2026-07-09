'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MailWarning, X } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';

/**
 * Aviso para que el usuario verifique su correo (#3). Solo aparece cuando el flag
 * es explícitamente false (los tokens viejos sin el claim → undefined → no molesta).
 */
export function EmailVerificationBanner() {
  const { usuario } = useAuth();
  const router = useRouter();
  const [oculto, setOculto] = useState(false);

  if (!usuario || usuario.emailVerificado !== false || oculto) return null;

  const irAVerificar = () => {
    router.push(`/verify-email?correo=${encodeURIComponent(usuario.correo ?? '')}`);
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-light p-3 sm:items-center">
      <MailWarning className="size-5 shrink-0 text-warning" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-warning">Verifica tu correo</p>
        <p className="text-xs text-warning/80">
          Confirma <strong>{usuario.correo}</strong> con el código que te enviamos por correo.
        </p>
      </div>
      <button
        type="button"
        onClick={irAVerificar}
        className="shrink-0 rounded-lg bg-warning px-3 py-1.5 text-xs font-bold text-warning-foreground hover:bg-warning/90"
      >
        Verificar
      </button>
      <button
        type="button"
        onClick={() => setOculto(true)}
        aria-label="Ocultar"
        className="shrink-0 text-warning hover:text-warning/80"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
