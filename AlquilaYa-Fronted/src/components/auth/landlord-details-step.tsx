'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Locate, Loader2, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';
import { notify } from '@/lib/notify';
import { servicioAuth } from '@/services/auth-service';
import { profileService } from '@/services/profile-service';
import { landlordDetailsSchema, type LandlordDetailsFormData } from '@/schemas/auth-schema';

const MapPicker = dynamic(() => import('@/components/shared/MapPicker'), { ssr: false });

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface RucVerificacionResponse {
  success: boolean;
  razonSocial?: string;
  direccion?: string;
  message?: string;
}

interface Props {
  /** ítem 184: token de Turnstile capturado en el paso anterior (personal), reenviado
   *  al registrar — mismo dato que ya recibe StudentDetailsStep. */
  turnstileToken?: string;
}

export function LandlordDetailsStep({ turnstileToken }: Props) {
  const { registrarse } = useAuth();
  const { personal, landlordDetails, setLandlordDetails, setStep } = useAuthModal();

  const [gettingLocation, setGettingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Verificación de RUC en vivo (SUNAT) ── */
  const [verificandoRuc, setVerificandoRuc] = useState(false);
  const [rucVerificado, setRucVerificado] = useState<{ razonSocial?: string } | null>(null);
  const [rucNoVerificado, setRucNoVerificado] = useState(false);

  const form = useForm<LandlordDetailsFormData>({
    resolver: zodResolver(landlordDetailsSchema),
    defaultValues: {
      ruc: landlordDetails?.ruc ?? '',
      direccionCuartos: landlordDetails?.direccionCuartos ?? '',
      latitud: landlordDetails?.latitud ?? undefined,
      longitud: landlordDetails?.longitud ?? undefined,
    },
  });

  const rucValue = form.watch('ruc');

  useEffect(() => {
    if (!rucValue || rucValue.length !== 11) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setVerificandoRuc(true);
      try {
        const res = (await profileService.verificarRuc(rucValue)) as RucVerificacionResponse;
        if (cancelled) return;
        if (res?.success) {
          setRucVerificado({ razonSocial: res.razonSocial });
        } else {
          setRucNoVerificado(true);
        }
      } catch {
        if (!cancelled) setRucNoVerificado(true);
      } finally {
        if (!cancelled) setVerificandoRuc(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [rucValue]);

  /* ── Búsqueda de dirección (Nominatim forward geocoding) ── */
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setSearchResults([]);
    if (!q.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=4&countrycodes=pe`,
        );
        const data: NominatimResult[] = await res.json();
        setSearchResults(data);
      } catch {
        /* silent */
      } finally {
        setSearching(false);
      }
    }, 450);
  };

  const selectResult = (r: NominatimResult) => {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    form.setValue('latitud', lat, { shouldValidate: true });
    form.setValue('longitud', lon, { shouldValidate: true });
    form.setValue('direccionCuartos', r.display_name.split(',').slice(0, 3).join(', '), { shouldValidate: true });
    setSearchQuery('');
    setSearchResults([]);
  };

  /* ── GPS ── */
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      notify.error(null, 'Tu navegador no soporta geolocalización');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lon } = coords;
        form.setValue('latitud', lat, { shouldValidate: true });
        form.setValue('longitud', lon, { shouldValidate: true });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
          );
          const data = await res.json();
          const addr = (data.display_name as string | undefined)
            ? (data.display_name as string).split(',').slice(0, 3).join(', ')
            : `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
          form.setValue('direccionCuartos', addr, { shouldValidate: true });
        } catch {
          form.setValue('direccionCuartos', `${lat.toFixed(5)}, ${lon.toFixed(5)}`);
        }
        setGettingLocation(false);
      },
      (err) => {
        notify.error(null, err.code === 1 ? 'Permiso de ubicación denegado' : 'No se pudo obtener tu ubicación');
        setGettingLocation(false);
      },
    );
  };

  /* ── MapPicker: arrastrar/clic el marcador ── */
  const handlePositionChange = async (lat: number, lon: number) => {
    form.setValue('latitud', lat, { shouldValidate: true });
    form.setValue('longitud', lon, { shouldValidate: true });
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      );
      const data = await res.json();
      if (data.display_name) {
        form.setValue('direccionCuartos', (data.display_name as string).split(',').slice(0, 3).join(', '), { shouldValidate: true });
      }
    } catch { /* silent */ }
  };

  const onSubmit = async (data: LandlordDetailsFormData) => {
    if (!personal) {
      notify.error(null, 'Faltan datos personales');
      setStep('personal');
      return;
    }
    const detalles = { ...data, ruc: data.ruc ?? '', latitud: data.latitud ?? null, longitud: data.longitud ?? null };
    setLandlordDetails(detalles);
    try {
      await registrarse(personal.nombre, personal.apellido, personal.dni, personal.correo, personal.password, 'ARRENDADOR', detalles, personal.telefono, turnstileToken);
      let metodo = 'WHATSAPP_OTP';
      try { metodo = await servicioAuth.obtenerMetodoVerificacion(); } catch { /* fallback */ }
      if (metodo === 'WHATSAPP_OTP' || metodo === 'AMBOS') setStep('otp');
      else if (metodo === 'EMAIL') setStep('email-code');
      else setStep('result');
    } catch (err) {
      notify.error(err, 'No se pudo completar el registro. Verifica tus datos.');
    }
  };

  const lat = form.watch('latitud');
  const lon = form.watch('longitud');

  return (
    <div className="space-y-5">
      <header>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-primary">Perfil arrendador</p>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Ubicación de tus cuartos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Marca en el mapa dónde están — así aparecerás en búsquedas cercanas a campus.
        </p>
      </header>

      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>

          {/* ── Buscador de dirección ── */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Busca la dirección</p>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Escribe una calle, avenida o referencia…"
                className="h-11 w-full rounded-xl border border-input bg-input pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {searching && (
                <Loader2 className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
              {searchQuery && !searching && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            {searchResults.length > 0 && (
              <ul className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                {searchResults.map((r) => (
                  <li key={r.place_id}>
                    <button
                      type="button"
                      onClick={() => selectResult(r)}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/60"
                    >
                      {r.display_name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── GPS ── */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDetectLocation}
            disabled={gettingLocation}
            className="h-9 w-full gap-2 rounded-xl border-dashed text-xs font-semibold text-muted-foreground"
          >
            {gettingLocation
              ? <><Loader2 className="size-3.5 animate-spin" /> Obteniendo ubicación…</>
              : <><Locate className="size-3.5" /> Usar mi ubicación actual (GPS)</>}
          </Button>

          {/* ── Mapa interactivo ── */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">O arrastra el marcador en el mapa</p>
            <div className="h-[190px] overflow-hidden rounded-2xl border border-border">
              <MapPicker
                lat={lat ?? -12.0464}
                lng={lon ?? -77.0428}
                onPositionChange={handlePositionChange}
              />
            </div>
            {lat !== undefined && lon !== undefined && (
              <p className="text-[10px] text-muted-foreground/60">
                {lat.toFixed(5)}, {lon.toFixed(5)}
              </p>
            )}
          </div>

          {/* ── Dirección confirmada ── */}
          <FormField
            control={form.control}
            name="direccionCuartos"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">Dirección confirmada</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Se completa al elegir en el mapa o GPS"
                    className="h-11 rounded-xl bg-input text-sm"
                  />
                </FormControl>
                <FormMessage className="px-1 text-[10px]" />
              </FormItem>
            )}
          />

          {/* ── RUC opcional (verificación en vivo con SUNAT) ── */}
          <FormField
            control={form.control}
            name="ruc"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  RUC <span className="font-normal text-muted-foreground/60">(opcional · para facturación)</span>
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      autoFocus
                      inputMode="numeric"
                      maxLength={11}
                      placeholder="20123456789"
                      className="h-11 rounded-xl bg-input pr-10 text-sm"
                      onChange={(e) => {
                        field.onChange(e);
                        setRucVerificado(null);
                        setRucNoVerificado(false);
                        setVerificandoRuc(false);
                      }}
                    />
                    {verificandoRuc && (
                      <Loader2 className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </FormControl>
                <FormMessage className="px-1 text-[10px]" />
                {rucVerificado && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs font-medium text-emerald-600">
                    <CheckCircle className="size-3.5 shrink-0" />
                    <span>
                      ¿Eres <strong className="font-bold">{rucVerificado.razonSocial ?? 'esta empresa'}</strong>?
                    </span>
                  </div>
                )}
                {rucNoVerificado && !verificandoRuc && (
                  <p className="px-1 text-[11px] text-muted-foreground/60">
                    No pudimos verificar el RUC con SUNAT. Puedes continuar sin problema.
                  </p>
                )}
              </FormItem>
            )}
          />

          {/* Error de coordenadas */}
          <FormField
            control={form.control}
            name="latitud"
            render={() => (
              <FormItem>
                <FormMessage className="px-1 text-[10px]" />
              </FormItem>
            )}
          />

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
