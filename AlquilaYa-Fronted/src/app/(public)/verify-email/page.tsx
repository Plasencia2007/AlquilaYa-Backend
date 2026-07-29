'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Mail } from 'lucide-react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { SuccessScreen } from '@/components/shared/success-screen';
import { servicioAuth } from '@/services/auth-service';
import { useAuthModal } from '@/stores/auth-modal-store';
import { useResendCooldown } from '@/hooks/use-resend-cooldown';
import { notify } from '@/lib/notify';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { open: openAuthModal } = useAuthModal();

  const [correo, setCorreo] = useState(searchParams.get('correo') ?? '');
  const [codigo, setCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  // Ítem 179: si la URL trae ?token=, hay una verificación de un click en camino — arranca ya
  // en "verificando" para no mostrar un parpadeo del formulario manual antes de que el efecto
  // de abajo dispare la llamada real.
  const [verificandoToken, setVerificandoToken] = useState(() => Boolean(searchParams.get('token')));

  const { segundosRestantes, puedeReenviar, iniciarCooldown } = useResendCooldown(60);

  // Único lugar que llama a la API del token. El useEffect de abajo SOLO invoca esta función
  // (nunca setea estado directo en su propio cuerpo — react-hooks/set-state-in-effect).
  const verificarConToken = useCallback(async (token: string) => {
    setVerificandoToken(true);
    try {
      await servicioAuth.verificarEmailToken(token);
      setExito(true);
      notify.success('Correo verificado');
    } catch (err) {
      notify.error(err, 'El enlace de verificación es inválido o expiró. Ingresa el código manualmente.');
    } finally {
      setVerificandoToken(false);
    }
  }, []);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) verificarConToken(token);
  }, [searchParams, verificarConToken]);

  const enviarCodigo = async () => {
    if (!correo.trim() || enviando || !puedeReenviar) return;
    setEnviando(true);
    try {
      const msg = await servicioAuth.reenviarVerificacionEmail(correo.trim());
      notify.success('Código enviado', msg);
      iniciarCooldown();
    } catch (err) {
      notify.error(err, 'No se pudo enviar el código');
    } finally {
      setEnviando(false);
    }
  };

  const verificar = async () => {
    if (!correo.trim() || codigo.length < 6) {
      notify.warning('Ingresa tu correo y el código de 6 dígitos.');
      return;
    }
    setVerificando(true);
    try {
      await servicioAuth.verificarCodigoEmail(correo.trim(), codigo);
      setExito(true);
      notify.success('Correo verificado');
    } catch (err) {
      notify.error(err, 'Código incorrecto o expirado');
    } finally {
      setVerificando(false);
    }
  };

  if (exito) {
    return (
      <SuccessScreen
        title="¡Correo verificado!"
        description="Tu correo quedó confirmado. Ya puedes iniciar sesión."
        actionLabel="Iniciar sesión"
        onAction={() => {
          router.push('/');
          setTimeout(() => openAuthModal('login'), 100);
        }}
      />
    );
  }

  // Ítem 179: mientras el enlace de un click está en vuelo no se muestra el formulario manual,
  // solo un estado de carga — evita que el usuario alcance a tipear un código mientras el
  // backend ya está validando el token.
  if (verificandoToken) {
    return (
      <main className="flex min-h-[80vh] flex-col items-center justify-center gap-4 p-4 text-center animate-in fade-in duration-500">
        <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">Verificando tu correo…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="w-full max-w-md space-y-6 rounded-3xl bg-card p-6 shadow-2xl border border-border/50 md:p-8">
        <div className="flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-accent text-primary">
            <Mail className="size-8" />
          </div>
        </div>
        <header className="space-y-1 text-center">
          <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground">
            Verifica tu correo
          </h1>
          <p className="text-sm text-muted-foreground">
            Te enviamos un código de 6 dígitos. Ingrésalo aquí.
          </p>
        </header>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="correo" className="text-xs font-bold uppercase tracking-wider">
              Correo electrónico
            </Label>
            <Input
              id="correo"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="Tu correo"
              className="h-12 rounded-xl bg-input text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="codigo" className="text-xs font-bold uppercase tracking-wider">
              Código de verificación
            </Label>
            <InputOTP
              id="codigo"
              maxLength={6}
              inputMode="numeric"
              pattern={REGEXP_ONLY_DIGITS}
              autoComplete="one-time-code"
              value={codigo}
              onChange={setCodigo}
              disabled={verificando}
              containerClassName="justify-center"
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }, (_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            onClick={verificar}
            loading={verificando}
            size="lg"
            className="h-12 w-full rounded-full text-sm font-bold tracking-wide shadow-lg shadow-primary/20"
          >
            Confirmar código
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            ¿No te llegó?{' '}
            <button
              type="button"
              onClick={enviarCodigo}
              disabled={enviando || !puedeReenviar}
              className="font-bold text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
            >
              {enviando
                ? 'Enviando…'
                : !puedeReenviar
                  ? `Reenviar en ${segundosRestantes}s`
                  : 'Enviar código'}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground animate-pulse">
          Cargando…
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
