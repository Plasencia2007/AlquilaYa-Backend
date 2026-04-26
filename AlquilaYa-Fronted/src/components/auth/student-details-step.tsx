'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';
import { notify } from '@/lib/notify';
import { studentDetailsSchema, type StudentDetailsFormData } from '@/schemas/auth-schema';

export function StudentDetailsStep() {
  const { registrarse } = useAuth();
  const { personal, studentDetails, setStudentDetails, setStep } = useAuthModal();

  const form = useForm<StudentDetailsFormData>({
    resolver: zodResolver(studentDetailsSchema),
    defaultValues: {
      universidad: studentDetails?.universidad ?? 'Universidad Peruana Unión',
      codigoEstudiante: studentDetails?.codigoEstudiante ?? '',
      carrera: studentDetails?.carrera ?? '',
      ciclo: studentDetails?.ciclo ?? '',
    },
  });

  const onSubmit = async (data: StudentDetailsFormData) => {
    if (!personal) {
      notify.error(null, 'Faltan datos personales');
      setStep('personal');
      return;
    }

    setStudentDetails(data);

    try {
      await registrarse(
        personal.nombre,
        personal.apellido,
        personal.dni,
        personal.correo,
        personal.password,
        'ESTUDIANTE',
        data,
        personal.telefono,
      );
      setStep('otp');
    } catch (err) {
      notify.error(err, 'No se pudo completar el registro. Verifica tus datos.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-headline text-2xl font-bold tracking-tight text-foreground">
          Casi terminamos
        </h2>
        <p className="text-sm text-muted-foreground">
          Necesitamos estos datos para verificar tu perfil estudiantil.
        </p>
      </header>

      <Form {...form}>
        <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="universidad"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} placeholder="Universidad" className="h-12 rounded-xl bg-input text-sm" />
                </FormControl>
                <FormMessage className="px-1 text-[10px]" />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="codigoEstudiante"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} placeholder="Código" className="h-12 rounded-xl bg-input text-sm" />
                  </FormControl>
                  <FormMessage className="px-1 text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ciclo"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} inputMode="numeric" placeholder="Ciclo (1-12)" className="h-12 rounded-xl bg-input text-sm" />
                  </FormControl>
                  <FormMessage className="px-1 text-[10px]" />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="carrera"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} placeholder="Carrera" className="h-12 rounded-xl bg-input text-sm" />
                </FormControl>
                <FormMessage className="px-1 text-[10px]" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full rounded-full text-sm font-bold tracking-wide shadow-lg shadow-primary/20"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Registrando…' : 'Finalizar registro'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full text-xs font-bold text-muted-foreground hover:text-primary"
            onClick={() => setStep('personal')}
          >
            Volver
          </Button>
        </form>
      </Form>
    </div>
  );
}
