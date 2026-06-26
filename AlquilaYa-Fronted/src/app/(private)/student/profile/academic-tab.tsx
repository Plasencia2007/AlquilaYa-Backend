'use client';

import { useEffect, useState } from 'react';
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
import { useAuth } from '@/hooks/use-auth';
import { studentProfileService } from '@/services/student-profile-service';
import { carreraService, type Carrera } from '@/services/carrera-service';
import { notify } from '@/lib/notify';
import {
  datosAcademicosSchema,
  type DatosAcademicosData,
} from '@/schemas/student-profile-schema';

const SELECT_CLASS =
  'h-11 w-full rounded-xl border border-input bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 appearance-none';

const CICLOS = Array.from({ length: 12 }, (_, i) => i + 1);

export function AcademicTab() {
  const { usuario } = useAuth();
  const perfilId = usuario?.perfilId;
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [loading,  setLoading]  = useState(true);

  const form = useForm<DatosAcademicosData>({
    resolver: zodResolver(datosAcademicosSchema),
    defaultValues: {
      universidad:      'Universidad Peruana Unión',
      codigoEstudiante: '',
      carrera:          '',
      ciclo:            '',
    },
  });

  // Lista de carreras disponibles
  useEffect(() => {
    carreraService
      .listarActivas()
      .then((data) => setCarreras(Array.isArray(data) ? data : []))
      .catch(() => setCarreras([]))
      .finally(() => setLoading(false));
  }, []);

  // Datos académicos ya guardados → precargar el formulario
  useEffect(() => {
    if (!perfilId) return;
    studentProfileService
      .obtenerInfo(perfilId)
      .then((info) => {
        form.reset({
          universidad:      info.universidad || 'Universidad Peruana Unión',
          codigoEstudiante: info.codigoEstudiante ?? '',
          carrera:          info.carrera ?? '',
          ciclo:            info.ciclo != null ? String(info.ciclo) : '',
        });
      })
      .catch(() => {
        /* sin datos previos: se mantienen los valores por defecto */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfilId]);

  const onSubmit = async (data: DatosAcademicosData) => {
    try {
      await studentProfileService.actualizarAcademico(data);
      notify.success('Datos académicos actualizados');
    } catch (err) {
      notify.error(err, 'No pudimos actualizar tus datos');
    }
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

          {/* Universidad (solo lectura) */}
          <FormField
            control={form.control}
            name="universidad"
            render={({ field }) => (
              <FormItem>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Universidad
                </Label>
                <FormControl>
                  <Input {...field} readOnly className="h-11 rounded-xl bg-muted/50 cursor-default" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Código + Ciclo */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="codigoEstudiante"
              render={({ field }) => (
                <FormItem>
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Código de estudiante
                  </Label>
                  <FormControl>
                    <Input {...field} placeholder="2024xxxxx" className="h-11 rounded-xl" />
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
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Ciclo
                  </Label>
                  <FormControl>
                    <select {...field} className={SELECT_CLASS}>
                      <option value="">Selecciona tu ciclo</option>
                      {CICLOS.map((c) => (
                        <option key={c} value={String(c)}>
                          {c}° ciclo
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          {/* Carrera */}
          <FormField
            control={form.control}
            name="carrera"
            render={({ field }) => (
              <FormItem>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Carrera
                </Label>
                <FormControl>
                  {carreras.length > 0 ? (
                    <select {...field} disabled={loading} className={SELECT_CLASS}>
                      <option value="">Selecciona tu carrera</option>
                      {carreras.map((c) => (
                        <option key={c.id} value={c.nombre}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      {...field}
                      placeholder={loading ? 'Cargando carreras…' : 'Ingeniería de Sistemas'}
                      disabled={loading}
                      className="h-11 rounded-xl"
                    />
                  )}
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-full px-6"
              onClick={() => form.reset()}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={form.formState.isSubmitting}
              className="rounded-full px-6 gap-2"
            >
              {form.formState.isSubmitting ? 'Guardando…' : 'Guardar cambios →'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
