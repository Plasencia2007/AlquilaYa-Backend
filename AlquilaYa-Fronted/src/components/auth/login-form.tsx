'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Mail, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { PasswordInput } from '@/components/ui/password-input';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';
import { notify } from '@/lib/notify';
import { loginSchema, type LoginFormData } from '@/schemas/auth-schema';
import { getLastLoginMethod, setLastLoginMethod } from '@/lib/last-login-method';
import { servicioAuth, Requiere2faError } from '@/services/auth-service';

export function LoginForm() {
  const { iniciarSesion, loginConGoogle, inicializar } = useAuth();
  const { close, open: openAuthModal, consumeNextUrl } = useAuthModal();
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  // Si el login se bloquea por correo sin verificar, guardamos el correo para ofrecer verificación.
  const [correoSinVerificar, setCorreoSinVerificar] = useState<string | null>(null);
  // Ítem 229: si la cuenta tiene 2FA activo, el password fue correcto pero falta el código
  // TOTP — guardamos el correo para completar el segundo paso sin pedirlo de nuevo.
  const [correoPendiente2fa, setCorreoPendiente2fa] = useState<string | null>(null);
  const [codigo2fa, setCodigo2fa] = useState('');
  const [verificando2fa, setVerificando2fa] = useState(false);
  // Solo lee localStorage: este componente nunca aparece en el HTML del servidor (el
  // modal empieza cerrado y no persiste `isOpen`), así que no hay riesgo de mismatch SSR.
  const ultimoMetodo = getLastLoginMethod();

  // Ítem 428: el destino post-login depende del rol, que solo se conoce cuando la API
  // responde — no se puede prefetchear el destino exacto de antemano, pero SÍ el set fijo
  // de paneles posibles, así `redirigirPorRol` navega a una ruta que ya está "tibia".
  useEffect(() => {
    router.prefetch('/admin-master');
    router.prefetch('/landlord/dashboard');
  }, [router]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { correo: '', password: '' },
  });

  // Redirect post-login inteligente (#200): si el modal se abrió desde una acción
  // protegida (o `/login?next=`), vuelve ahí en vez de aplicar el destino fijo por rol.
  const redirigirPorRol = (rol: string) => {
    close();
    const next = consumeNextUrl();
    if (next) {
      router.push(next);
      return;
    }
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
    setCorreoPendiente2fa(null);
    try {
      const usuario = await iniciarSesion(data.correo, data.password);
      if (!usuario) return;
      setLastLoginMethod('EMAIL');
      redirigirPorRol(usuario.rol);
    } catch (err) {
      // Ítem 229: password correcto, falta el código de la app autenticadora — no es un
      // error de credenciales, es un segundo paso. Mostramos el input de código en vez del
      // mensaje genérico (de lo contrario, activar 2FA dejaría al usuario sin poder entrar).
      if (err instanceof Requiere2faError) {
        setCorreoPendiente2fa(err.correo);
        return;
      }
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

  const onSubmit2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correoPendiente2fa || codigo2fa.length !== 6) return;
    setVerificando2fa(true);
    try {
      const usuario = await servicioAuth.verificarTotpLogin(correoPendiente2fa, codigo2fa);
      if (!usuario) {
        notify.error(null, 'Código incorrecto. Inténtalo de nuevo.');
        return;
      }
      await inicializar(); // hidrata useAuthStore con la sesión que el backend ya activó
      setLastLoginMethod('EMAIL');
      redirigirPorRol(usuario.rol);
    } catch (err) {
      notify.error(err, 'Código incorrecto. Inténtalo de nuevo.');
    } finally {
      setVerificando2fa(false);
    }
  };

  if (correoPendiente2fa) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-7" aria-hidden />
        </div>
        <header className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Verificación en dos pasos</h2>
          <p className="text-sm text-muted-foreground">
            Ingresa el código de 6 dígitos de tu app autenticadora.
          </p>
        </header>
        <form onSubmit={onSubmit2fa} className="space-y-4">
          <InputOTP
            maxLength={6}
            inputMode="numeric"
            pattern={REGEXP_ONLY_DIGITS}
            autoComplete="one-time-code"
            value={codigo2fa}
            onChange={setCodigo2fa}
            disabled={verificando2fa}
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <Button
            type="submit"
            size="lg"
            loading={verificando2fa}
            disabled={codigo2fa.length !== 6}
            className="h-11 w-full rounded-full text-sm font-bold tracking-wide shadow-md shadow-primary/20"
          >
            Confirmar
          </Button>
        </form>
        <button
          type="button"
          onClick={() => { setCorreoPendiente2fa(null); setCodigo2fa(''); }}
          className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Volver
        </button>
      </div>
    );
  }


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
        <div className="rounded-xl border border-warning/20 bg-warning-light p-3 text-sm">
          <p className="font-semibold text-warning">Verifica tu correo para entrar</p>
          <p className="mt-0.5 text-xs text-warning/80">
            Tu cuenta requiere verificar <strong>{correoSinVerificar}</strong>. Revisa tu bandeja (y spam).
          </p>
          <Button
            type="button"
            onClick={irAVerificar}
            className="mt-2 h-8 rounded-lg bg-warning px-3 text-xs font-bold text-warning-foreground hover:bg-warning/90"
          >
            Verificar correo
          </Button>
        </div>
      )}

      {/* Último método usado (#183): evita que alguien que solo tiene cuenta de Google
          intente loguearse con una contraseña que nunca creó. */}
      {ultimoMetodo === 'GOOGLE' && (
        <p className="text-center text-[11px] font-semibold text-primary">
          La última vez entraste con Google
        </p>
      )}

      {/* Google primero */}
      <GoogleLoginButton
        onSuccess={async (credential) => {
          setGoogleLoading(true);
          try {
            const usuario = await loginConGoogle(credential, 'ESTUDIANTE');
            if (usuario) {
              setLastLoginMethod('GOOGLE');
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

      {/* Separador */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">o con tu correo</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Campos */}
      <Form {...form}>
        <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          {ultimoMetodo === 'EMAIL' && (
            <p className="text-center text-[11px] font-semibold text-muted-foreground">
              La última vez entraste con tu correo
            </p>
          )}
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
                  <PasswordInput
                    {...field}
                    showIcon
                    autoComplete="current-password"
                    placeholder="Contraseña"
                  />
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
            loading={form.formState.isSubmitting}
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
