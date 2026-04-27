'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import { PasswordStrength } from '@/components/auth/password-strength';


import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { studentProfileService } from '@/services/student-profile-service';
import { notify } from '@/lib/notify';
import {
  cambioPasswordSchema,
  type CambioPasswordData,
} from '@/schemas/student-profile-schema';

export function SecurityTab() {
  const form = useForm<CambioPasswordData>({
    resolver: zodResolver(cambioPasswordSchema),
    defaultValues: { actual: '', nueva: '', confirmar: '' },
  });

  const onSubmit = async (data: CambioPasswordData) => {
    try {
      await studentProfileService.cambiarPassword(data);
      notify.success('Contraseña actualizada');
      form.reset({ actual: '', nueva: '', confirmar: '' });
    } catch (err) {
      notify.error(err, 'No pudimos cambiar tu contraseña');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-4">
        <p className="text-sm text-muted-foreground">
          Usa al menos 8 caracteres. Combina letras, números y símbolos para mayor seguridad.
        </p>

        <FormField
          control={form.control}
          name="actual"
          render={({ field }) => (
            <FormItem>
              <Label className="text-xs font-bold uppercase tracking-wider">
                Contraseña actual
              </Label>
              <FormControl>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input {...field} type="password" className="h-11 pl-9" autoComplete="current-password" />
                </div>
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nueva"
          render={({ field }) => (
            <FormItem>
              <Label className="text-xs font-bold uppercase tracking-wider">
                Nueva contraseña
              </Label>
              <FormControl>
                <Input {...field} type="password" className="h-11" autoComplete="new-password" />
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
              <Label className="text-xs font-bold uppercase tracking-wider">
                Confirmar contraseña
              </Label>
              <FormControl>
                <Input {...field} type="password" className="h-11" autoComplete="new-password" />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Cambiando…' : 'Cambiar contraseña'}
        </Button>
      </form>
    </Form>
  );
}
