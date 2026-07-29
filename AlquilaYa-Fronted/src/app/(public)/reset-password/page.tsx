'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import { SuccessScreen } from '@/components/shared/success-screen';
import { PasswordStrength } from '@/components/auth/password-strength';
import { servicioAuth } from '@/services/auth-service';
import { useAuthModal } from '@/stores/auth-modal-store';
import { notify } from '@/lib/notify';

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
    .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número')
    .regex(/[@$!%*?&]/, 'Debe incluir al menos un carácter especial (@$!%*?&)'),
  confirmPassword: z.string().min(1, 'Debes confirmar la contraseña'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { open: openAuthModal } = useAuthModal();

  const [exito, setExito] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      notify.error('Token no válido o ausente');
      return;
    }

    try {
      await servicioAuth.resetearPassword(token, data.password);
      setExito(true);
      notify.success('Contraseña restablecida correctamente');
    } catch (err) {
      notify.error(err, 'Error al restablecer la contraseña');
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
        <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground">Token inválido</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          El enlace de recuperación no es válido o ha expirado. Por favor, solicita uno nuevo.
        </p>
        <Button onClick={() => router.push('/')} className="mt-6 rounded-full">
          Volver al inicio
        </Button>
      </div>
    );
  }

  if (exito) {
    return (
      <SuccessScreen
        title="¡Contraseña restablecida!"
        description="Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión con tus nuevas credenciales."
        actionLabel="Iniciar sesión"
        onAction={() => {
          router.push('/');
          setTimeout(() => openAuthModal('login'), 100);
        }}
      />
    );
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="w-full max-w-md space-y-6 rounded-3xl bg-card p-6 shadow-2xl border border-border/50 md:p-8">
        <div className="flex justify-center mb-2">
          <span className="text-2xl font-black tracking-tighter text-primary">AlquilaYa</span>
        </div>
        <header className="space-y-1 text-center">
          <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground">
            Nueva contraseña
          </h1>
          <p className="text-sm text-muted-foreground">
            Ingresa tu nueva contraseña para acceder a tu cuenta.
          </p>
        </header>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">
                    Nueva contraseña
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      {...field}
                      showIcon
                      autoComplete="new-password"
                      placeholder="Nueva contraseña"
                      className="h-12"
                    />
                  </FormControl>
                  <PasswordStrength password={field.value} />
                  <FormMessage className="px-1 text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">
                    Confirmar contraseña
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      {...field}
                      showIcon
                      autoComplete="new-password"
                      placeholder="Confirmar contraseña"
                      className="h-12"
                    />
                  </FormControl>
                  <FormMessage className="px-1 text-xs" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              size="lg"
              className="h-12 w-full rounded-full text-sm font-bold tracking-wide shadow-lg shadow-primary/20 mt-2"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Guardando…' : 'Restablecer contraseña'}
            </Button>
          </form>
        </Form>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center text-sm text-muted-foreground animate-pulse">Cargando…</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
