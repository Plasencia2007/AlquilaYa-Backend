'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
  
  const [showPassword, setShowPassword] = useState(false);
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
        <h1 className="font-headline text-2xl font-bold text-foreground">Token inválido</h1>
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
        <div className="rounded-full bg-primary/10 p-4 text-primary mb-4">
          <CheckCircle2 className="size-12" />
        </div>
        <h1 className="font-headline text-2xl font-bold text-foreground">¡Contraseña restablecida!</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión con tus nuevas credenciales.
        </p>
        <Button 
          onClick={() => {
            router.push('/');
            setTimeout(() => openAuthModal('login'), 100);
          }} 
          className="mt-6 rounded-full shadow-lg shadow-primary/20"
        >
          Iniciar sesión
        </Button>
      </div>
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
                  <FormControl>
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        {...field}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Nueva contraseña"
                        className="h-12 rounded-xl bg-input pl-11 pr-11 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
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
                  <FormControl>
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        {...field}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Confirmar contraseña"
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
