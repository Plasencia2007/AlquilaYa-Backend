'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { adminSettingsService } from '@/services/admin-settings-service';
import { MetodoVerificacionCard } from '@/components/admin/metodo-verificacion-card';

const MIN_HORAS = 1;
const MAX_HORAS = 720; // 30 días

const configReservaSchema = z.object({
  horas: z.coerce
    .number({ message: 'Ingresa un número válido' })
    .int('Debe ser un número entero')
    .min(MIN_HORAS, `Mínimo ${MIN_HORAS} hora`)
    .max(MAX_HORAS, `Máximo ${MAX_HORAS} horas`),
});
type ConfigReservaFormData = z.infer<typeof configReservaSchema>;

export default function AdminSettingsPage() {
  const [valorActual, setValorActual] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [guardadoOk, setGuardadoOk] = useState(false);

  const form = useForm<ConfigReservaFormData>({
    resolver: zodResolver(configReservaSchema),
    defaultValues: { horas: MIN_HORAS },
  });

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargar = async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const config = await adminSettingsService.obtenerConfiguracionReserva();
      setValorActual(config.expiracionHoras);
      form.reset({ horas: config.expiracionHoras });
    } catch {
      setErrorCarga('No se pudo cargar la configuración. Verifica tu sesión de administrador.');
    } finally {
      setCargando(false);
    }
  };

  const guardar = async ({ horas }: ConfigReservaFormData) => {
    setGuardadoOk(false);
    setGuardando(true);
    try {
      const config = await adminSettingsService.actualizarConfiguracionReserva(horas);
      setValorActual(config.expiracionHoras);
      form.reset({ horas: config.expiracionHoras });
      setGuardadoOk(true);
    } catch {
      form.setError('horas', { message: 'No se pudo guardar el cambio. Inténtalo de nuevo.' });
    } finally {
      setGuardando(false);
    }
  };

  const horasActuales = form.watch('horas');
  const sinCambios = valorActual !== null && Number(horasActuales) === valorActual;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400 p-6 max-w-3xl">
      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-2xl">
            settings_applications
          </span>
        </div>
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter">
            Reglas de la Plataforma
          </h1>
          <p className="text-muted-foreground font-medium opacity-70">
            Parámetros globales del sistema de reservas.
          </p>
        </div>
      </div>

      {/* Tarjeta: expiración de reservas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Expiración de reservas sin pago</CardTitle>
          <CardDescription>
            Una reserva <strong>APROBADA</strong> que no se paga dentro de este plazo pasa
            automáticamente a <strong>EXPIRADA</strong> y libera el cuarto para otros estudiantes.
          </CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(guardar)}>
            <CardContent className="space-y-4">
              {cargando ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  Cargando configuración…
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="horas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horas para pagar tras la aprobación</FormLabel>
                      <div className="flex items-center gap-3">
                        <FormControl>
                          <Input
                            type="number"
                            min={MIN_HORAS}
                            max={MAX_HORAS}
                            className="w-32"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              setGuardadoOk(false);
                            }}
                          />
                        </FormControl>
                        <span className="text-muted-foreground text-sm">horas</span>
                        {valorActual !== null && (
                          <span className="text-xs text-muted-foreground opacity-70">
                            (valor actual: {valorActual}h)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground opacity-70">
                        Entre {MIN_HORAS} y {MAX_HORAS} horas. El cambio aplica sin reiniciar el
                        servicio, en la siguiente ejecución del job de expiración (cada hora).
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {errorCarga && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  {errorCarga}
                </div>
              )}
              {guardadoOk && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-600/10 rounded-md px-3 py-2">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  Cambios guardados. El nuevo plazo es de {valorActual}h.
                </div>
              )}
            </CardContent>

            <CardFooter className="gap-3">
              <Button type="submit" disabled={cargando || guardando || sinCambios}>
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={cargar}
                disabled={cargando || guardando}
              >
                Restablecer
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {/* Método de verificación (#3) */}
      <MetodoVerificacionCard />
    </div>
  );
}
