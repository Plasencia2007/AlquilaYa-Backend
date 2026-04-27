'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuthModal } from '@/stores/auth-modal-store';
import { servicioAuth } from '@/services/auth-service';
import { notify } from '@/lib/notify';

const forgotPasswordSchema = z.object({
  correo: z.string().email('Ingresa un correo electrónico válido'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const { open: openAuthModal } = useAuthModal();
  const [enviado, setEnviado] = useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { correo: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await servicioAuth.solicitarResetPassword(data.correo);
      setEnviado(true);
      notify.success('Si el correo está registrado, recibirás un enlace de recuperación');
    } catch (err) {
      notify.error(err, 'Error al procesar la solicitud');
    }
  };

  if (enviado) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4 text-primary">
            <CheckCircle2 className="size-12" />
          </div>
        </div>
        <header className="space-y-2">
          <h2 className="font-headline text-2xl font-bold text-foreground">Revisa tu correo</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Te hemos enviado un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada y la carpeta de spam.
          </p>
        </header>
        <Button
          type="button"
          variant="outline"
          onClick={() => openAuthModal('login')}
          className="rounded-full mt-4"
        >
          <ArrowLeft className="mr-2 size-4" /> Volver al inicio de sesión
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-5" />
          </button>
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Volver</span>
        </div>
        <h2 className="font-headline text-3xl font-bold tracking-tight text-foreground">Recuperar contraseña</h2>
        <p className="text-sm text-muted-foreground">
          Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
        </p>
      </header>

      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="correo"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      {...field}
                      type="email"
                      autoComplete="email"
                      placeholder="Correo electrónico"
                      className="h-12 rounded-xl bg-input pl-11 text-sm"
                    />
                  </div>
                </FormControl>
                <FormMessage className="px-1 text-xs" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full rounded-full text-sm font-bold tracking-wide shadow-lg shadow-primary/20"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Enviando…' : 'Enviar enlace'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
