'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';
import { notify } from '@/lib/notify';
import { servicioAuth } from '@/services/auth-service';
import { studentDetailsSchema, type StudentDetailsFormData } from '@/schemas/auth-schema';
import { universidadService, type Universidad } from '@/services/universidad-service';
import { carreraService, type Carrera } from '@/services/carrera-service';

const SELECT_CLASS =
  'h-11 w-full rounded-xl border border-input bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 appearance-none';

const CICLOS = Array.from({ length: 12 }, (_, i) => i + 1);

interface StudentDetailsStepProps {
  /** Token de Cloudflare Turnstile (#184) capturado en el paso anterior (datos personales).
   *  Puede llegar `undefined` (widget sin sitekey configurado, caso normal en desarrollo). */
  turnstileToken?: string;
}

export function StudentDetailsStep({ turnstileToken }: StudentDetailsStepProps) {
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
      await registrarse(personal.nombre, personal.apellido, personal.dni, personal.correo, personal.password, 'ESTUDIANTE', data, personal.telefono, turnstileToken);
      let metodo = 'WHATSAPP_OTP';
      try { metodo = await servicioAuth.obtenerMetodoVerificacion(); } catch { /* fallback */ }
      if (metodo === 'WHATSAPP_OTP' || metodo === 'AMBOS') setStep('otp');
      else if (metodo === 'EMAIL') setStep('email-code');
      else setStep('result');
    } catch (err) {
      notify.error(err, 'No se pudo completar el registro. Verifica tus datos.');
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-primary">Perfil estudiantil</p>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Datos académicos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Con esta info personalizamos tus búsquedas y verificamos tu perfil.
        </p>
      </header>

      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>

          {/* Universidad */}
          <FormField
            control={form.control}
            name="universidad"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">Universidad</FormLabel>
                <FormControl>
                  {cargandoCatalogo ? (
                    <select disabled className={SELECT_CLASS}>
                      <option>Cargando universidades…</option>
                    </select>
                  ) : universidades.length > 0 ? (
                    <select {...field} autoFocus className={SELECT_CLASS}>
                      <option value="" disabled>Selecciona tu universidad</option>
                      {universidades.map((u) => (
                        <option key={u.id} value={u.nombre}>{u.nombre}</option>
                      ))}
                    </select>
                  ) : (
                    <Input {...field} autoFocus placeholder="Escribe el nombre de tu universidad" className="h-11 rounded-xl bg-input text-sm" />
                  )}
                </FormControl>
                <FormMessage className="px-1 text-[10px]" />
              </FormItem>
            )}
          />

          {/* Carrera */}
          <FormField
            control={form.control}
            name="carrera"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">Carrera</FormLabel>
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
                    <Input {...field} placeholder="Ej: Ingeniería de Sistemas" className="h-11 rounded-xl bg-input text-sm" />
                  )}
                </FormControl>
                <FormMessage className="px-1 text-[10px]" />
              </FormItem>
            )}
          />

          {/* Ciclo + Código en grid */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="ciclo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">Ciclo actual</FormLabel>
                  <FormControl>
                    <select {...field} className={SELECT_CLASS}>
                      <option value="" disabled>Ciclo</option>
                      {CICLOS.map((n) => (
                        <option key={n} value={String(n)}>{n}° ciclo</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="px-1 text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="codigoEstudiante"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">Código de estudiante</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ej: 202015043" className="h-11 rounded-xl bg-input text-sm" />
                  </FormControl>
                  <FormMessage className="px-1 text-[10px]" />
                </FormItem>
              )}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full rounded-full text-sm font-bold tracking-wide"
            loading={form.formState.isSubmitting}
          >
            Finalizar registro →
          </Button>

          <button
            type="button"
            onClick={() => setStep('personal')}
            className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Volver
          </button>
        </form>
      </Form>
    </div>
  );
}
