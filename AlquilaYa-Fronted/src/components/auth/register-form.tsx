'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuthModal } from '@/stores/auth-modal-store';
import { cn } from '@/lib/cn';
import { registerSchema, type RegisterFormData } from '@/schemas/auth-schema';

import { LandlordDetailsStep } from './landlord-details-step';
import { OtpStep } from './otp-step';
import { ResultStep } from './result-step';
import { RoleStep } from './role-step';
import { StudentDetailsStep } from './student-details-step';

export function RegisterForm() {
  const { step, targetRole, personal, setPersonal, setStep, toggleView } = useAuthModal();
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
    <div className="space-y-6">
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

      <RoleStep />

      <Form {...form}>
        <form className="grid grid-cols-2 gap-3" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} placeholder="Nombre" autoComplete="given-name" className="h-12 rounded-xl bg-input text-sm" />
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
                  <Input {...field} placeholder="Apellido" autoComplete="family-name" className="h-12 rounded-xl bg-input text-sm" />
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
                    className="h-12 rounded-xl bg-input text-sm"
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
              <FormItem className="col-span-2">
                <FormControl>
                  <Input {...field} type="email" autoComplete="email" placeholder="Correo" className="h-12 rounded-xl bg-input text-sm" />
                </FormControl>
                <FormMessage className="px-1 text-[10px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Contraseña"
                      className={cn('h-12 rounded-xl bg-input pr-11 text-sm')}
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
                <FormMessage className="px-1 text-[10px]" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            className="col-span-2 mt-2 h-12 rounded-full text-sm font-bold tracking-wide shadow-lg shadow-primary/20"
          >
            Siguiente paso
          </Button>
        </form>
      </Form>

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
