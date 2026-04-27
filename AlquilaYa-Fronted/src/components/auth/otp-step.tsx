'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Smartphone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';
import { notify } from '@/lib/notify';
import { servicioAuth } from '@/services/auth-service';
import { otpSchema, type OtpFormData } from '@/schemas/auth-schema';


export function OtpStep() {
  const { personal, setStep } = useAuthModal();
  const { inicializar } = useAuth();
  
  const [cooldown, setCooldown] = useState(60);
  const [reenviando, setReenviando] = useState(false);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const form = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { codigo: '' },
  });

  const onSubmit = async (data: OtpFormData) => {
    try {
      await servicioAuth.verificarOtp(personal?.telefono ?? '', data.codigo);

      const usuario = servicioAuth.completarActivacion();
      if (usuario) inicializar();
      setStep('result');
    } catch (err) {
      notify.error(err, 'Código incorrecto. Inténtalo de nuevo.');
    }
  };

  const handleReenviar = async () => {
    if (cooldown > 0 || reenviando) return;
    setReenviando(true);
    
    try {
      await servicioAuth.reenviarOtp(personal?.telefono ?? '');
      notify.success('Código reenviado', 'Te hemos enviado un nuevo código por WhatsApp.');
      setCooldown(60);
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
              <FormItem className="mx-auto max-w-[240px]">
                <FormControl>
                  <Input
                    {...field}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                    className="h-14 rounded-xl bg-input text-center text-2xl font-black tracking-[0.5em]"
                  />
                </FormControl>
                <FormMessage className="text-center text-xs" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            disabled={form.formState.isSubmitting}
            className="h-12 w-full rounded-full text-sm font-bold tracking-wide shadow-lg shadow-primary/20"
          >
            {form.formState.isSubmitting ? 'Verificando…' : 'Confirmar código'}
          </Button>

          <p className="text-[11px] text-muted-foreground">
            ¿No recibiste el mensaje?{' '}
            <button 
              type="button" 
              onClick={handleReenviar}
              disabled={cooldown > 0 || reenviando}
              className="font-bold text-primary transition-colors hover:text-primary/80 disabled:opacity-50 disabled:hover:text-primary"
            >
              {reenviando ? 'Reenviando...' : cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar código'}
            </button>
          </p>
        </form>
      </Form>
    </div>
  );
}
