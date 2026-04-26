'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';
import { notify } from '@/lib/notify';
import { landlordDetailsSchema, type LandlordDetailsFormData } from '@/schemas/auth-schema';

const MapPicker = dynamic(() => import('@/components/shared/MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[200px] w-full animate-pulse items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground">
      Cargando mapa…
    </div>
  ),
});

export function LandlordDetailsStep() {
  const { registrarse } = useAuth();
  const { personal, landlordDetails, setLandlordDetails, setStep } = useAuthModal();
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);

  const form = useForm<LandlordDetailsFormData>({
    resolver: zodResolver(landlordDetailsSchema),
    defaultValues: {
      ruc: landlordDetails?.ruc ?? '',
      direccionCuartos: landlordDetails?.direccionCuartos ?? '',
      latitud: landlordDetails?.latitud ?? (null as unknown as number),
      longitud: landlordDetails?.longitud ?? (null as unknown as number),
    },
  });

  const lat = form.watch('latitud');
  const lng = form.watch('longitud');

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
          { headers: { 'User-Agent': 'AlquilaYa-App' } },
        );
        const data = await res.json();
        if (data?.display_name) {
          form.setValue('direccionCuartos', data.display_name, { shouldValidate: true });
        }
      } catch {
        // El usuario puede escribir la dirección manualmente.
      }
    },
    [form],
  );

  const onMapMove = useCallback(
    (newLat: number, newLng: number) => {
      form.setValue('latitud', newLat, { shouldValidate: true });
      form.setValue('longitud', newLng, { shouldValidate: true });
      reverseGeocode(newLat, newLng);
    },
    [form, reverseGeocode],
  );

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      notify.error(null, 'Tu navegador no soporta geolocalización');
      return;
    }
    setObteniendoUbicacion(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        form.setValue('latitud', latitude, { shouldValidate: true });
        form.setValue('longitud', longitude, { shouldValidate: true });
        reverseGeocode(latitude, longitude);
        setObteniendoUbicacion(false);
      },
      (err) => {
        notify.error(err, 'No pudimos obtener tu ubicación. Revisa los permisos.');
        setObteniendoUbicacion(false);
      },
    );
  };

  const onSubmit = async (data: LandlordDetailsFormData) => {
    if (!personal) {
      notify.error(null, 'Faltan datos personales');
      setStep('personal');
      return;
    }

    setLandlordDetails({
      ruc: data.ruc ?? '',
      direccionCuartos: data.direccionCuartos,
      latitud: data.latitud,
      longitud: data.longitud,
    });

    try {
      await registrarse(
        personal.nombre,
        personal.apellido,
        personal.dni,
        personal.correo,
        personal.password,
        'ARRENDADOR',
        {
          ruc: data.ruc ?? '',
          direccionCuartos: data.direccionCuartos,
          latitud: data.latitud,
          longitud: data.longitud,
          esEmpresa: !!data.ruc,
        },
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
          Datos del arrendador
        </h2>
        <p className="text-sm text-muted-foreground">
          Necesitamos saber dónde están tus cuartos.
        </p>
      </header>

      <Form {...form}>
        <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="ruc"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} placeholder="RUC (para facturación, opcional)" className="h-12 rounded-xl bg-input text-sm" />
                </FormControl>
                <FormMessage className="px-1 text-[10px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="direccionCuartos"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Input {...field} placeholder="Dirección de tus cuartos" className="h-12 rounded-xl bg-input pr-10 text-sm" />
                    <MapPin className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  </div>
                </FormControl>
                <FormMessage className="px-1 text-[10px]" />
              </FormItem>
            )}
          />

          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={obteniendoUbicacion}
            className="flex items-center gap-2 text-xs font-bold text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
          >
            {obteniendoUbicacion ? (
              <Loader2 className="size-4 animate-spin" />
            ) : lat ? (
              <CheckCircle2 className="size-4 text-green-600" />
            ) : (
              <MapPin className="size-4" />
            )}
            {obteniendoUbicacion
              ? 'Obteniendo GPS…'
              : lat
                ? 'Ubicación GPS capturada'
                : 'Detectar mi ubicación GPS exacta'}
          </button>

          {lat && lng && (
            <div className="space-y-2">
              <div className="flex justify-between px-1 text-[10px] text-muted-foreground">
                <span>
                  Lat: {lat.toFixed(4)} · Lng: {lng.toFixed(4)}
                </span>
                <span className="font-bold text-primary">Mueve el marcador</span>
              </div>
              <MapPicker lat={lat} lng={lng} onPositionChange={onMapMove} />
            </div>
          )}

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
