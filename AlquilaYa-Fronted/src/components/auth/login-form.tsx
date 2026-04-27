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
  const { iniciarSesion, loginConGoogle } = useAuth();
  const { close, toggleView, open: openAuthModal } = useAuthModal();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { correo: '', password: '' },
  });

  const redirigirPorRol = (rol: string) => {
    close();
    switch (rol) {
      case 'ADMIN':
        router.push('/admin-master');
        break;
      case 'ARRENDADOR':
        router.push('/landlord/dashboard');
        break;
      default:
        router.push('/');
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      const usuario = await iniciarSesion(data.correo, data.password);
      if (!usuario) return;
      redirigirPorRol(usuario.rol);
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
              onClick={() => openAuthModal('forgot-password')}
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
        </form>
      </Form>

      {/* Separador */}
      <div className="relative flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground">o continúa con</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Botón Google */}
      <GoogleLoginButton
        onSuccess={async (credential) => {
          setGoogleLoading(true);
          try {
            const usuario = await loginConGoogle(credential, 'ESTUDIANTE');
            if (usuario) {
              redirigirPorRol(usuario.rol);
            }
          } catch (err) {
            notify.error(err, 'Error al iniciar con Google');
          } finally {
            setGoogleLoading(false);
          }
        }}
        disabled={googleLoading || form.formState.isSubmitting}
        loading={googleLoading}
      />

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
    </div>
  );
}

/* ─── Botón de Google personalizado ─── */
import { GoogleLogin } from '@react-oauth/google';

function GoogleLoginButton({
  onSuccess,
  disabled,
  loading,
}: {
  onSuccess: (credential: string) => void;
  disabled: boolean;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex h-12 w-full items-center justify-center rounded-full border border-border bg-card text-sm text-muted-foreground">
        <svg className="mr-2 size-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Conectando con Google…
      </div>
    );
  }

  return (
    <div className="flex justify-center [&>div]:w-full">
      <GoogleLogin
        onSuccess={(resp) => {
          if (resp.credential) {
            onSuccess(resp.credential);
          }
        }}
        onError={() => {
          notify.error('No se pudo iniciar sesión con Google', 'Error de Google');
        }}
        theme="outline"
        size="large"
        shape="pill"
        width="350"
        text="continue_with"
      />
    </div>
  );
}
