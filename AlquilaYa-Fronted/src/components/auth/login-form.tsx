'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';
import { notify } from '@/lib/notify';
import { loginSchema, type LoginFormData } from '@/schemas/auth-schema';

export function LoginForm() {
  const { iniciarSesion } = useAuth();
  const { close, toggleView, open: openAuthModal } = useAuthModal();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { correo: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const usuario = await iniciarSesion(data.correo, data.password);
      if (!usuario) return;
      close();
      switch (usuario.rol) {
        case 'ADMIN':
          router.push('/admin-master');
          break;
        case 'ARRENDADOR':
          router.push('/landlord/dashboard');
          break;
        default:
          router.push('/');
      }
    } catch (err) {
      notify.error(err, 'Credenciales incorrectas');
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-foreground">Bienvenido</h2>
        <p className="text-sm text-muted-foreground">
          Ingresa para gestionar tus favoritos y mensajes.
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
                      autoComplete="current-password"
                      placeholder="Contraseña"
                      className="h-12 rounded-xl bg-input pl-11 pr-11 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="px-1 text-xs" />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between px-1 text-xs">
            <button
              type="button"
              onClick={() => openAuthModal('register', 'ARRENDADOR')}
              className="font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
            >
              Acceso arrendadores
            </button>
            <button
              type="button"
              className="font-semibold text-primary transition-colors hover:text-primary/80"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full rounded-full text-sm font-bold tracking-wide shadow-lg shadow-primary/20"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Ingresando…' : 'Ingresar'}
          </Button>

          <p className="pt-2 text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <button
              type="button"
              onClick={toggleView}
              className="font-bold text-primary transition-colors hover:text-primary/80"
            >
              Únete ahora
            </button>
          </p>
        </form>
      </Form>
    </div>
  );
}
