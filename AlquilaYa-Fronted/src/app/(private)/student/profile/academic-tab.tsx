'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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
  datosAcademicosSchema,
  type DatosAcademicosData,
} from '@/schemas/student-profile-schema';

export function AcademicTab() {
  const form = useForm<DatosAcademicosData>({
    resolver: zodResolver(datosAcademicosSchema),
    defaultValues: {
      universidad: 'Universidad Peruana Unión',
      codigoEstudiante: '',
      carrera: '',
      ciclo: '',
    },
  });

  const onSubmit = async (data: DatosAcademicosData) => {
    try {
      await studentProfileService.actualizarAcademico(data);
      notify.success('Datos académicos actualizados');
    } catch (err) {
      notify.error(err, 'No pudimos actualizar tus datos');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="universidad"
          render={({ field }) => (
            <FormItem>
              <Label className="text-xs font-bold uppercase tracking-wider">Universidad</Label>
              <FormControl>
                <Input {...field} className="h-11" />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="codigoEstudiante"
            render={({ field }) => (
              <FormItem>
                <Label className="text-xs font-bold uppercase tracking-wider">Código</Label>
                <FormControl>
                  <Input {...field} className="h-11" placeholder="2024xxxxx" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ciclo"
            render={({ field }) => (
              <FormItem>
                <Label className="text-xs font-bold uppercase tracking-wider">Ciclo</Label>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="numeric"
                    maxLength={2}
                    className="h-11"
                    placeholder="5"
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="carrera"
          render={({ field }) => (
            <FormItem>
              <Label className="text-xs font-bold uppercase tracking-wider">Carrera</Label>
              <FormControl>
                <Input {...field} className="h-11" placeholder="Ingeniería de Sistemas" />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full sm:w-auto"
        >
          {form.formState.isSubmitting ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </form>
    </Form>
  );
}
