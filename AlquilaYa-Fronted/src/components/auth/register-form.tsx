'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';

import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input';
import { PasswordStrength } from './password-strength';


import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuthModal } from '@/stores/auth-modal-store';
import { cn } from '@/lib/cn';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { registerSchema, type RegisterFormData } from '@/schemas/auth-schema';

import { LandlordDetailsStep } from './landlord-details-step';
import { OtpStep } from './otp-step';
import { ResultStep } from './result-step';
import { RoleStep } from './role-step';
import { StudentDetailsStep } from './student-details-step';

export function RegisterForm() {
  const { step, targetRole, personal, setPersonal, setStep, toggleView, setRole } = useAuthModal();

  const [showPassword, setShowPassword] = useState(false);

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

  if (step === 'details') {
    return targetRole === 'ARRENDADOR' ? <LandlordDetailsStep /> : <StudentDetailsStep />;
  }
  if (step === 'otp') return <OtpStep />;
  if (step === 'result') return <ResultStep />;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="font-headline text-2xl font-bold tracking-tight text-foreground">
          Crea tu cuenta
        </h2>
        <p className="text-sm text-muted-foreground">
          {targetRole === 'ARRENDADOR'
            ? 'Regístrate como arrendador profesional.'
            : 'Únete como estudiante en segundos.'}
        </p>
      </header>

      <Tabs
        value={targetRole}
        onValueChange={(v) => setRole(v as 'ESTUDIANTE' | 'ARRENDADOR')}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 rounded-xl h-10 bg-muted p-1">
          <TabsTrigger value="ESTUDIANTE" className="h-full rounded-lg text-sm font-bold tracking-wide">
            Estudiante
          </TabsTrigger>
          <TabsTrigger value="ARRENDADOR" className="h-full rounded-lg text-sm font-bold tracking-wide">
            Arrendador
          </TabsTrigger>
        </TabsList>
      </Tabs>


      <Form {...form}>
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} placeholder="Nombre" autoComplete="given-name" className="h-11 rounded-xl bg-input text-sm" />
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
                <FormControl>
                  <Input {...field} placeholder="Apellido" autoComplete="family-name" className="h-11 rounded-xl bg-input text-sm" />
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
                <FormControl>
                  <Input
                    {...field}
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="DNI"
                    className="h-11 rounded-xl bg-input text-sm"
                  />
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
                <FormControl>
                  <PhoneInput
                    international
                    defaultCountry="PE"
                    value={field.value}
                    onChange={(v) => field.onChange(v ?? '')}
                    className="alquilaya-phone-input"
                  />
                </FormControl>
                <FormMessage className="px-1 text-[10px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="correo"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormControl>
                  <Input {...field} type="email" autoComplete="email" placeholder="Correo" className="h-11 rounded-xl bg-input text-sm" />
                </FormControl>
                <FormMessage className="px-1 text-[10px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Contraseña"
                      className={cn('h-11 rounded-xl bg-input pr-11 text-sm')}
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
                <PasswordStrength password={field.value} />
                <FormMessage className="px-1 text-[10px]" />
              </FormItem>
            )}

          />

          <Button
            type="submit"
            size="lg"
            className="mt-1 h-11 rounded-full text-sm font-bold tracking-wide shadow-lg shadow-primary/20 sm:col-span-2"
          >
            Siguiente paso
          </Button>
        </form>
      </Form>

      {/* Separador */}
      <div className="relative flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground">o regístrate con</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Botón Google */}
      <GoogleRegisterButton
        rolPreferido={targetRole}
        onSuccess={() => {
          setStep('result');
        }}
      />

      <p className="text-center text-xs text-muted-foreground">
        ¿Ya eres miembro?{' '}
        <button
          type="button"
          onClick={toggleView}
          className="font-bold text-primary transition-colors hover:text-primary/80"
        >
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
