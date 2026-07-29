'use client';

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { propiedadService, type PrecioSugerido } from '@/services/landlord-property-service';
import {
  catalogosService,
  type CatalogosActivos,
} from '@/services/catalogos-service';
import { useAuthStore } from '@/stores/auth-store';
import { useDraft } from '@/hooks/use-draft';
import { borradorService, type BorradorPayload } from '@/services/borrador-service';
import { notify } from '@/lib/notify';
import { Stepper, type StepperStep } from '@/components/ui/stepper';
import type { StagedImage } from '@/components/ui/image-uploader';
import {
  UPEU_COORDS,
  UPEU_RADIO_MAX_KM,
  distanciaHaversineKm,
  formatearDistancia,
  geocodificarDireccion,
  resolverZona,
  reverseGeocode,
} from '@/lib/geo';
import { universidadService, type ZonaResolucion } from '@/services/universidad-service';
import { cn } from '@/lib/cn';
import type {
  CrearPropiedadRequest,
  PeriodoAlquiler,
  ServicioConEstado,
  TipoPropiedad,
} from '@/types/propiedad';

import { resolveIcon } from './property-form-icons';
import {
  INITIAL_FORM,
  MAX_IMAGES,
  type Errores,
  type FormState,
} from './property-form-types';
import { InfoBasicaSection } from './info-basica-section';
import { UbicacionSection } from './ubicacion-section';
import { DetallesSection } from './detalles-section';
import { ServiciosSection } from './servicios-section';
import { ReglasSection } from './reglas-section';
import { FotosSidebar } from './fotos-sidebar';
import { AccionesSidebar } from './acciones-sidebar';

// =============================================================================
// Wizard multi-paso (ítem 332) — SOLO en mobile (`lg:hidden`); en desktop las 6
// secciones se muestran todas en scroll continuo, como antes. Cada paso declara
// qué campos de `FormState` valida antes de dejar avanzar (los pasos sin campos
// obligatorios, como Servicios/Reglas, no bloquean el avance).
// =============================================================================

type StepKey = keyof FormState | 'imagen';

interface WizardStep extends StepperStep {
  fields: StepKey[];
}

const WIZARD_STEPS: WizardStep[] = [
  { key: 'info', label: 'Datos', fields: ['titulo', 'descripcion', 'precio'] },
  { key: 'ubicacion', label: 'Ubicación', fields: ['direccion', 'latitud', 'longitud'] },
  {
    key: 'detalles',
    label: 'Detalles',
    fields: ['area', 'nroPiso', 'deposito', 'numDormitorios', 'numBanos', 'capacidadPersonas'],
  },
  { key: 'servicios', label: 'Servicios', fields: [] },
  { key: 'reglas', label: 'Reglas', fields: [] },
  { key: 'fotos', label: 'Fotos', fields: ['imagen'] },
];

function stepIndexForField(field: string): number {
  const idx = WIZARD_STEPS.findIndex((s) => s.fields.includes(field as StepKey));
  return idx === -1 ? 0 : idx;
}

// =============================================================================
// Página principal
// =============================================================================

