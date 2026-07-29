'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Smartphone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';
import { useResendCooldown } from '@/hooks/use-resend-cooldown';
import { notify } from '@/lib/notify';
import { servicioAuth } from '@/services/auth-service';
import { otpSchema, type OtpFormData } from '@/schemas/auth-schema';


export function OtpStep() {
  const { personal, setStep } = useAuthModal();
  const { inicializar } = useAuth();

  // El código ya se envió como parte del registro, así que el cooldown arranca corriendo.
  const { segundosRestantes, puedeReenviar, iniciarCooldown } = useResendCooldown(60, true);
  const [reenviando, setReenviando] = useState(false);
  // Hallazgo de backend (ítem 191): /resend-otp ahora informa cuántos reenvíos quedan en la
  // ventana de 15 min. Solo aplica al OTP por teléfono — email-code-step/verify-email no lo
  // tienen (ese resend es anti-enumeración por diseño, ítem 194, y no expone contadores).
  const [intentosRestantes, setIntentosRestantes] = useState<number | null>(null);

  const form = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { codigo: '' },
  });

  const onSubmit = async (data: OtpFormData) => {
    try {
      const res = await servicioAuth.verificarOtp(personal?.telefono ?? '', data.codigo);

      // U1/S5: verify-otp devuelve autenticado=true si ya no falta verificación; el backend
      // ya puso las cookies httpOnly, acá sólo hidratamos el store con los datos del usuario.
      const usuario = servicioAuth.completarActivacion(res);
      if (usuario) inicializar();
      setStep('result');
    } catch (err) {
      notify.error(err, 'Código incorrecto. Inténtalo de nuevo.');
    }
  };

  const handleReenviar = async () => {
    if (!puedeReenviar || reenviando) return;
    setReenviando(true);

    try {
      const res = await servicioAuth.reenviarOtp(personal?.telefono ?? '');
      notify.success('Código reenviado', 'Te hemos enviado un nuevo código por WhatsApp.');
      setIntentosRestantes(res.intentosRestantes);
      iniciarCooldown();
    } catch (err) {
      notify.error(err, 'Error de conexión con el servidor al reenviar OTP');
    } finally {
      setReenviando(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-accent text-primary shadow-inner">
        <Smartphone className="size-10" aria-hidden />
      </div>

      <header className="space-y-2">
        <h2 className="font-headline text-2xl font-bold tracking-tight text-foreground">
          Verifica tu WhatsApp
        </h2>
        <p className="mx-auto max-w-[280px] text-sm text-muted-foreground">
          Hemos enviado un código de 6 dígitos al número{' '}
          <span className="font-bold tracking-wider text-foreground">{personal?.telefono}</span>
        </p>
      </header>

      <Form {...form}>
        <form className="w-full space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="codigo"
            render={({ field }) => (
              <FormItem className="mx-auto w-fit">
                <FormControl>
                  <InputOTP
                    maxLength={6}
                    inputMode="numeric"
                    pattern={REGEXP_ONLY_DIGITS}
                    autoComplete="one-time-code"
                    disabled={form.formState.isSubmitting}
                    {...field}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }, (_, i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormMessage className="text-center text-xs" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            loading={form.formState.isSubmitting}
            className="h-12 w-full rounded-full text-sm font-bold tracking-wide shadow-lg shadow-primary/20"
          >
            Confirmar código
          </Button>

          <p className="text-[11px] text-muted-foreground">
            ¿No recibiste el mensaje?{' '}
            <button
              type="button"
              onClick={handleReenviar}
              disabled={!puedeReenviar || reenviando}
              className="font-bold text-primary transition-colors hover:text-primary/80 disabled:opacity-50 disabled:hover:text-primary"
            >
              {reenviando
                ? 'Reenviando...'
                : !puedeReenviar
                  ? `Reenviar en ${segundosRestantes}s`
                  : 'Reenviar código'}
            </button>
          </p>

          {intentosRestantes != null && (
            <p className="text-[10px] text-muted-foreground">
              {intentosRestantes > 0
                ? `Te quedan ${intentosRestantes} reenvío${intentosRestantes === 1 ? '' : 's'} en 15 min.`
                : 'Alcanzaste el máximo de reenvíos por ahora. Intenta de nuevo en 15 min.'}
            </p>
          )}
        </form>
      </Form>
    </div>
  );
}
