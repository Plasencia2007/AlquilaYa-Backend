'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Eye, EyeOff, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { PasswordStrength } from '@/components/auth/password-strength';
import { ActiveSessions } from '@/components/auth/active-sessions';
import { useAuth } from '@/hooks/use-auth';
import { studentProfileService } from '@/services/student-profile-service';
import { notify } from '@/lib/notify';
import {
  cambioPasswordSchema,
  type CambioPasswordData,
} from '@/schemas/student-profile-schema';

/* ── Input de contraseña con ojo ── */
function PasswordInput({ field, placeholder, autoComplete }: {
  field: React.InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> };
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...field}
        type={show ? 'text' : 'password'}
        placeholder={placeholder ?? '••••••••'}
        autoComplete={autoComplete}
        className="h-11 w-full rounded-xl border border-input bg-input px-4 pr-11 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
        aria-label={show ? 'Ocultar' : 'Ver'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

/* ── Banner Google ── */
function GoogleAccountBanner() {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
        <ShieldAlert className="size-5 text-amber-600 dark:text-amber-400" />
      </span>
      <div>
        <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
          Cuenta vinculada con Google
        </p>
        <p className="mt-1 text-xs leading-relaxed text-amber-700 dark:text-amber-400/80">
          Tu cuenta usa Google para iniciar sesión, por lo que la contraseña se gestiona directamente desde{' '}
          <span className="font-semibold">myaccount.google.com</span>.
          Aquí no puedes cambiarla.
        </p>
      </div>
    </div>
  );
}

/* ── Checklist de fortaleza de la contraseña ── */
const TIPS = [
  'Al menos 8 caracteres',
  'Letras mayúsculas y minúsculas',
  'Al menos un número',
  'Al menos un símbolo (!@#$…)',
];

/* ── Security Tab principal ── */
export function SecurityTab() {
  const { usuario } = useAuth();
  const esGoogle = usuario?.tipoLogin === 'GOOGLE';

  const form = useForm<CambioPasswordData>({
    resolver: zodResolver(cambioPasswordSchema),
    defaultValues: { actual: '', nueva: '', confirmar: '' },
  });

  const nueva = form.watch('nueva');

  const onSubmit = async (data: CambioPasswordData) => {
    try {
      await studentProfileService.cambiarPassword(data);
      notify.success('Contraseña actualizada correctamente');
      form.reset({ actual: '', nueva: '', confirmar: '' });
    } catch (err) {
      notify.error(err, 'No pudimos cambiar tu contraseña');
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Sección cambio de contraseña ── */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">

        {/* Cabecera */}
        <div className="relative flex items-center gap-4 border-b border-border bg-gradient-to-r from-primary/5 via-transparent to-transparent px-6 py-5">
          <div className="absolute left-0 top-0 h-full w-1 rounded-l-3xl bg-primary" />
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <Lock className="size-5 text-primary" />
          </span>
          <div>
            <h3 className="text-sm font-extrabold tracking-tight text-foreground">Cambiar contraseña</h3>
            <p className="text-xs text-muted-foreground">
              {esGoogle
                ? 'Gestionada por tu cuenta de Google'
                : 'Actualiza tu contraseña regularmente para mayor seguridad'}
            </p>
          </div>
          <span className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${esGoogle ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
            <ShieldCheck className="size-3" />
            {esGoogle ? 'Google OAuth' : 'Cuenta local'}
          </span>
        </div>

        <div className="p-6">
          {esGoogle ? (
            <GoogleAccountBanner />
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
              {/* Formulario */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                  <FormField
                    control={form.control}
                    name="actual"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Contraseña actual
                        </Label>
                        <FormControl>
                          <PasswordInput field={field} autoComplete="current-password" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="nueva"
                      render={({ field }) => (
                        <FormItem>
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Nueva contraseña
                          </Label>
                          <FormControl>
                            <PasswordInput field={field} autoComplete="new-password" />
                          </FormControl>
                          <PasswordStrength password={field.value} />
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmar"
                      render={({ field }) => (
                        <FormItem>
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Confirmar contraseña
                          </Label>
                          <FormControl>
                            <PasswordInput field={field} autoComplete="new-password" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={form.formState.isSubmitting}
                      className="rounded-full px-8 gap-2"
                    >
                      <Lock className="size-4" />
                      {form.formState.isSubmitting ? 'Cambiando…' : 'Actualizar contraseña'}
                    </Button>
                  </div>
                </form>
              </Form>

              {/* Checklist lateral */}
              <aside className="hidden lg:block w-52 shrink-0">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Tu contraseña debe tener
                </p>
                <ul className="space-y-2.5">
                  {TIPS.map((tip) => (
                    <li key={tip} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className={`mt-0.5 size-3.5 shrink-0 ${nueva.length > 0 ? 'text-primary' : 'text-muted-foreground/30'}`} />
                      {tip}
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          )}
        </div>
      </div>

      {/* ── Sesiones activas ── */}
      <ActiveSessions />

    </div>
  );
}