export default function AddPropertyPage() {
  const router = useRouter();
  const { usuario } = useAuthStore();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  // Inmueble completo (departamento/mini depa/casa): exige declarar la distribución.
  const esInmuebleCompleto = ['DEPARTAMENTO', 'MINI_DEPA', 'CASA'].includes(form.tipoPropiedad);

  // Retomar un borrador del servidor (?borrador=<id>). En ese caso se desactiva el autosave local.
  const searchParams = useSearchParams();
  const borradorParam = searchParams.get('borrador');
  const [draftId, setDraftId] = useState<number | null>(borradorParam ? Number(borradorParam) : null);
  const [guardandoBorrador, setGuardandoBorrador] = useState(false);
  const [fechaProgramada, setFechaProgramada] = useState('');

  // Autoguardado LOCAL (localStorage) mientras se redacta; off si se retoma un borrador del servidor.
  const draftKey = `alquilaya:draft:add-propiedad:${usuario?.id ?? usuario?.perfilId ?? 'anon'}`;
  const { status: draftStatus, restaurado: draftRestaurado, limpiar: limpiarDraft } = useDraft(
    draftKey,
    form,
    setForm,
    {
      enabled: !!usuario && !borradorParam,
      hasContent: (f) => Boolean(f.titulo || f.descripcion || f.precio || f.direccion),
    },
  );
  const [errores, setErrores] = useState<Errores>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Paso actual del wizard mobile (ítem 332). Irrelevante en desktop (`lg:`), donde
  // todas las secciones se ven a la vez sin importar este valor.
  const [currentStep, setCurrentStep] = useState(0);

  /** Mueve el wizard al paso que contiene `field` y hace scroll a él (mobile). */
  const jumpToField = (field: string) => {
    setCurrentStep(stepIndexForField(field));
    setTimeout(() => {
      document.querySelector(`[data-field="${field}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  /** Avanza un paso del wizard mobile, bloqueando si el paso actual tiene campos inválidos. */
  const goToNextStep = () => {
    const stepFields = WIZARD_STEPS[currentStep].fields;
    if (stepFields.length > 0) {
      const validationErrors = validar();
      const stepErrors = Object.fromEntries(
        Object.entries(validationErrors).filter(([k]) => stepFields.includes(k as StepKey)),
      ) as Errores;
      if (Object.keys(stepErrors).length > 0) {
        setErrores((prev) => ({ ...prev, ...stepErrors }));
        jumpToField(Object.keys(stepErrors)[0]);
        return;
      }
    }
    setCurrentStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToPrevStep = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Visibilidad de una sección según el paso del wizard: solo en mobile (`lg:` siempre visible). */
  const stepVisibleCls = (idx: number) => cn(currentStep === idx ? 'block' : 'hidden', 'lg:block');

  const [images, setImages] = useState<StagedImage[]>([]);
  /** Imágenes agregadas por URL externa (no consumen Cloudinary). Se adjuntan tras crear. */
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');

  const [requestingGeo, setRequestingGeo] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [catalogos, setCatalogos] = useState<CatalogosActivos | null>(null);
  const [cargandoCat, setCargandoCat] = useState(true);
  const [zonas, setZonas] = useState<ZonaResolucion[]>([]);

  useEffect(() => {
    let cancel = false;
    catalogosService
      .obtenerActivos()
      .then((data) => { if (!cancel) setCatalogos(data); })
      .catch(() => {})
      .finally(() => { if (!cancel) setCargandoCat(false); });
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    let cancel = false;
    universidadService
      .listarZonasActivas()
      .then((data) => { if (!cancel) setZonas(data); })
      .catch(() => {});
    return () => { cancel = true; };
  }, []);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrores((prev) => {
      if (!prev[key]) return prev;
      const { [key]: _drop, ...rest } = prev;
      return rest as Errores;
    });
  };

  const onInput = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setField(name as keyof FormState, value as never);
  };

  const tiposOptions = useMemo(() => {
    const fromCat = catalogos?.TIPO_CUARTO ?? [];
    if (fromCat.length) {
      return fromCat.map((i) => ({
        value: i.valor as TipoPropiedad,
        label: i.nombre,
        icon: resolveIcon(i.icono),
        description: i.descripcion,
      }));
    }
    return [
      { value: 'CUARTO_INDIVIDUAL' as TipoPropiedad, label: 'Cuarto individual', icon: 'bed' },
      { value: 'CUARTO_COMPARTIDO' as TipoPropiedad, label: 'Cuarto compartido', icon: 'bunk_bed' },
      { value: 'DEPARTAMENTO' as TipoPropiedad, label: 'Departamento', icon: 'apartment' },
      { value: 'MINI_DEPA' as TipoPropiedad, label: 'Mini depa', icon: 'home_work' },
      { value: 'CASA' as TipoPropiedad, label: 'Casa', icon: 'house' },
      { value: 'SUITE' as TipoPropiedad, label: 'Suite', icon: 'hotel' },
    ];
  }, [catalogos]);

  const periodosOptions = useMemo(() => {
    const fromCat = catalogos?.PERIODO_ALQUILER ?? [];
    if (fromCat.length) {
      return fromCat.map((i) => ({
        value: i.valor as PeriodoAlquiler,
        label: i.nombre,
        icon: resolveIcon(i.icono),
      }));
    }
    return [
      { value: 'DIARIO' as PeriodoAlquiler, label: 'Diario', icon: 'today' },
      { value: 'MENSUAL' as PeriodoAlquiler, label: 'Mensual', icon: 'calendar_month' },
      { value: 'SEMESTRAL' as PeriodoAlquiler, label: 'Semestral', icon: 'event_repeat' },
      { value: 'ANUAL' as PeriodoAlquiler, label: 'Anual', icon: 'calendar_today' },
    ];
  }, [catalogos]);

  const onImagesChange = (next: StagedImage[]) => {
    setImages(next);
    if (next.length > 0 || imageUrls.length > 0) {
      setErrores((p) => { const { imagen: _omit, ...rest } = p; return rest; });
    }
  };

  /** Valida un enlace DIRECTO a imagen (https + extensión). Refleja al backend. */
  const esUrlImagenDirecta = (url: string): boolean => {
    try {
      const u = new URL(url);
      return u.protocol === 'https:' && /\.(jpe?g|png|webp|gif|avif)$/i.test(u.pathname);
    } catch {
      return false;
    }
  };

  const agregarImagenUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (images.length + imageUrls.length >= MAX_IMAGES) {
      setErrores((p) => ({ ...p, imagen: `Máximo ${MAX_IMAGES} fotos.` }));
      return;
    }
    if (!esUrlImagenDirecta(url)) {
      setErrores((p) => ({
        ...p,
        imagen: 'Pega un enlace DIRECTO a una imagen (.jpg/.png/.webp). Los de Google/Drive no sirven.',
      }));
      return;
    }
    setImageUrls((prev) => [...prev, url]);
    setUrlInput('');
    setErrores((p) => {
      const { imagen: _omit, ...rest } = p;
      return rest;
    });
  };

  const removeImagenUrl = (index: number) =>
    setImageUrls((prev) => prev.filter((_, i) => i !== index));

  const usarMiUbicacion = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setErrores((p) => ({ ...p, latitud: 'Tu navegador no soporta geolocalización.' }));
      return;
    }
    setRequestingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void onPinChange(pos.coords.latitude, pos.coords.longitude);
        setRequestingGeo(false);
      },
      () => {
        setErrores((p) => ({
          ...p,
          latitud: 'No pudimos obtener tu ubicación. Permite el acceso e inténtalo otra vez.',
        }));
        setRequestingGeo(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  /** Geocodifica la dirección escrita y coloca el pin (re-ubicación a demanda). */
  const ubicarDireccion = async () => {
    const dir = form.direccion.trim();
    if (dir.length < 5) {
      setGeoMsg('Escribe una dirección más completa para ubicarla.');
      return;
    }
    setGeocoding(true);
    setGeoMsg(null);
    try {
      const r = await geocodificarDireccion(dir);
      if (r) {
        setField('latitud', r.lat.toFixed(6));
        setField('longitud', r.lng.toFixed(6));
        setGeoMsg('Ubicación encontrada. Ajusta el pin en el mapa si hace falta.');
      } else {
        setGeoMsg('No se encontró la dirección. Ubícala manualmente en el mapa.');
      }
    } finally {
      setGeocoding(false);
    }
  };

  /**
   * El arrendador movió el pin (arrastrar/clic en el mapa). Fija las coordenadas y, si la
   * dirección está vacía, la autocompleta con reverse geocoding (no pisa una ya escrita).
   */
  const onPinChange = async (lat: number, lng: number) => {
    setField('latitud', lat.toFixed(6));
    setField('longitud', lng.toFixed(6));
    if (!form.direccion.trim()) {
      const dir = await reverseGeocode(lat, lng);
      if (dir) {
        setField('direccion', dir.slice(0, 255));
        setGeoMsg('Dirección autocompletada del pin. Ajústala si hace falta.');
      }
    }
  };

  // Auto-geocoding al escribir (debounced): solo si AÚN no hay pin, para no pisar uno
  // colocado a mano. Da el punto inicial; el arrendador lo ajusta arrastrando el pin.
  useEffect(() => {
    if (form.latitud || form.longitud) return;
    const dir = form.direccion.trim();
    if (dir.length < 10) return;
    const t = setTimeout(async () => {
      setGeocoding(true);
      const r = await geocodificarDireccion(dir);
      setGeocoding(false);
      if (r) {
        setField('latitud', r.lat.toFixed(6));
        setField('longitud', r.lng.toFixed(6));
        setGeoMsg('Ubicación detectada de la dirección. Ajusta el pin si hace falta.');
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [form.direccion, form.latitud, form.longitud]);

  const distanciaUpeu = useMemo(() => {
    const lat = parseFloat(form.latitud);
    const lng = parseFloat(form.longitud);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return distanciaHaversineKm({ lat, lng }, UPEU_COORDS);
  }, [form.latitud, form.longitud]);

  // Zona en la que cae el pin actual (misma lógica que el backend). null = fuera de cobertura.
  const zonaActual = useMemo(() => {
    const lat = parseFloat(form.latitud);
    const lng = parseFloat(form.longitud);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return resolverZona({ lat, lng }, zonas);
  }, [form.latitud, form.longitud, zonas]);

  // Precio sugerido: estadísticas de avisos parecidos según la zona resuelta + el tipo.
  const [precioSugerido, setPrecioSugerido] = useState<PrecioSugerido | null>(null);
  useEffect(() => {
    const zid = zonaActual?.id;
    const uid = zonaActual?.universidadId;
    if (zid == null && uid == null) {
      setPrecioSugerido(null);
      return;
    }
    let cancel = false;
    propiedadService
      .obtenerPrecioSugerido({ zonaId: zid, universidadId: uid, tipo: form.tipoPropiedad || undefined })
      .then((d) => {
        if (!cancel) setPrecioSugerido(d && d.cantidad > 0 ? d : null);
      })
      .catch(() => {
        if (!cancel) setPrecioSugerido(null);
      });
    return () => {
      cancel = true;
    };
  }, [zonaActual?.id, zonaActual?.universidadId, form.tipoPropiedad]);

  const validar = (): Errores => {
    const e: Errores = {};
    if (!form.titulo.trim()) e.titulo = 'Ponle un título a tu publicación.';
    else if (form.titulo.length > 150) e.titulo = 'Máximo 150 caracteres.';
    if (form.descripcion.length > 5000) e.descripcion = 'La descripción no debe superar 5000 caracteres.';
    const precioNum = parseFloat(form.precio);
    if (!form.precio.trim()) e.precio = 'Indica un precio.';
    else if (Number.isNaN(precioNum) || precioNum <= 0) e.precio = 'El precio debe ser mayor a 0.';
    if (!form.direccion.trim()) e.direccion = 'Indica la dirección.';
    else if (form.direccion.length > 255) e.direccion = 'Máximo 255 caracteres.';
    if (form.area !== '') {
      const a = parseFloat(form.area);
      if (Number.isNaN(a) || a < 0) e.area = 'Área debe ser ≥ 0.';
    }
    if (form.nroPiso !== '') {
      const p = parseInt(form.nroPiso, 10);
      if (Number.isNaN(p) || p < 0) e.nroPiso = 'Número de piso inválido.';
    }
    // Distribución: obligatoria para inmuebles completos (departamento/mini depa/casa).
    const entero = (raw: string): number | null => {
      const n = parseInt(raw, 10);
      return Number.isNaN(n) ? null : n;
    };
    if (esInmuebleCompleto) {
      const d = entero(form.numDormitorios);
      const b = entero(form.numBanos);
      const c = entero(form.capacidadPersonas);
      if (d === null || d < 1) e.numDormitorios = 'Indica cuántos dormitorios tiene.';
      if (b === null || b < 1) e.numBanos = 'Indica cuántos baños tiene.';
      if (c === null || c < 1) e.capacidadPersonas = 'Indica para cuántas personas.';
    } else {
      if (form.numDormitorios !== '' && (entero(form.numDormitorios) ?? -1) < 0) e.numDormitorios = 'Valor inválido.';
      if (form.numBanos !== '' && (entero(form.numBanos) ?? -1) < 0) e.numBanos = 'Valor inválido.';
      if (form.capacidadPersonas !== '' && (entero(form.capacidadPersonas) ?? -1) < 0) e.capacidadPersonas = 'Valor inválido.';
    }
    const latRaw = form.latitud.trim();
    const lngRaw = form.longitud.trim();
    if ((latRaw && !lngRaw) || (!latRaw && lngRaw)) {
      e.latitud = 'Si envías una coordenada, envía ambas.';
    } else if (latRaw && lngRaw) {
      const lat = parseFloat(latRaw);
      const lng = parseFloat(lngRaw);
      if (Number.isNaN(lat) || lat < -90 || lat > 90) e.latitud = 'Latitud entre -90 y 90.';
      else if (Number.isNaN(lng) || lng < -180 || lng > 180) e.longitud = 'Longitud entre -180 y 180.';
      else if (zonas.length > 0) {
        // Si hay zonas cargadas, la regla real es "dentro de alguna zona de cobertura"
        // (esto es lo que el backend valida y rechaza). El radio fijo queda de respaldo.
        if (!resolverZona({ lat, lng }, zonas)) {
          e.longitud = 'La ubicación está fuera de toda zona de cobertura. Acércala a una universidad registrada.';
        }
      } else {
        const km = distanciaHaversineKm({ lat, lng }, UPEU_COORDS);
        if (km > UPEU_RADIO_MAX_KM)
          e.longitud = `La ubicación está a ${formatearDistancia(km)} de UPeU. Máx: ${UPEU_RADIO_MAX_KM} km.`;
      }
    }
    const imagenesListas = images.filter((img) => img.status === 'ready');
    if (imagenesListas.length === 0 && imageUrls.length === 0) {
      e.imagen = images.some((img) => img.status === 'reading')
        ? 'Espera a que las fotos terminen de procesarse.'
        : 'Agrega al menos una foto (archivo o enlace).';
    }
    return e;
  };

  // Servicios con estado: incluidos (en el precio) + aparte (se pagan extra, con su monto
  // opcional — item 156, permite un "estimado mensual" real en la ficha pública).
  const construirServicios = (): ServicioConEstado[] => [
    ...form.serviciosIncluidos.map((s) => ({ servicio: s, estado: 'INCLUIDO' as const })),
    ...form.serviciosAparte.map((s) => {
      const monto = parseFloat(form.montosServiciosAparte[s] ?? '');
      return {
        servicio: s,
        estado: 'APARTE' as const,
        monto: Number.isFinite(monto) && monto > 0 ? monto : undefined,
      };
    }),
  ];

  // Payload lenient para guardar el borrador (no exige campos completos).
  const construirBorradorPayload = (): BorradorPayload => {
    const num = (s: string) => (s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : undefined);
    return {
      titulo: form.titulo.trim() || undefined,
      descripcion: form.descripcion.trim() || undefined,
      precio: num(form.precio),
      deposito: num(form.deposito),
      direccion: form.direccion.trim() || undefined,
      tipoPropiedad: form.tipoPropiedad || undefined,
      periodoAlquiler: form.periodoAlquiler || undefined,
      area: num(form.area),
      nroPiso: num(form.nroPiso),
      numDormitorios: num(form.numDormitorios),
      numBanos: num(form.numBanos),
      capacidadPersonas: num(form.capacidadPersonas),
      tieneSala: form.tieneSala,
      tieneCocina: form.tieneCocina,
      amoblado: form.amoblado,
      gestionPorHabitacion: form.gestionPorHabitacion,
      latitud: num(form.latitud),
      longitud: num(form.longitud),
      serviciosIncluidos: form.serviciosIncluidos,
      servicios: construirServicios(),
      reglas: form.reglas,
      estaDisponible: form.estaDisponible,
      disponibleDesde: form.disponibleDesde || undefined,
      videoUrl: form.videoUrl.trim() || undefined,
      politicaCancelacion: form.politicaCancelacion,
    };
  };

  const guardarBorrador = async () => {
    if (!usuario) { setSubmitError('Debes iniciar sesión.'); return; }
    setGuardandoBorrador(true);
    try {
      const payload = construirBorradorPayload();
      if (draftId) {
        await borradorService.actualizar(draftId, payload);
      } else {
        const creado = await borradorService.crear(payload);
        setDraftId(creado.id);
      }
      limpiarDraft(); // ya está en el servidor → descartar la copia local
      notify.success('Borrador guardado', 'Lo encuentras en Propiedades → Borradores.');
    } catch (err) {
      notify.error(err, 'No se pudo guardar el borrador');
    } finally {
      setGuardandoBorrador(false);
    }
  };

  // Programar la publicación: guarda el borrador, sube las fotos y agenda la fecha.
  const programarPublicacion = async () => {
    if (!usuario) { setSubmitError('Debes iniciar sesión.'); return; }
    if (!fechaProgramada) { notify.error(null, 'Elige la fecha y hora de publicación'); return; }
    const validationErrors = validar();
    if (Object.keys(validationErrors).length > 0) {
      setErrores(validationErrors);
      jumpToField(Object.keys(validationErrors)[0]);
      return;
    }
    setLoading(true);
    try {
      let id = draftId;
      const payload = construirBorradorPayload();
      if (id) {
        await borradorService.actualizar(id, payload);
      } else {
        const creado = await borradorService.crear(payload);
        id = creado.id;
        setDraftId(id);
      }
      // Subir las fotos al borrador para que la publicación programada ya las tenga.
      // El orden del array YA refleja lo que el arrendador armó (drag & drop): la portada
      // (primera imagen lista) va primero.
      const ordenadas = images.filter((img) => img.status === 'ready').map((img) => img.file);
      if (ordenadas.length > 0 && id) {
        await propiedadService.subirImagenes(id, ordenadas);
      }
      await borradorService.programar(id as number, fechaProgramada);
      limpiarDraft();
      notify.success('Publicación programada', `Se publicará el ${new Date(fechaProgramada).toLocaleString('es-PE')}.`);
      router.push('/landlord/properties/drafts');
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as { message?: string })?.message || 'No se pudo programar la publicación';
      setSubmitError(message);
    } finally {
      setLoading(false);
    }
  };

  // Retomar un borrador del servidor: prefill del formulario.
  useEffect(() => {
    if (!borradorParam) return;
    let cancel = false;
    propiedadService
      .obtenerCompleto(Number(borradorParam))
      .then((b) => {
        if (cancel || !b) return;
        setForm((f) => ({
          ...f,
          titulo: b.titulo ?? '',
          descripcion: b.descripcion ?? '',
          precio: b.precio != null ? String(b.precio) : '',
          deposito: b.deposito != null ? String(b.deposito) : '',
          direccion: b.direccion ?? '',
          tipoPropiedad: (b.tipoPropiedad as TipoPropiedad) || '',
          periodoAlquiler: (b.periodoAlquiler as PeriodoAlquiler) || '',
          area: b.area != null ? String(b.area) : '',
          nroPiso: b.nroPiso != null ? String(b.nroPiso) : '',
          numDormitorios: b.numDormitorios != null ? String(b.numDormitorios) : '',
          numBanos: b.numBanos != null ? String(b.numBanos) : '',
          capacidadPersonas: b.capacidadPersonas != null ? String(b.capacidadPersonas) : '',
          tieneSala: b.tieneSala ?? false,
          tieneCocina: b.tieneCocina ?? false,
          amoblado: b.amoblado ?? false,
          gestionPorHabitacion: b.gestionPorHabitacion ?? false,
          latitud: b.latitud != null ? String(b.latitud) : '',
          longitud: b.longitud != null ? String(b.longitud) : '',
          serviciosIncluidos:
            b.servicios?.filter((s) => s.estado === 'INCLUIDO').map((s) => s.servicio)
            ?? b.serviciosIncluidos ?? [],
          serviciosAparte:
            b.servicios?.filter((s) => s.estado === 'APARTE').map((s) => s.servicio) ?? [],
          montosServiciosAparte: Object.fromEntries(
            (b.servicios ?? [])
              .filter((s) => s.estado === 'APARTE' && s.monto != null)
              .map((s) => [s.servicio, String(s.monto)]),
          ),
          reglas: b.reglas ?? [],
          estaDisponible: b.estaDisponible ?? true,
          disponibleDesde: b.disponibleDesde ?? '',
          videoUrl: b.videoUrl ?? '',
          politicaCancelacion: b.politicaCancelacion ?? 'FLEXIBLE',
        }));
      })
      .catch(() => { /* borrador no accesible */ });
    return () => { cancel = true; };
  }, [borradorParam]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!usuario) { setSubmitError('Debes iniciar sesión para publicar.'); return; }
    const validationErrors = validar();
    if (Object.keys(validationErrors).length > 0) {
      setErrores(validationErrors);
      jumpToField(Object.keys(validationErrors)[0]);
      return;
    }
    const arrendadorIdNumber = Number(usuario.perfilId ?? usuario.id);
    if (!arrendadorIdNumber || Number.isNaN(arrendadorIdNumber)) {
      setSubmitError('No pudimos identificar tu perfil de arrendador. Vuelve a iniciar sesión.');
      return;
    }
    const payload: CrearPropiedadRequest = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || undefined,
      precio: parseFloat(form.precio),
      deposito: form.deposito !== '' ? parseFloat(form.deposito) : undefined,
      direccion: form.direccion.trim(),
      tipoPropiedad: form.tipoPropiedad || undefined,
      periodoAlquiler: form.periodoAlquiler || undefined,
      area: form.area !== '' ? parseFloat(form.area) : undefined,
      nroPiso: form.nroPiso !== '' ? parseInt(form.nroPiso, 10) : undefined,
      numDormitorios: form.numDormitorios !== '' ? parseInt(form.numDormitorios, 10) : undefined,
      numBanos: form.numBanos !== '' ? parseInt(form.numBanos, 10) : undefined,
      capacidadPersonas: form.capacidadPersonas !== '' ? parseInt(form.capacidadPersonas, 10) : undefined,
      tieneSala: esInmuebleCompleto ? form.tieneSala : undefined,
      tieneCocina: esInmuebleCompleto ? form.tieneCocina : undefined,
      amoblado: form.amoblado || undefined,
      gestionPorHabitacion: form.gestionPorHabitacion || undefined,
      latitud: form.latitud !== '' ? parseFloat(form.latitud) : undefined,
      longitud: form.longitud !== '' ? parseFloat(form.longitud) : undefined,
      ubicacionGps:
        form.latitud && form.longitud
          ? `${parseFloat(form.latitud).toFixed(6)},${parseFloat(form.longitud).toFixed(6)}`
          : undefined,
      serviciosIncluidos: form.serviciosIncluidos.length ? form.serviciosIncluidos : undefined,
      servicios: construirServicios().length ? construirServicios() : undefined,
      reglas: form.reglas.length ? form.reglas : undefined,
      estaDisponible: form.estaDisponible,
      disponibleDesde: form.disponibleDesde || undefined,
      videoUrl: form.videoUrl.trim() || undefined,
      politicaCancelacion: form.politicaCancelacion,
      arrendadorId: arrendadorIdNumber,
    };
    // Orden ya definido por el arrendador en el uploader (drag & drop): la portada
    // (primera imagen lista) se sube primero.
    const ordenadas = images.filter((img) => img.status === 'ready').map((img) => img.file);
    const coverFile = ordenadas[0];
    const extraFiles = ordenadas.slice(1);

    const publicarPropiedad = async () => {
      if (draftId) {
        // Publicar un borrador: persistir últimos cambios → validar+publicar en backend → subir fotos.
        await borradorService.actualizar(draftId, construirBorradorPayload());
        const publicada = await borradorService.publicar(draftId);
        if (publicada?.id) {
          if (ordenadas.length > 0) await propiedadService.subirImagenes(publicada.id, ordenadas);
          for (const url of imageUrls) await propiedadService.agregarImagenPorUrl(publicada.id, url);
        }
      } else {
        const nuevaPropiedad = await propiedadService.crearPropiedad(payload, coverFile);
        if (nuevaPropiedad?.id) {
          if (extraFiles.length > 0) await propiedadService.subirImagenes(nuevaPropiedad.id, extraFiles);
          // Las imágenes por URL se adjuntan después de crear (necesitan el ID).
          for (const url of imageUrls) await propiedadService.agregarImagenPorUrl(nuevaPropiedad.id, url);
        }
      }
    };

    setLoading(true);
    const promesa = publicarPropiedad();
    notify.promise(promesa, {
      loading: 'Publicando tu propiedad…',
      success: 'Propiedad publicada',
      error: 'Hubo un error al publicar la propiedad',
    });
    try {
      await promesa;
      limpiarDraft(); // publicado con éxito → descartar la copia local
      router.push('/landlord/properties/active');
    } catch (err) {
      console.error('Error al crear propiedad:', err);
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'Hubo un error al publicar la propiedad. Inténtalo de nuevo.';
      setSubmitError(message);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-400">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-start gap-4">
        <Link
          href="/landlord/dashboard"
          aria-label="Volver al dashboard"
          className="shrink-0 mt-0.5 w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
            Propiedades · Nueva publicación
          </p>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Publicar mi cuarto
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-lg leading-relaxed">
            Completa los datos de tu cuarto. Cuanta más información compartas, más rápido
            encontrarás inquilino.
          </p>
        </div>

        {/* Indicador de autoguardado */}
        {draftStatus !== 'idle' && (
          <span className="ml-auto hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground shrink-0">
            <span className={cn('material-symbols-outlined text-[15px]', draftStatus === 'guardando' && 'animate-pulse')}>
              {draftStatus === 'guardando' ? 'cloud_sync' : 'cloud_done'}
            </span>
            {draftStatus === 'guardando' ? 'Guardando borrador…' : 'Borrador guardado'}
          </span>
        )}
      </div>

      {/* Banner: borrador restaurado */}
      {draftRestaurado && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="material-symbols-outlined text-[18px] text-primary">history</span>
            Restauramos tu borrador. <span className="text-muted-foreground">Las fotos debes volver a adjuntarlas.</span>
          </p>
          <button
            type="button"
            onClick={() => { limpiarDraft(); setForm(INITIAL_FORM); }}
            className="shrink-0 text-xs font-bold text-primary hover:underline"
          >
            Descartar y empezar de cero
          </button>
        </div>
      )}

      {/* ── Wizard mobile (ítem 332) — en desktop (`lg:`) se oculta y las 6 secciones ────
          se muestran todas en scroll continuo, como antes. ─────────────────────────── */}
      <div className="lg:hidden">
        <Stepper steps={WIZARD_STEPS} currentIndex={currentStep} />
        <div className="mt-5 mb-1 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goToPrevStep}
            disabled={currentStep === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Atrás
          </button>
          <span className="text-[11px] font-semibold text-muted-foreground">
            Paso {currentStep + 1} de {WIZARD_STEPS.length} · {WIZARD_STEPS[currentStep].label}
          </span>
          {currentStep < WIZARD_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goToNextStep}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Siguiente
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          ) : (
            <span className="w-[78px]" aria-hidden />
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-5"
        noValidate
      >
        {/* ── Columna principal ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className={stepVisibleCls(0)}>
            <InfoBasicaSection
              form={form}
              errores={errores}
              onInput={onInput}
              setField={setField}
              tiposOptions={tiposOptions}
              periodosOptions={periodosOptions}
              precioSugerido={precioSugerido}
            />
          </div>

          <div className={stepVisibleCls(1)}>
            <UbicacionSection
              form={form}
              errores={errores}
              onInput={onInput}
              zonas={zonas}
              requestingGeo={requestingGeo}
              usarMiUbicacion={usarMiUbicacion}
              geocoding={geocoding}
              ubicarDireccion={ubicarDireccion}
              geoMsg={geoMsg}
              distanciaUpeu={distanciaUpeu}
              zonaActual={zonaActual}
              onPinChange={onPinChange}
            />
          </div>

          <div className={stepVisibleCls(2)}>
            <DetallesSection
              form={form}
              errores={errores}
              onInput={onInput}
              setField={setField}
              esInmuebleCompleto={esInmuebleCompleto}
            />
          </div>

          <div className={stepVisibleCls(3)}>
            <ServiciosSection
              cargandoCat={cargandoCat}
              catalogos={catalogos}
              form={form}
              setForm={setForm}
              setField={setField}
            />
          </div>

          <div className={stepVisibleCls(4)}>
            <ReglasSection
              cargandoCat={cargandoCat}
              catalogos={catalogos}
              form={form}
              setField={setField}
            />
          </div>
        </div>

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-6 self-start">
          <div className={cn('space-y-4', stepVisibleCls(5))}>
            <FotosSidebar
              images={images}
              onImagesChange={onImagesChange}
              imageUrls={imageUrls}
              errores={errores}
              removeImagenUrl={removeImagenUrl}
              urlInput={urlInput}
              setUrlInput={setUrlInput}
              agregarImagenUrl={agregarImagenUrl}
            />

            <AccionesSidebar
              submitError={submitError}
              loading={loading}
              guardandoBorrador={guardandoBorrador}
              guardarBorrador={guardarBorrador}
              draftId={draftId}
              fechaProgramada={fechaProgramada}
              setFechaProgramada={setFechaProgramada}
              programarPublicacion={programarPublicacion}
            />
          </div>
        </aside>
      </form>
    </div>
  );
}
