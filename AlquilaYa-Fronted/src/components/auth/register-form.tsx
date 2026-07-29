'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input';
import { PasswordStrength } from './password-strength';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { useAuthModal } from '@/stores/auth-modal-store';
import { registerSchema, type RegisterFormData } from '@/schemas/auth-schema';

import { LandlordDetailsStep } from './landlord-details-step';
import { OtpStep } from './otp-step';
import { EmailCodeStep } from './email-code-step';
import { ResultStep } from './result-step';
import { RoleStep } from './role-step';
import { StudentDetailsStep } from './student-details-step';
import { TurnstileWidget } from './turnstile-widget';

export function RegisterForm() {
  const { step, targetRole, personal, setPersonal, setStep, open } = useAuthModal();

  // ítem 184: token del widget anti-bots (opcional — si el sitekey no está configurado el
  // widget nunca renderiza y esto se queda undefined para siempre, lo cual es el caso normal
  // en desarrollo; el backend degrada a "permitir" cuando no llega token).
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>(undefined);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nombre: personal?.nombre ?? '',
      apellido: personal?.apellido ?? '',
      dni: personal?.dni ?? '',
      correo: personal?.correo ?? '',
      password: personal?.password ?? '',
      telefono: personal?.telefono ?? '',
      rol: targetRole,
      aceptaTerminos: false,
    },
  });

  useEffect(() => {
    form.setValue('rol', targetRole);
  }, [targetRole, form]);


  const onSubmit = (data: RegisterFormData) => {
    setPersonal({
      nombre: data.nombre,
      apellido: data.apellido,
      dni: data.dni,
      correo: data.correo,
      password: data.password,
      telefono: data.telefono,
    });
    setStep('details');
  };

  if (step === 'role') return <RoleStep />;
  if (step === 'details') {
    return targetRole === 'ARRENDADOR'
      ? <LandlordDetailsStep turnstileToken={turnstileToken} />
      : <StudentDetailsStep turnstileToken={turnstileToken} />;
  }
  if (step === 'otp') return <OtpStep />;
  if (step === 'email-code') return <EmailCodeStep />;
  if (step === 'result') return <ResultStep />;

  return (
    <div className="space-y-5">
      <header>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-primary">Datos personales</p>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Cuéntanos sobre ti</h2>
        <p className="mt-1 text-sm text-muted-foreground">Solo tarda 30 segundos, prometido</p>
      </header>

      {/* Google PRIMERO */}
      <GoogleRegisterButton rolPreferido={targetRole} onSuccess={() => setStep('result')} />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">o con tu correo</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} autoFocus placeholder="Tu nombre" autoComplete="given-name" className="h-11 rounded-xl bg-input text-sm" />
                  </FormControl>
                  <FormMessage className="px-1 text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apellido"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">Apellido</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Tu apellido" autoComplete="family-name" className="h-11 rounded-xl bg-input text-sm" />
                  </FormControl>
                  <FormMessage className="px-1 text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dni"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">DNI</FormLabel>
                  <FormControl>
                    <Input {...field} inputMode="numeric" maxLength={8} placeholder="12345678" className="h-11 rounded-xl bg-input text-sm" />
                  </FormControl>
                  <FormMessage className="px-1 text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">Teléfono</FormLabel>
                  <FormControl>
                    <PhoneInput international defaultCountry="PE" value={field.value} onChange={(v) => field.onChange(v ?? '')} className="alquilaya-phone-input" />
                  </FormControl>
                  <FormMessage className="px-1 text-[10px]" />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="correo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">Correo electrónico</FormLabel>
                <FormControl>
                  <Input {...field} type="email" autoComplete="email" placeholder="tu@correo.com" className="h-11 rounded-xl bg-input text-sm" />
                </FormControl>
                <FormMessage className="px-1 text-[10px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Contraseña{' '}
                  <span className="font-normal text-muted-foreground/70">(mín. 8 car., mayúscula, número y símbolo)</span>
                </FormLabel>
                <FormControl>
                  <PasswordInput
                    {...field}
                    autoComplete="new-password"
                    placeholder="••••••••"
                  />
                </FormControl>
                <PasswordStrength password={field.value} />
                <FormMessage className="px-1 text-[10px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="aceptaTerminos"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-start gap-2.5">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                      className="mt-0.5"
                    />
                  </FormControl>
                  {/* FormLabel setea htmlFor = mismo id que FormControl inyecta en el Checkbox
                      (vía Slot) — clic en el texto activa el checkbox nativamente, sin handler
                      manual. Los <a> cortan la propagación para no togglear el checkbox al abrir
                      el link. */}
                  <FormLabel className="text-xs font-normal leading-relaxed text-muted-foreground">
                    Acepto los{' '}
                    <a
                      href="/terminos"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-primary hover:underline"
                    >
                      Términos y condiciones
                    </a>{' '}
                    y la{' '}
                    <a
                      href="/privacidad"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-primary hover:underline"
                    >
                      Política de privacidad
                    </a>
                  </FormLabel>
                </div>
                <FormMessage className="px-1 text-[10px]" />
              </FormItem>
            )}
          />

          {/* ítem 184: invisible salvo comportamiento sospechoso; sin sitekey no renderiza nada */}
          <TurnstileWidget
            onVerify={(token) => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken(undefined)}
            className="flex justify-center"
          />

          <Button type="submit" size="lg" className="h-12 w-full rounded-full text-sm font-bold tracking-wide">
            Siguiente paso →
          </Button>
        </form>
      </Form>

      <button
        type="button"
        onClick={() => setStep('role')}
        className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Volver a elegir rol
      </button>

      <p className="text-center text-xs text-muted-foreground">
        ¿Ya eres miembro?{' '}
        <button type="button" onClick={() => open('login')} className="font-bold text-primary transition-colors hover:text-primary/80">
          Inicia sesión
        </button>
      </p>
    </div>
  );
}

/* ─── Botón de Google para Registro ─── */
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/hooks/use-auth';
import { notify } from '@/lib/notify';
import { useRouter } from 'next/navigation';
import { useThemeStore } from '@/stores/theme-store';

function GoogleRegisterButton({
  rolPreferido,
  onSuccess,
}: {
  rolPreferido: string;
  onSuccess: () => void;
}) {
  const { loginConGoogle } = useAuth();
  const { close } = useAuthModal();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
        onSuccess={async (resp) => {
          if (!resp.credential) return;
          setLoading(true);
          try {
            const usuario = await loginConGoogle(resp.credential, rolPreferido);
            if (usuario) {
              close();
              switch (usuario.rol) {
                case 'ARRENDADOR':
                  router.push('/landlord/dashboard');
                  break;
                default:
                  router.push('/');
              }
            }
          } catch (err) {
            notify.error(err, 'Error al registrarse con Google');
          } finally {
            setLoading(false);
          }
        }}
        onError={() => {
          notify.error('No se pudo conectar con Google', 'Error de Google');
        }}
        theme={theme === 'dark' ? 'filled_black' : 'outline'}
        size="large"
        shape="pill"
        text="signup_with"
        width="100%"
      />
    </div>
  );
}
