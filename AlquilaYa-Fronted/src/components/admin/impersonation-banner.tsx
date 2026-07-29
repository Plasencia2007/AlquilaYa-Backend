'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { notify } from '@/lib/notify';

/**
 * Ítem 379: banner permanente e imposible de ignorar mientras un admin está "viendo como"
 * otro usuario — requisito explícito del ítem ("banner rojo permanente"). No es un `Sheet`/
 * toast descartable: solo desaparece saliendo de la impersonación de verdad.
 */
export function ImpersonationBanner() {
  const { impersonando, usuario, expiraEn, salirImpersonacion } = useAuth();
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);

  useEffect(() => {
    if (!impersonando || !expiraEn) {
      setSegundosRestantes(null);
      return;
    }
    const tick = () => setSegundosRestantes(Math.max(0, Math.round((expiraEn - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [impersonando, expiraEn]);

  if (!impersonando || !usuario) return null;

  const handleSalir = async () => {
    setSaliendo(true);
    try {
      await salirImpersonacion();
      router.push('/admin-master');
    } catch (err) {
      notify.error(err, 'No se pudo salir del modo de impersonación');
    } finally {
      setSaliendo(false);
    }
  };

  const minutos = segundosRestantes !== null ? Math.floor(segundosRestantes / 60) : null;
  const segundos = segundosRestantes !== null ? segundosRestantes % 60 : null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-[9999] flex flex-wrap items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-xs font-bold text-destructive-foreground sm:gap-3 sm:text-sm"
    >
      <Eye className="size-4 shrink-0" aria-hidden />
      <span>
        Viendo como <strong>{usuario.nombre || usuario.correo}</strong> ({usuario.rol}) — modo de solo lectura
      </span>
      {minutos !== null && segundos !== null && (
        <span className="opacity-80">
          · expira en {minutos}:{String(segundos).padStart(2, '0')}
        </span>
      )}
      <button
        type="button"
        onClick={handleSalir}
        disabled={saliendo}
        className="ml-1 rounded-full bg-destructive-foreground/15 px-3 py-1 font-black uppercase tracking-wide hover:bg-destructive-foreground/25 disabled:opacity-60"
      >
        {saliendo ? 'Saliendo…' : 'Salir'}
      </button>
    </div>
  );
}
