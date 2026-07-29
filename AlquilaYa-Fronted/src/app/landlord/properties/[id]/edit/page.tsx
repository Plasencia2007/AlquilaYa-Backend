'use client';

import {
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { propiedadService, type PrecioSugerido } from '@/services/landlord-property-service';
import { catalogosService, type CatalogosActivos } from '@/services/catalogos-service';
import { universidadService, type ZonaResolucion } from '@/services/universidad-service';
import { RoomManager } from '@/components/landlord/room-manager';
import { ErrorState } from '@/components/shared/error-state';
import { notify } from '@/lib/notify';
import { MAX_PROPERTY_IMAGES } from '@/lib/property-photos';
import {
  UPEU_COORDS,
  UPEU_RADIO_MAX_KM,
  distanciaHaversineKm,
  formatearDistancia,
  geocodificarDireccion,
  resolverZona,
  reverseGeocode,
} from '@/lib/geo';
import type { StagedImage } from '@/components/ui/image-uploader';
import type { PeriodoAlquiler, TipoPropiedad } from '@/types/propiedad';

import { resolveIcon } from '../../add/property-form-icons';
import { Section } from '../../add/property-form-primitives';
import { type Errores, type FormState } from '../../add/property-form-types';
import { InfoBasicaSection } from '../../add/info-basica-section';
import { UbicacionSection } from '../../add/ubicacion-section';
import { DetallesSection } from '../../add/detalles-section';
import { ServiciosSection } from '../../add/servicios-section';
import { ReglasSection } from '../../add/reglas-section';
import { FotosEditSection, type ImagenExistente } from './fotos-edit-section';
import { TemporadasSection } from './temporadas-section';
import { completaToFormState, formStateToUpdate } from './edit-property-mappers';

/**
 * Página de edición completa de una propiedad (ítem 311 de MEJORAS.md).
 *
 * Reutiliza las mismas secciones modularizadas del wizard de alta (`landlord/properties/add`)
 * en vez de reimplementar el formulario — solo se adapta la carga inicial (una `Propiedad`
 * existente → `FormState`, ver `edit-property-mappers.ts`) y el guardado (`PUT` en vez de
 * `POST`). `EditPropertyModal` sigue vivo para ediciones rápidas desde la lista de
 * propiedades; esta página es la edición a fondo (incluye ubicación con mapa, habitaciones,
 * temporadas y gestión completa de fotos, que el modal no cubre o cubre de forma más simple).
 */
export default function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [loadingInicial, setLoadingInicial] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [errores, setErrores] = useState<Errores>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [catalogos, setCatalogos] = useState<CatalogosActivos | null>(null);
  const [cargandoCat, setCargandoCat] = useState(true);
  const [zonas, setZonas] = useState<ZonaResolucion[]>([]);

  // ── Fotos: existentes (con id real, se pueden borrar/reordenar) + nuevas (archivo/URL) ──
  const [imagenesExistentes, setImagenesExistentes] = useState<ImagenExistente[]>([]);
  const [imagenesParaEliminar, setImagenesParaEliminar] = useState<number[]>([]);
  const [ordenCambiado, setOrdenCambiado] = useState(false);
  const [images, setImages] = useState<StagedImage[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');

  const [requestingGeo, setRequestingGeo] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  // ── Guard de cambios sin guardar (paridad con EditPropertyModal) ──
  const baselineRef = useRef<string | null>(null);
  const baselineCapturedRef = useRef(false);

  // ── Carga inicial: propiedad + imágenes ──
  useEffect(() => {
    let cancel = false;
    setLoadingInicial(true);
    setLoadError(null);
    Promise.all([propiedadService.obtenerCompleto(id), propiedadService.obtenerImagenes(id)])
      .then(([completo, imagenes]) => {
        if (cancel) return;
        setForm(completaToFormState(completo));
        if (imagenes.length > 0) {
          setImagenesExistentes(imagenes);
        } else {
          setImagenesExistentes((completo.imagenes ?? []).map((url, i) => ({ id: -(i + 1), url })));
        }
      })
      .catch(() => {
        if (!cancel) setLoadError('No pudimos cargar esta propiedad. Puede que no exista o no tengas permiso para editarla.');
      })
      .finally(() => {
        if (!cancel) setLoadingInicial(false);
      });
    return () => { cancel = true; };
  }, [id]);

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

  // Captura la foto del formulario apenas termina de cargar, para el guard de cambios sin guardar.
  useEffect(() => {
    if (!loadingInicial && form && !baselineCapturedRef.current) {
      baselineRef.current = JSON.stringify(form);
      baselineCapturedRef.current = true;
    }
  }, [loadingInicial, form]);

  const esInmuebleCompleto = form ? ['DEPARTAMENTO', 'MINI_DEPA', 'CASA'].includes(form.tipoPropiedad) : false;

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setErrores((prev) => {
      if (!prev[key]) return prev;
      const { [key]: _drop, ...rest } = prev;
      return rest as Errores;
    });
  };

  const onInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  // ── Ubicación: mismo comportamiento que el wizard de alta (mapa + geocoding + zonas) ──
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

  const ubicarDireccion = async () => {
    if (!form) return;
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

  const onPinChange = async (lat: number, lng: number) => {
    setField('latitud', lat.toFixed(6));
    setField('longitud', lng.toFixed(6));
    if (form && !form.direccion.trim()) {
      const dir = await reverseGeocode(lat, lng);
      if (dir) {
        setField('direccion', dir.slice(0, 255));
        setGeoMsg('Dirección autocompletada del pin. Ajústala si hace falta.');
      }
    }
  };

  const distanciaUpeu = useMemo(() => {
    if (!form) return null;
    const lat = parseFloat(form.latitud);
    const lng = parseFloat(form.longitud);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return distanciaHaversineKm({ lat, lng }, UPEU_COORDS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.latitud, form?.longitud]);

  const zonaActual = useMemo(() => {
    if (!form) return null;
    const lat = parseFloat(form.latitud);
    const lng = parseFloat(form.longitud);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return resolverZona({ lat, lng }, zonas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.latitud, form?.longitud, zonas]);

  // Precio sugerido (ítem 331): mismo patrón que al publicar — ya viene "gratis" al reusar
  // `InfoBasicaSection`, que trae el botón "usar el promedio" junto al campo precio.
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
      .obtenerPrecioSugerido({ zonaId: zid, universidadId: uid, tipo: form?.tipoPropiedad || undefined })
      .then((d) => { if (!cancel) setPrecioSugerido(d && d.cantidad > 0 ? d : null); })
      .catch(() => { if (!cancel) setPrecioSugerido(null); });
    return () => { cancel = true; };
  }, [zonaActual?.id, zonaActual?.universidadId, form?.tipoPropiedad]);

  // ── Fotos ──
  const totalFotos = () =>
    imagenesExistentes.filter((i) => !imagenesParaEliminar.includes(i.id)).length +
    images.length +
    imageUrls.length;

  const onImagesChange = (next: StagedImage[]) => {
    setImages(next);
    setErrores((p) => { const { imagen: _omit, ...rest } = p; return rest; });
  };

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
    if (totalFotos() >= MAX_PROPERTY_IMAGES) {
      setErrores((p) => ({ ...p, imagen: `Máximo ${MAX_PROPERTY_IMAGES} fotos.` }));
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
    setErrores((p) => { const { imagen: _omit, ...rest } = p; return rest; });
  };

  const removeImagenUrl = (index: number) => setImageUrls((prev) => prev.filter((_, i) => i !== index));

  const toggleEliminarImagen = (imgId: number) => {
    if (imgId < 0) return;
    setImagenesParaEliminar((p) => (p.includes(imgId) ? p.filter((x) => x !== imgId) : [...p, imgId]));
  };

  const moverImagenExistente = (idx: number, dir: -1 | 1) => {
    const destino = idx + dir;
    setImagenesExistentes((prev) => {
      if (destino < 0 || destino >= prev.length) return prev;
      const next = prev.slice();
      [next[idx], next[destino]] = [next[destino], next[idx]];
      return next;
    });
    setOrdenCambiado(true);
  };

  const hacerPortadaExistente = (idx: number) => {
    if (idx === 0) return;
    setImagenesExistentes((prev) => {
      const next = prev.slice();
      const [moved] = next.splice(idx, 1);
      next.unshift(moved);
      return next;
    });
    setOrdenCambiado(true);
  };

  // ── Guard de cambios sin guardar ──
  const hayCambios = useCallback(() => {
    if (!form || baselineRef.current == null) return false;
    return (
      JSON.stringify(form) !== baselineRef.current ||
      images.length > 0 ||
      imagenesParaEliminar.length > 0 ||
      imageUrls.length > 0 ||
      ordenCambiado
    );
  }, [form, images, imagenesParaEliminar, imageUrls, ordenCambiado]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hayCambios()) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hayCambios]);

  const handleCancelClick = (e: React.MouseEvent) => {
    if (hayCambios() && !window.confirm('Tienes cambios sin guardar. ¿Descartarlos y salir?')) {
      e.preventDefault();
    }
  };

  // ── Validación (mismas reglas que el wizard de alta, sin exigir fotos) ──
  const validar = (f: FormState): Errores => {
    const e: Errores = {};
    if (!f.titulo.trim()) e.titulo = 'Ponle un título a tu publicación.';
    else if (f.titulo.length > 150) e.titulo = 'Máximo 150 caracteres.';
    if (f.descripcion.length > 5000) e.descripcion = 'La descripción no debe superar 5000 caracteres.';
    const precioNum = parseFloat(f.precio);
    if (!f.precio.trim()) e.precio = 'Indica un precio.';
    else if (Number.isNaN(precioNum) || precioNum <= 0) e.precio = 'El precio debe ser mayor a 0.';
    if (!f.direccion.trim()) e.direccion = 'Indica la dirección.';
    else if (f.direccion.length > 255) e.direccion = 'Máximo 255 caracteres.';
    if (f.area !== '') {
      const a = parseFloat(f.area);
      if (Number.isNaN(a) || a < 0) e.area = 'Área debe ser ≥ 0.';
    }
    if (f.nroPiso !== '') {
      const p = parseInt(f.nroPiso, 10);
      if (Number.isNaN(p) || p < 0) e.nroPiso = 'Número de piso inválido.';
    }
    const entero = (raw: string): number | null => {
      const n = parseInt(raw, 10);
      return Number.isNaN(n) ? null : n;
    };
    const inmuebleCompleto = ['DEPARTAMENTO', 'MINI_DEPA', 'CASA'].includes(f.tipoPropiedad);
    if (inmuebleCompleto) {
      const d = entero(f.numDormitorios);
      const b = entero(f.numBanos);
      const c = entero(f.capacidadPersonas);
      if (d === null || d < 1) e.numDormitorios = 'Indica cuántos dormitorios tiene.';
      if (b === null || b < 1) e.numBanos = 'Indica cuántos baños tiene.';
      if (c === null || c < 1) e.capacidadPersonas = 'Indica para cuántas personas.';
    } else {
      if (f.numDormitorios !== '' && (entero(f.numDormitorios) ?? -1) < 0) e.numDormitorios = 'Valor inválido.';
      if (f.numBanos !== '' && (entero(f.numBanos) ?? -1) < 0) e.numBanos = 'Valor inválido.';
      if (f.capacidadPersonas !== '' && (entero(f.capacidadPersonas) ?? -1) < 0) e.capacidadPersonas = 'Valor inválido.';
    }
    const latRaw = f.latitud.trim();
    const lngRaw = f.longitud.trim();
    if ((latRaw && !lngRaw) || (!latRaw && lngRaw)) {
      e.latitud = 'Si envías una coordenada, envía ambas.';
    } else if (latRaw && lngRaw) {
      const lat = parseFloat(latRaw);
      const lng = parseFloat(lngRaw);
      if (Number.isNaN(lat) || lat < -90 || lat > 90) e.latitud = 'Latitud entre -90 y 90.';
      else if (Number.isNaN(lng) || lng < -180 || lng > 180) e.longitud = 'Longitud entre -180 y 180.';
      else if (zonas.length > 0) {
        if (!resolverZona({ lat, lng }, zonas)) {
          e.longitud = 'La ubicación está fuera de toda zona de cobertura. Acércala a una universidad registrada.';
        }
      } else {
        const km = distanciaHaversineKm({ lat, lng }, UPEU_COORDS);
        if (km > UPEU_RADIO_MAX_KM) e.longitud = `La ubicación está a ${formatearDistancia(km)} de UPeU. Máx: ${UPEU_RADIO_MAX_KM} km.`;
      }
    }
    return e;
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSubmitError(null);
    const validationErrors = validar(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrores(validationErrors);
      const firstField = Object.keys(validationErrors)[0];
      document.querySelector(`[data-field="${firstField}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSaving(true);
    const guardar = async () => {
      await propiedadService.actualizar(id, formStateToUpdate(form, esInmuebleCompleto));
      if (imagenesParaEliminar.length > 0) {
        await Promise.all(imagenesParaEliminar.map((imgId) => propiedadService.eliminarImagen(id, imgId)));
      }
      const nuevosArchivos = images.filter((img) => img.status === 'ready').map((img) => img.file);
      if (nuevosArchivos.length > 0) await propiedadService.subirImagenes(id, nuevosArchivos);
      for (const url of imageUrls) await propiedadService.agregarImagenPorUrl(id, url);
      if (ordenCambiado) {
        const ordenIds = imagenesExistentes
          .filter((i) => !imagenesParaEliminar.includes(i.id))
          .map((i) => i.id);
        if (ordenIds.length > 0) await propiedadService.reordenarImagenes(id, ordenIds);
      }
    };
    const promesa = guardar();
    notify.promise(promesa, {
      loading: 'Guardando cambios…',
      success: 'Propiedad actualizada',
      error: 'No se pudo guardar los cambios',
    });
    try {
      await promesa;
      baselineRef.current = JSON.stringify(form);
      setImagenesParaEliminar([]);
      setImages([]);
      setImageUrls([]);
      setOrdenCambiado(false);
      router.push('/landlord/properties/active');
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'No se pudo guardar los cambios. Inténtalo de nuevo.';
      setSubmitError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="mb-8 flex items-start gap-4">
        <Link
          href="/landlord/properties/active"
          onClick={handleCancelClick}
          aria-label="Volver a mis propiedades"
          className="shrink-0 mt-0.5 w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
            Propiedades · Editar
          </p>
          <h1 className="text-2xl font-bold text-foreground tracking-tight line-clamp-1">
            {form?.titulo || 'Editar propiedad'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-lg leading-relaxed">
            Actualiza los datos de tu publicación. Los cambios se aplican al guardar.
          </p>
        </div>
      </div>

      {loadingInicial ? (
        <div className="space-y-4">
          <div className="h-40 rounded-2xl bg-muted animate-pulse" />
          <div className="h-40 rounded-2xl bg-muted animate-pulse" />
          <div className="h-40 rounded-2xl bg-muted animate-pulse" />
        </div>
      ) : loadError || !form ? (
        <ErrorState
          title="No se pudo cargar la propiedad"
          description={loadError ?? undefined}
          retryLabel="Volver a mis propiedades"
          onRetry={() => router.push('/landlord/properties/active')}
        />
      ) : (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-5" noValidate>
          {/* ── Columna principal ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            <InfoBasicaSection
              form={form}
              errores={errores}
              onInput={onInput}
              setField={setField}
              tiposOptions={tiposOptions}
              periodosOptions={periodosOptions}
              precioSugerido={precioSugerido}
            />

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

            <DetallesSection
              form={form}
              errores={errores}
              onInput={onInput}
              setField={setField}
              esInmuebleCompleto={esInmuebleCompleto}
            />

            <ServiciosSection
              cargandoCat={cargandoCat}
              catalogos={catalogos}
              form={form}
              setForm={(updater) =>
                setForm((prev) => (prev ? (typeof updater === 'function' ? (updater as (f: FormState) => FormState)(prev) : updater) : prev))
              }
              setField={setField}
            />

            <ReglasSection
              cargandoCat={cargandoCat}
              catalogos={catalogos}
              form={form}
              setField={setField}
            />

            {/* Habitaciones (si se gestiona por cuarto) o precios por temporada (unidad completa) */}
            {form.gestionPorHabitacion ? (
              <Section step={6} icon="meeting_room" title="Habitaciones" subtitle="Cada cuarto tiene su propio precio, estado y fotos">
                <RoomManager propiedadId={id} />
              </Section>
            ) : (
              <TemporadasSection propiedadId={id} />
            )}
          </div>

          {/* ── Sidebar ───────────────────────────────────────────────────── */}
          <aside className="space-y-4 lg:sticky lg:top-6 self-start">
            <FotosEditSection
              imagenesExistentes={imagenesExistentes}
              imagenesParaEliminar={imagenesParaEliminar}
              toggleEliminarImagen={toggleEliminarImagen}
              moverImagenExistente={moverImagenExistente}
              hacerPortadaExistente={hacerPortadaExistente}
              images={images}
              onImagesChange={onImagesChange}
              imageUrls={imageUrls}
              removeImagenUrl={removeImagenUrl}
              urlInput={urlInput}
              setUrlInput={setUrlInput}
              agregarImagenUrl={agregarImagenUrl}
              error={errores.imagen}
            />

            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              {submitError && (
                <div className="px-5 py-3 bg-destructive/5 border-b border-destructive/20 flex items-start gap-2">
                  <span className="material-symbols-outlined text-destructive text-[16px] mt-0.5 shrink-0">error</span>
                  <p className="text-[12px] font-medium text-destructive leading-snug">{submitError}</p>
                </div>
              )}
              <div className="p-5 space-y-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">autorenew</span>
                      Guardando…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">check</span>
                      Guardar cambios
                    </>
                  )}
                </button>
                <Link
                  href="/landlord/properties/active"
                  onClick={handleCancelClick}
                  className="w-full h-10 flex items-center justify-center rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </Link>
              </div>
            </div>
          </aside>
        </form>
      )}
    </div>
  );
}
