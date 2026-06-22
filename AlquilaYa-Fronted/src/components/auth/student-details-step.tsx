'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';
import { notify } from '@/lib/notify';
import { servicioAuth } from '@/services/auth-service';
import { studentDetailsSchema, type StudentDetailsFormData } from '@/schemas/auth-schema';
import { universidadService, type Universidad } from '@/services/universidad-service';
import { carreraService, type Carrera } from '@/services/carrera-service';

const SELECT_CLASS =
  'h-12 w-full rounded-xl border border-input bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60';

export function StudentDetailsStep() {
  const { registrarse } = useAuth();
  const { personal, studentDetails, setStudentDetails, setStep } = useAuthModal();

  const [universidades, setUniversidades] = useState<Universidad[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);

  useEffect(() => {
    let cancel = false;
    Promise.allSettled([
      universidadService.listarActivas(),
      carreraService.listarActivas(),
    ]).then(([u, c]) => {
      if (cancel) return;
      setUniversidades(u.status === 'fulfilled' && Array.isArray(u.value) ? u.value : []);
      setCarreras(c.status === 'fulfilled' && Array.isArray(c.value) ? c.value : []);
      setCargandoCatalogo(false);
    });
    return () => { cancel = true; };
  }, []);

  const form = useForm<StudentDetailsFormData>({
    resolver: zodResolver(studentDetailsSchema),
    defaultValues: {
      universidad: studentDetails?.universidad ?? '',
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
      // El siguiente paso depende del método elegido por el admin (#3):
      // teléfono → OTP WhatsApp; solo email → código por correo; ninguno → directo.
      let metodo: string = 'WHATSAPP_OTP';
      try {
        metodo = await servicioAuth.obtenerMetodoVerificacion();
      } catch {
        /* fallback seguro: comportamiento histórico (OTP) */
      }
      if (metodo === 'WHATSAPP_OTP' || metodo === 'AMBOS') setStep('otp');
      else if (metodo === 'EMAIL') setStep('email-code');
      else setStep('result');
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
                  {cargandoCatalogo ? (
                    <select disabled className={SELECT_CLASS}>
                      <option>Cargando universidades…</option>
                    </select>
                  ) : universidades.length > 0 ? (
                    <select {...field} className={SELECT_CLASS}>
                      <option value="" disabled>Selecciona tu universidad</option>
                      {universidades.map((u) => (
                        <option key={u.id} value={u.nombre}>{u.nombre}</option>
                      ))}
                    </select>
                  ) : (
                    <select disabled className={SELECT_CLASS}>
                      <option>No hay universidades en el catálogo</option>
                    </select>
                  )}
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
                  {cargandoCatalogo ? (
                    <select disabled className={SELECT_CLASS}>
                      <option>Cargando carreras…</option>
                    </select>
                  ) : carreras.length > 0 ? (
                    <select {...field} className={SELECT_CLASS}>
                      <option value="" disabled>Selecciona tu carrera</option>
                      {carreras.map((c) => (
                        <option key={c.id} value={c.nombre}>{c.nombre}</option>
                      ))}
                    </select>
                  ) : (
                    <select disabled className={SELECT_CLASS}>
                      <option>No hay carreras en el catálogo</option>
                    </select>
                  )}
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
