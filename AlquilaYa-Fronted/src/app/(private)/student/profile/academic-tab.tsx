'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
import { universidadService, type Universidad } from '@/services/universidad-service';
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
  const [loadingCarreras, setLoadingCarreras] = useState(true);
  const [errorCarreras, setErrorCarreras] = useState(false);

  // Ítem 226: catálogo de universidades (Fase 2 multi-universidad) para el selector real.
  const [universidades, setUniversidades] = useState<Universidad[]>([]);
  const [loadingUniversidades, setLoadingUniversidades] = useState(true);
  const [errorUniversidades, setErrorUniversidades] = useState(false);

  const form = useForm<DatosAcademicosData>({
    resolver: zodResolver(datosAcademicosSchema),
    defaultValues: {
      universidad:      'Universidad Peruana Unión',
      universidadId:    undefined,
      codigoEstudiante: '',
      carrera:          '',
      ciclo:            '',
    },
  });

  // Lista de carreras disponibles (ítem 227: ya no falla en silencio — ver errorCarreras abajo).
  useEffect(() => {
    carreraService
      .listarActivas()
      .then((data) => setCarreras(Array.isArray(data) ? data : []))
      .catch(() => {
        setCarreras([]);
        setErrorCarreras(true);
        notify.error(null, 'No pudimos cargar la lista de carreras. Puedes escribirla manualmente.');
      })
      .finally(() => setLoadingCarreras(false));
  }, []);

  // Lista de universidades disponibles (ítem 226).
  useEffect(() => {
    universidadService
      .listarActivas()
      .then((data) => setUniversidades(Array.isArray(data) ? data : []))
      .catch(() => {
        setUniversidades([]);
        setErrorUniversidades(true);
        notify.error(null, 'No pudimos cargar la lista de universidades. Puedes escribirla manualmente.');
      })
      .finally(() => setLoadingUniversidades(false));
  }, []);

  // Datos académicos ya guardados → precargar el formulario
  useEffect(() => {
    if (!perfilId) return;
    studentProfileService
      .obtenerInfo(perfilId)
      .then((info) => {
        form.reset({
          universidad:      info.universidad || 'Universidad Peruana Unión',
          universidadId:    info.universidadId ?? undefined,
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

          {/* Universidad (ítem 226: selector real sobre el catálogo multi-universidad) */}
          <FormField
            control={form.control}
            name="universidad"
            render={({ field }) => (
              <FormItem>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Universidad
                </Label>
                <FormControl>
                  {universidades.length > 0 ? (
                    <Combobox
                      options={universidades.map((u) => ({ value: String(u.id), label: u.nombre }))}
                      value={form.watch('universidadId') != null ? String(form.watch('universidadId')) : undefined}
                      onChange={(val) => {
                        const u = universidades.find((x) => String(x.id) === val);
                        form.setValue('universidadId', u ? u.id : undefined, { shouldDirty: true });
                        field.onChange(u ? u.nombre : '');
                      }}
                      disabled={loadingUniversidades}
                      placeholder="Selecciona tu universidad"
                      searchPlaceholder="Buscar universidad…"
                      emptyText="No encontramos esa universidad."
                    />
                  ) : loadingUniversidades ? (
                    <Skeleton className="h-11 w-full rounded-xl" />
                  ) : (
                    <div className="space-y-1.5">
                      <Input {...field} placeholder="Universidad Peruana Unión" className="h-11 rounded-xl" />
                      {errorUniversidades && (
                        <p className="text-xs text-warning">
                          No pudimos cargar las universidades — escríbela manualmente.
                        </p>
                      )}
                    </div>
                  )}
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
                    <Combobox
                      options={carreras.map((c) => ({ value: c.nombre, label: c.nombre }))}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={loadingCarreras}
                      placeholder="Selecciona tu carrera"
                      searchPlaceholder="Buscar carrera…"
                      emptyText="No encontramos esa carrera."
                    />
                  ) : loadingCarreras ? (
                    <Skeleton className="h-11 w-full rounded-xl" />
                  ) : (
                    <div className="space-y-1.5">
                      <Input {...field} placeholder="Ingeniería de Sistemas" className="h-11 rounded-xl" />
                      {errorCarreras && (
                        <p className="text-xs text-warning">
                          No pudimos cargar las carreras — escríbela manualmente.
                        </p>
                      )}
                    </div>
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
