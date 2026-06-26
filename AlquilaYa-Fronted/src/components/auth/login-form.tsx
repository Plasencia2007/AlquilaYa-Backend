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
  const { close, open: openAuthModal } = useAuthModal();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // Si el login se bloquea por correo sin verificar, guardamos el correo para ofrecer verificación.
  const [correoSinVerificar, setCorreoSinVerificar] = useState<string | null>(null);

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
    setCorreoSinVerificar(null);
    try {
      const usuario = await iniciarSesion(data.correo, data.password);
      if (!usuario) return;
      redirigirPorRol(usuario.rol);
    } catch (err) {
      // Bloqueo por correo sin verificar (el gate manda 403 con mensaje sobre el correo):
      // ofrecemos reenviar el link en vez de un error seco, para que nadie quede encerrado.
      const resp = (err as { response?: { status?: number; data?: unknown } })?.response;
      const texto = JSON.stringify(resp?.data ?? '').toLowerCase();
      if (resp?.status === 403 && texto.includes('correo')) {
        setCorreoSinVerificar(data.correo);
        return;
      }
      notify.error(err, 'Credenciales incorrectas');
    }
  };

  const irAVerificar = () => {
    if (!correoSinVerificar) return;
    close();
    router.push(`/verify-email?correo=${encodeURIComponent(correoSinVerificar)}`);
  };


  return (
    <div className="space-y-4">

      {/* Logo + Título centrados */}
      <header className="space-y-1 text-center">
        <p className="text-sm font-black tracking-tighter text-foreground">
          Alquila<span className="text-primary">Ya</span>
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Bienvenido</h2>
        <p className="text-sm text-muted-foreground">
          Ingresa para gestionar tus favoritos y mensajes.
        </p>
      </header>

      {/* Alerta correo sin verificar */}
      {correoSinVerificar && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="font-semibold text-amber-800">Verifica tu correo para entrar</p>
          <p className="mt-0.5 text-xs text-amber-700">
            Tu cuenta requiere verificar <strong>{correoSinVerificar}</strong>. Revisa tu bandeja (y spam).
          </p>
          <Button
            type="button"
            onClick={irAVerificar}
            className="mt-2 h-8 rounded-lg bg-amber-500 px-3 text-xs font-bold text-white hover:bg-amber-600"
          >
            Verificar correo
          </Button>
        </div>
      )}

      {/* Google primero */}
      <GoogleLoginButton
        onSuccess={async (credential) => {
          setGoogleLoading(true);
          try {
            const usuario = await loginConGoogle(credential, 'ESTUDIANTE');
            if (usuario) redirigirPorRol(usuario.rol);
          } catch (err) {
            notify.error(err, 'Error al iniciar con Google');
          } finally {
            setGoogleLoading(false);
          }
        }}
        disabled={googleLoading || form.formState.isSubmitting}
        loading={googleLoading}
      />

      {/* Separador */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">o con tu correo</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Campos */}
      <Form {...form}>
        <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="correo"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input
                      {...field}
                      type="email"
                      autoComplete="email"
                      placeholder="Correo electrónico"
                      className="h-11 rounded-xl bg-input pl-11 text-sm"
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
                    <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Contraseña"
                      className="h-11 rounded-xl bg-input pl-11 pr-11 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="px-1 text-xs" />
              </FormItem>
            )}
          />

          {/* Recordarme + Olvidaste */}
          <div className="flex items-center justify-between text-xs">
            <label className="flex cursor-pointer items-center gap-2 text-muted-foreground select-none">
              <input
                type="checkbox"
                className="size-4 rounded border-border accent-primary"
              />
              Recordarme
            </label>
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
            className="h-11 w-full rounded-full text-sm font-bold tracking-wide shadow-md shadow-primary/20"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
      </Form>

      <p className="text-center text-xs text-muted-foreground">
        ¿No tienes cuenta?{' '}
        <button
          type="button"
          onClick={() => { close(); router.push('/register'); }}
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
import { useThemeStore } from '@/stores/theme-store';

function GoogleLoginButton({
  onSuccess,
  disabled,
  loading,
}: {
  onSuccess: (credential: string) => void;
  disabled: boolean;
  loading: boolean;
}) {
  const theme = useThemeStore((s) => s.resolved);

  if (loading) {
    return (
      <div className="flex h-11 w-full items-center justify-center rounded-full border border-border bg-card text-sm text-muted-foreground">
        <svg className="mr-2 size-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Conectando con Google…
      </div>
    );
  }

  return (
    <div
      key={theme}
      className="flex justify-center overflow-hidden rounded-full [&>div]:!w-full [&>div>div]:!w-full [&_iframe]:!w-full"
    >
      <GoogleLogin
        onSuccess={(resp) => {
          if (resp.credential) {
            onSuccess(resp.credential);
          }
        }}
        onError={() => {
          notify.error('No se pudo iniciar sesión con Google', 'Error de Google');
        }}
        theme={theme === 'dark' ? 'filled_black' : 'outline'}
        size="large"
        shape="pill"
        text="continue_with"
        width="100%"
      />
    </div>
  );
}
