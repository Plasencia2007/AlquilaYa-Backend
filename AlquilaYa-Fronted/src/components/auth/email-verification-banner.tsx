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
    <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 sm:items-center">
      <MailWarning className="size-5 shrink-0 text-amber-600" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800">Verifica tu correo</p>
        <p className="text-xs text-amber-700">
          Confirma <strong>{usuario.correo}</strong> con el código que te enviamos por correo.
        </p>
      </div>
      <button
        type="button"
        onClick={irAVerificar}
        className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
      >
        Verificar
      </button>
      <button
        type="button"
        onClick={() => setOculto(true)}
        aria-label="Ocultar"
        className="shrink-0 text-amber-500 hover:text-amber-700"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
