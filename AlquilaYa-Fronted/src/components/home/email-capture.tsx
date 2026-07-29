'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BellRing, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { RevealOnScroll } from '@/components/motion';
import { getZonasCached } from '@/lib/zonas-cache';
import type { ZonaResolucion } from '@/services/universidad-service';
import { alertaService } from '@/services/alerta-service';
import { notify } from '@/lib/notify';

const schema = z.object({
  correo: z.string().trim().min(1, 'Ingresa tu correo').email('Correo no válido'),
  zonaId: z.string().min(1, 'Elige tu zona'),
});
type FormData = z.infer<typeof schema>;

export function EmailCapture() {
  const [zonas, setZonas] = useState<ZonaResolucion[]>([]);
  const [cargandoZonas, setCargandoZonas] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { correo: '', zonaId: '' },
  });

  // zonaId es un campo controlado por el Combobox (no un <input> nativo): se registra a mano
  // para que react-hook-form lo valide y lo incluya en el submit.
  useEffect(() => {
    register('zonaId');
  }, [register]);

  useEffect(() => {
    let cancelado = false;
    getZonasCached()
      .then((data) => {
        if (!cancelado) setZonas(data);
      })
      .finally(() => {
        if (!cancelado) setCargandoZonas(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // Zonas del catálogo como opciones. Si un nombre se repite entre universidades
  // (roadmap multi-universidad), se desambigua con la universidad.
  const zonaOptions = useMemo<ComboboxOption[]>(() => {
    const repetidos = new Map<string, number>();
    zonas.forEach((z) => repetidos.set(z.nombre, (repetidos.get(z.nombre) ?? 0) + 1));
    return zonas.map((z) => ({
      value: String(z.id),
      label: (repetidos.get(z.nombre) ?? 0) > 1 ? `${z.nombre} · ${z.universidadNombre}` : z.nombre,
    }));
  }, [zonas]);

  const zonaId = watch('zonaId');

  const zonaPlaceholder = cargandoZonas
    ? 'Cargando zonas…'
    : zonaOptions.length === 0
      ? 'Zonas no disponibles'
      : '¿En qué zona buscas?';

  const onSubmit = async (data: FormData) => {
    const zona = zonas.find((z) => String(z.id) === data.zonaId);
    try {
      await alertaService.suscribir({
        correo: data.correo,
        zonaId: zona?.id,
        universidadId: zona?.universidadId,
      });
      notify.success(
        'Revisa tu correo',
        'Te enviamos un enlace para confirmar tu alerta. Cuando la confirmes, te avisaremos de nuevos cuartos en tu zona.',
      );
      reset();
    } catch (err) {
      notify.error(err, 'No pudimos crear tu alerta. Inténtalo de nuevo.');
    }
  };

  return (
    <section className="px-6 py-16 sm:px-12 md:py-24">
      <RevealOnScroll className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-card p-8 text-center shadow-sm md:p-12">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BellRing className="size-7" aria-hidden />
        </div>
        <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">
          Avísame de nuevos cuartos en mi zona
        </h2>
        <p className="mx-auto mb-8 max-w-xl text-sm text-muted-foreground md:text-base">
          Elige tu zona y déjanos tu correo. Te enviaremos un aviso cada vez que se publique un
          cuarto que encaje con lo que buscas.
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="mx-auto flex max-w-2xl flex-col gap-3 text-left sm:flex-row sm:items-start"
        >
          <div className="flex-1">
            <label htmlFor="ec-zona" className="sr-only">
              Zona
            </label>
            <Combobox
              options={zonaOptions}
              value={zonaId}
              onChange={(v) => setValue('zonaId', v, { shouldValidate: true })}
              placeholder={zonaPlaceholder}
              searchPlaceholder="Busca tu zona…"
              emptyText="Sin zonas."
              disabled={cargandoZonas || zonaOptions.length === 0}
              className="h-10"
            />
            {errors.zonaId ? (
              <p className="mt-1.5 px-1 text-xs font-medium text-destructive">
                {errors.zonaId.message}
              </p>
            ) : null}
          </div>
          <div className="flex-1">
            <label htmlFor="ec-correo" className="sr-only">
              Correo
            </label>
            <Input
              id="ec-correo"
              type="email"
              placeholder="tu@correo.com"
              autoComplete="email"
              aria-invalid={!!errors.correo}
              {...register('correo')}
            />
            {errors.correo ? (
              <p className="mt-1.5 px-1 text-xs font-medium text-destructive">
                {errors.correo.message}
              </p>
            ) : null}
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 shrink-0 px-6 font-bold"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : 'Avísame'}
          </Button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          Sin spam. Confirmas por correo y puedes darte de baja cuando quieras.
        </p>
      </RevealOnScroll>
    </section>
  );
}
