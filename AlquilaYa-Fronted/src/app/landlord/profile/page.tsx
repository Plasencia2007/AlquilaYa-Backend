'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Star, Camera, Upload, CheckCircle, Clock, XCircle,
  Loader2, FileImage, FileText, MapPin, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { notify } from '@/lib/notify';
import { profileService } from '@/services/profile-service';
import { documentsService } from '@/services/documents-service';
import { EmailVerificationBanner } from '@/components/auth/email-verification-banner';
import { ActiveSessions } from '@/components/auth/active-sessions';
import { UPEU_COORDS } from '@/lib/geo';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import {
  personalDataSchema, arrendadorDataSchema, DNI_REGEX,
  type PersonalDataFormData, type ArrendadorDataFormData,
} from '@/schemas/landlord-profile-schema';
import type { Perfil, Documento, TipoDocumento, EstadoUsuario } from '@/types/profile';

const MapPicker = dynamic(() => import('@/components/shared/MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] w-full animate-pulse rounded-xl bg-muted flex items-center justify-center text-muted-foreground text-sm">
      Cargando mapa…
    </div>
  ),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ESTADO_CFG: Record<EstadoUsuario, { label: string; cls: string }> = {
  ACTIVE:    { label: 'Activo',     cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  PENDING:   { label: 'Pendiente',  cls: 'bg-amber-500/20  text-amber-400  border-amber-500/30'  },
  BANNED:    { label: 'Baneado',    cls: 'bg-red-500/20    text-red-400    border-red-500/30'    },
  SUSPENDED: { label: 'Suspendido', cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  REJECTED:  { label: 'Rechazado',  cls: 'bg-red-500/20    text-red-400    border-red-500/30'    },
};

const DOC_CFG = {
  APROBADO: { label: 'Aprobado',    Icon: CheckCircle, cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  PENDIENTE:{ label: 'En revisión', Icon: Clock,        cls: 'text-amber-400  bg-amber-500/10  border-amber-500/20'  },
  RECHAZADO:{ label: 'Rechazado',   Icon: XCircle,      cls: 'text-red-400    bg-red-500/10    border-red-500/20'    },
};

/** Estilo de input compartido entre `InputField` (estado local) y los campos RHF de este archivo. */
const INPUT_CLS = 'w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
      <h2 className="text-foreground text-lg font-black">{title}</h2>
      {children}
    </div>
  );
}

function InputField({
  label, value, onChange, placeholder, disabled, type = 'text',
}: {
  label: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; disabled?: boolean; type?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest">{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={INPUT_CLS}
      />
    </label>
  );
}

const cambiarPasswordSchema = z
  .object({
    actual: z.string().min(1, 'Ingresa tu contraseña actual'),
    nueva: z.string().min(8, 'Debe tener al menos 8 caracteres'),
    confirmar: z.string().min(1, 'Confirma la nueva contraseña'),
  })
  .refine((data) => data.nueva !== data.actual, {
    message: 'La nueva contraseña debe ser diferente a la actual',
    path: ['nueva'],
  })
  .refine((data) => data.nueva === data.confirmar, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmar'],
  });
type CambiarPasswordFormData = z.infer<typeof cambiarPasswordSchema>;

function PrimaryButton({
  children, onClick, disabled, loading, type = 'button', className,
}: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  loading?: boolean; type?: 'button' | 'submit'; className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-colors disabled:opacity-50',
        className,
      )}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

function Estrellas({ valor }: { valor: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={13}
          className={i <= Math.round(valor) ? 'fill-yellow-400 text-yellow-400' : 'fill-muted text-muted-foreground/30'}
        />
      ))}
      <span className="text-muted-foreground text-xs ml-1">{valor.toFixed(1)}</span>
    </div>
  );
}

function DocumentCard({
  tipo, titulo, documento, onUpload, uploading,
}: {
  tipo: TipoDocumento; titulo: string; documento: Documento | null;
  onUpload: (tipo: TipoDocumento, file: File) => void; uploading: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const estado = documento?.estadoVerificacion;
  const cfg = estado ? DOC_CFG[estado] : null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { notify.error(null, 'El archivo no puede superar 5 MB'); return; }
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) { notify.error(null, 'Solo se permiten JPG, PNG o PDF'); return; }
    onUpload(tipo, file);
    e.target.value = '';
  };

  const isPdf = documento?.archivoUrl?.toLowerCase().includes('.pdf');

  return (
    <div className="bg-muted/50 border border-border/60 rounded-xl p-4 space-y-3 flex flex-col">
      <p className="text-foreground text-sm font-bold">{titulo}</p>

      <div className="h-32 rounded-lg overflow-hidden bg-background flex items-center justify-center flex-1">
        {documento?.archivoUrl ? (
          isPdf ? (
            <a href={documento.archivoUrl} target="_blank" rel="noreferrer"
              className="flex flex-col items-center gap-1 text-primary hover:text-primary/40 transition-colors">
              <FileText size={32} />
              <span className="text-xs font-bold">Ver PDF</span>
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={documento.archivoUrl} alt={titulo} className="w-full h-full object-cover" />
          )
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <FileImage size={32} />
            <span className="text-xs">Sin documento</span>
          </div>
        )}
      </div>

      {cfg && (
        <div className={cn('flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full border w-fit', cfg.cls)}>
          <cfg.Icon size={11} />
          {cfg.label}
        </div>
      )}

      {estado === 'RECHAZADO' && documento?.comentarioRechazo && (
        <p className="text-red-400/80 text-xs border border-red-500/20 bg-red-500/5 rounded-lg px-3 py-2">
          {documento.comentarioRechazo}
        </p>
      )}

      <input ref={fileRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={handleChange} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-card border border-border hover:bg-muted text-foreground text-xs font-bold transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
        {uploading ? 'Subiendo…' : documento ? 'Reemplazar' : 'Subir documento'}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandlordProfilePage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);
  const [documentos, setDocumentos] = useState<Documento[]>([]);

  // 338: datos personales y de arrendador migrados a React Hook Form + Zod
  // (prerequisito real de 339 — necesitamos un `isDirty` confiable por sección).
  const personalForm = useForm<PersonalDataFormData>({
    resolver: zodResolver(personalDataSchema),
    defaultValues: { nombre: '', apellido: '', dni: '', telefono: '' },
  });
  const arrendadorForm = useForm<ArrendadorDataFormData>({
    resolver: zodResolver(arrendadorDataSchema),
    defaultValues: { nombreComercial: '', ruc: '', esEmpresa: false },
  });

  // Ubicación se mantiene como estado local plano (el mapa no es un input
  // formulario estándar); `ubicacionGuardadaRef` guarda el último valor
  // persistido para poder calcular su propio "dirty" y alimentar el guard 339.
  const [formUbicacion, setFormUbicacion] = useState({
    lat: UPEU_COORDS.lat, lng: UPEU_COORDS.lng, direccionCuartos: '',
  });
  const ubicacionGuardadaRef = useRef(formUbicacion);

  const passwordForm = useForm<CambiarPasswordFormData>({
    resolver: zodResolver(cambiarPasswordSchema),
    defaultValues: { actual: '', nueva: '', confirmar: '' },
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [verificandoRuc, setVerificandoRuc] = useState(false);
  const [verificandoDni, setVerificandoDni] = useState(false);
  const [savingUbicacion, setSavingUbicacion] = useState(false);
  const [savingSeguridad, setSavingSeguridad] = useState(false);
  const [savingFoto, setSavingFoto] = useState(false);
  const [subiendoDoc, setSubiendoDoc] = useState<string | null>(null);

  useEffect(() => {
    // `cargando` ya arranca en `true` (useState(true)) y este efecto sólo corre
    // una vez al montar ([] deps) — llamar setCargando(true) aquí sería un no-op
    // redundante (y lo marca la regla react-hooks/set-state-in-effect).
    let cancelado = false;
    Promise.allSettled([
      profileService.obtenerMiPerfil(),
      documentsService.listarMisDocumentos(),
    ]).then(([perfilRes, docsRes]) => {
      if (cancelado) return;
      if (perfilRes.status === 'fulfilled') {
        const p = perfilRes.value;
        setPerfil(p);
        personalForm.reset({
          nombre: p.nombre,
          apellido: p.apellido,
          dni: p.dni ?? '',
          telefono: p.telefono ?? '',
        });
        if (p.detallesArrendador) {
          arrendadorForm.reset({
            nombreComercial: p.detallesArrendador.nombreComercial ?? '',
            ruc: p.detallesArrendador.ruc ?? '',
            esEmpresa: p.detallesArrendador.esEmpresa ?? false,
          });
          const ubicacionInicial = {
            lat: p.detallesArrendador.latitud ?? UPEU_COORDS.lat,
            lng: p.detallesArrendador.longitud ?? UPEU_COORDS.lng,
            direccionCuartos: p.detallesArrendador.direccionPropiedades ?? '',
          };
          setFormUbicacion(ubicacionInicial);
          ubicacionGuardadaRef.current = ubicacionInicial;
        }
      } else {
        notify.error(perfilRes.reason, 'No se pudo cargar el perfil');
      }
      if (docsRes.status === 'fulfilled') setDocumentos(docsRes.value);
      setCargando(false);
    });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 339: guard de cambios sin guardar — agrega el dirty de ambos formularios
  // RHF, la ubicación (comparada contra el último valor persistido) y la
  // foto de perfil pendiente de subir.
  const ubicacionDirty =
    formUbicacion.lat !== ubicacionGuardadaRef.current.lat ||
    formUbicacion.lng !== ubicacionGuardadaRef.current.lng ||
    formUbicacion.direccionCuartos !== ubicacionGuardadaRef.current.direccionCuartos;

  useUnsavedChanges(
    personalForm.formState.isDirty ||
    arrendadorForm.formState.isDirty ||
    ubicacionDirty ||
    pendingAvatarFile !== null
  );

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { notify.error(null, 'La foto no puede superar 5 MB'); return; }
    setPendingAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const guardarFoto = async () => {
    if (!pendingAvatarFile) return;
    setSavingFoto(true);
    try {
      const url = await profileService.subirFotoPerfil(pendingAvatarFile);
      setPerfil(p => p ? { ...p, fotoUrl: url } : p);
      setAvatarPreview(null);
      setPendingAvatarFile(null);
      notify.success('Foto de perfil actualizada');
    } catch (err) {
      notify.error(err, 'No se pudo subir la foto');
    } finally {
      setSavingFoto(false);
    }
  };

  const guardarPersonal = async (data: PersonalDataFormData) => {
    try {
      const actualizado = await profileService.actualizarPerfil({
        nombre: data.nombre,
        apellido: data.apellido,
        dni: data.dni || undefined,
        telefono: data.telefono || undefined,
      });
      setPerfil(actualizado);
      personalForm.reset(data);
      notify.success('Datos personales actualizados');
    } catch (err) {
      notify.error(err, 'No se pudo actualizar');
    }
  };

  const buildDetallesArrendador = (data: ArrendadorDataFormData) => ({
    nombreComercial: data.nombreComercial || undefined,
    ruc: data.ruc || undefined,
    esEmpresa: data.esEmpresa,
    direccionCuartos: formUbicacion.direccionCuartos,
    latitud: formUbicacion.lat,
    longitud: formUbicacion.lng,
  });

  const dniActual = personalForm.watch('dni');
  const rucActual = arrendadorForm.watch('ruc');

  const handleVerificarDni = async () => {
    const dni = personalForm.getValues('dni');
    if (!DNI_REGEX.test(dni)) {
      notify.error(null, 'El DNI debe tener exactamente 8 dígitos.');
      return;
    }
    setVerificandoDni(true);
    try {
      await documentsService.verificarDniInstantaneo(dni);
      notify.success('DNI verificado con RENIEC', 'Tu identidad ha sido validada.');
      const actualizado = await profileService.obtenerMiPerfil();
      setPerfil(actualizado);
    } catch (err) {
      notify.error(err, 'Error de verificación de DNI');
    } finally {
      setVerificandoDni(false);
    }
  };

  const handleVerificarRuc = async () => {
    const ruc = arrendadorForm.getValues('ruc');
    if (ruc.length !== 11) {
      notify.error(null, 'El RUC debe tener exactamente 11 dígitos.');
      return;
    }
    setVerificandoRuc(true);
    try {
      const res = await profileService.verificarRuc(ruc);
      if (res.success) {
        notify.success('RUC verificado con SUNAT', 'Datos comerciales cargados.');
        if (res.razonSocial) {
          arrendadorForm.setValue('nombreComercial', res.razonSocial, { shouldDirty: true });
        }
        if (res.direccion) {
          setFormUbicacion(p => ({ ...p, direccionCuartos: res.direccion }));
        }
      } else {
        notify.error(null, res.message || 'No se pudo verificar el RUC.');
      }
    } catch (err) {
      notify.error(err, 'Error de validación de RUC');
    } finally {
      setVerificandoRuc(false);
    }
  };

  const guardarArrendador = async (data: ArrendadorDataFormData) => {
    if (!formUbicacion.direccionCuartos.trim()) {
      notify.error(null, 'Completa la dirección en la sección Ubicación primero');
      return;
    }
    try {
      const actualizado = await profileService.actualizarPerfil({ detallesArrendador: buildDetallesArrendador(data) });
      setPerfil(actualizado);
      arrendadorForm.reset(data);
      ubicacionGuardadaRef.current = formUbicacion;
      notify.success('Datos de arrendador actualizados');
    } catch (err) {
      notify.error(err, 'No se pudo actualizar');
    }
  };

  const guardarUbicacion = async () => {
    if (!formUbicacion.direccionCuartos.trim()) {
      notify.error(null, 'La dirección es obligatoria');
      return;
    }
    setSavingUbicacion(true);
    try {
      const actualizado = await profileService.actualizarPerfil({
        detallesArrendador: buildDetallesArrendador(arrendadorForm.getValues()),
      });
      setPerfil(actualizado);
      ubicacionGuardadaRef.current = formUbicacion;
      notify.success('Ubicación actualizada');
    } catch (err) {
      notify.error(err, 'No se pudo actualizar la ubicación');
    } finally {
      setSavingUbicacion(false);
    }
  };

  const guardarSeguridad = async (data: CambiarPasswordFormData) => {
    setSavingSeguridad(true);
    try {
      await profileService.cambiarPassword(data.actual, data.nueva);
      passwordForm.reset();
      notify.success('Contraseña actualizada correctamente');
    } catch (err) {
      notify.error(err, 'No se pudo cambiar la contraseña');
    } finally {
      setSavingSeguridad(false);
    }
  };

  const subirDocumento = useCallback(async (tipo: TipoDocumento, file: File) => {
    setSubiendoDoc(tipo);
    try {
      await documentsService.subirDocumento(tipo, file);
      const docs = await documentsService.listarMisDocumentos();
      setDocumentos(docs);
      notify.success('Documento subido. Pendiente de revisión.');
    } catch (err) {
      notify.error(err, 'No se pudo subir el documento');
    } finally {
      setSubiendoDoc(null);
    }
  }, []);

  const onMapPositionChange = useCallback((lat: number, lng: number) => {
    setFormUbicacion(p => ({ ...p, lat, lng }));
  }, []);

  // ─── Skeleton ───────────────────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="space-y-6 max-w-3xl animate-pulse">
        <div className="bg-card rounded-2xl p-6 h-40" />
        <div className="bg-card rounded-2xl p-6 h-64" />
        <div className="bg-card rounded-2xl p-6 h-48" />
      </div>
    );
  }

  const avatarSrc = avatarPreview ?? perfil?.fotoUrl;
  const initials = `${perfil?.nombre?.charAt(0) ?? ''}${perfil?.apellido?.charAt(0) ?? ''}`.toUpperCase();
  const estadoCfg = perfil?.estado ? ESTADO_CFG[perfil.estado] : null;
  const esArrendador = perfil?.rol === 'ARRENDADOR';

  return (
    <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-400 pb-12">

      <EmailVerificationBanner />

      {/* ── Header card ─────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start gap-5 flex-wrap">

          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="w-[110px] h-[110px] rounded-full overflow-hidden bg-muted flex items-center justify-center cursor-pointer group ring-4 ring-border hover:ring-primary/40 transition-all"
            >
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-foreground/70">{initials}</span>
              )}
              {/* Overlay siempre oscuro con ícono blanco: patrón establecido en la app
                  para overlays sobre foto (image-uploader.tsx, property-gallery.tsx,
                  room-manager.tsx) — independiente del tema claro/oscuro. */}
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={22} className="text-white" />
              </div>
            </div>
            <input ref={avatarInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={onAvatarChange} />
          </div>

          {/* Info */}
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-foreground text-2xl font-black tracking-tight">
                {perfil?.nombre} {perfil?.apellido}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">
                {perfil?.rol}
              </span>
              {estadoCfg && (
                <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold border', estadoCfg.cls)}>
                  {estadoCfg.label}
                </span>
              )}
            </div>

            {esArrendador && perfil?.detallesArrendador?.calificacion !== undefined && (
              <Estrellas valor={perfil.detallesArrendador.calificacion} />
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-sm">
              {perfil?.correo && <span>{perfil.correo}</span>}
              {perfil?.telefono && <span>{perfil.telefono}</span>}
            </div>

            {pendingAvatarFile && (
              <PrimaryButton onClick={guardarFoto} loading={savingFoto}>
                {savingFoto ? 'Subiendo…' : 'Guardar foto'}
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>

      {/* ── Datos personales ────────────────────────────────────────────────── */}
      <SectionCard title="Datos personales">
        <Form {...personalForm}>
          <form onSubmit={personalForm.handleSubmit(guardarPersonal)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={personalForm.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest">Nombre</FormLabel>
                    <FormControl>
                      <input {...field} className={INPUT_CLS} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={personalForm.control}
                name="apellido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest">Apellido</FormLabel>
                    <FormControl>
                      <input {...field} className={INPUT_CLS} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col sm:flex-row items-end gap-2">
                <FormField
                  control={personalForm.control}
                  name="dni"
                  render={({ field }) => (
                    <FormItem className="flex-1 w-full">
                      <FormLabel className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest">DNI</FormLabel>
                      <FormControl>
                        <input {...field} placeholder="12345678" className={INPUT_CLS} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <PrimaryButton
                  type="button"
                  onClick={handleVerificarDni}
                  disabled={verificandoDni || !DNI_REGEX.test(dniActual)}
                  className="h-[42px] shrink-0 w-full sm:w-auto"
                >
                  {verificandoDni ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Validando…
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      Validar DNI
                    </>
                  )}
                </PrimaryButton>
              </div>
              <FormField
                control={personalForm.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest">Teléfono</FormLabel>
                    <FormControl>
                      <input {...field} placeholder="+51987654321" className={INPUT_CLS} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="sm:col-span-2">
                <InputField label="Correo electrónico" value={perfil?.correo ?? ''} disabled />
              </div>
            </div>
            <div className="flex justify-end">
              <PrimaryButton type="submit" loading={personalForm.formState.isSubmitting}>
                {personalForm.formState.isSubmitting ? 'Guardando…' : 'Guardar datos personales'}
              </PrimaryButton>
            </div>
          </form>
        </Form>
      </SectionCard>

      {/* ── Datos de arrendador ─────────────────────────────────────────────── */}
      {esArrendador && (
        <SectionCard title="Datos de arrendador">
          <Form {...arrendadorForm}>
            <form onSubmit={arrendadorForm.handleSubmit(guardarArrendador)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={arrendadorForm.control}
                  name="nombreComercial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest">Nombre comercial</FormLabel>
                      <FormControl>
                        <input {...field} placeholder="Ej: Cuartos Plasencia" className={INPUT_CLS} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex flex-col sm:flex-row items-end gap-2">
                  <FormField
                    control={arrendadorForm.control}
                    name="ruc"
                    render={({ field }) => (
                      <FormItem className="flex-1 w-full">
                        <FormLabel className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest">RUC</FormLabel>
                        <FormControl>
                          <input {...field} placeholder="20XXXXXXXXX" className={INPUT_CLS} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <PrimaryButton
                    type="button"
                    onClick={handleVerificarRuc}
                    disabled={verificandoRuc || rucActual.length !== 11}
                    className="h-[42px] shrink-0 w-full sm:w-auto"
                  >
                    {verificandoRuc ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Validando…
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} />
                        Validar RUC
                      </>
                    )}
                  </PrimaryButton>
                </div>
              </div>

              <FormField
                control={arrendadorForm.control}
                name="esEmpresa"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <SwitchPrimitive.Root
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="w-11 h-6 rounded-full bg-muted transition-colors data-[state=checked]:bg-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <SwitchPrimitive.Thumb className="block w-5 h-5 rounded-full bg-white shadow-md transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
                      </SwitchPrimitive.Root>
                    </FormControl>
                    <FormLabel className="text-foreground text-sm font-medium !mt-0">Soy empresa / persona jurídica</FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <PrimaryButton type="submit" loading={arrendadorForm.formState.isSubmitting}>
                  {arrendadorForm.formState.isSubmitting ? 'Guardando…' : 'Guardar datos de arrendador'}
                </PrimaryButton>
              </div>
            </form>
          </Form>
        </SectionCard>
      )}

      {/* ── Ubicación ───────────────────────────────────────────────────────── */}
      {esArrendador && (
        <SectionCard title="Ubicación de propiedades">
          <p className="text-muted-foreground text-xs -mt-2">
            Haz clic en el mapa o arrastra el marcador para indicar la zona donde están tus cuartos.
          </p>

          <InputField
            label="Dirección"
            value={formUbicacion.direccionCuartos}
            onChange={v => setFormUbicacion(p => ({ ...p, direccionCuartos: v }))}
            placeholder="Ej: Av. Universitaria 1234, Ñaña"
          />

          <MapPicker
            lat={formUbicacion.lat}
            lng={formUbicacion.lng}
            onPositionChange={onMapPositionChange}
          />

          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <MapPin size={12} />
            <span>Lat: {formUbicacion.lat.toFixed(6)} · Lng: {formUbicacion.lng.toFixed(6)}</span>
          </div>

          <div className="flex justify-end">
            <PrimaryButton onClick={guardarUbicacion} loading={savingUbicacion}>
              {savingUbicacion ? 'Guardando…' : 'Guardar ubicación'}
            </PrimaryButton>
          </div>
        </SectionCard>
      )}

      {/* ── Documentos ──────────────────────────────────────────────────────── */}
      <SectionCard title="Documentos de verificación">
        <p className="text-muted-foreground text-xs -mt-2">
          Sube fotos nítidas de tu DNI. Serán revisadas por el equipo de AlquilaYa.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(['DNI_FRONTAL', 'DNI_REVERSO'] as const).map(tipo => (
            <DocumentCard
              key={tipo}
              tipo={tipo}
              titulo={tipo === 'DNI_FRONTAL' ? 'DNI — Cara frontal' : 'DNI — Cara posterior'}
              documento={documentos.find(d => d.tipoDocumento === tipo) ?? null}
              onUpload={subirDocumento}
              uploading={subiendoDoc === tipo}
            />
          ))}
        </div>
      </SectionCard>

      {/* ── Seguridad ───────────────────────────────────────────────────────── */}
      <SectionCard title="Cambiar contraseña">
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(guardarSeguridad)} className="space-y-4">
            <FormField
              control={passwordForm.control}
              name="actual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest">
                    Contraseña actual
                  </FormLabel>
                  <FormControl>
                    <PasswordInput {...field} autoComplete="current-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={passwordForm.control}
                name="nueva"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest">
                      Nueva contraseña
                    </FormLabel>
                    <FormControl>
                      <PasswordInput {...field} autoComplete="new-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest">
                      Confirmar nueva contraseña
                    </FormLabel>
                    <FormControl>
                      <PasswordInput {...field} autoComplete="new-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-muted-foreground text-xs">Mínimo 8 caracteres. Diferente a la contraseña actual.</p>
            <div className="flex justify-end">
              <PrimaryButton type="submit" loading={savingSeguridad}>
                {savingSeguridad ? 'Cambiando…' : 'Cambiar contraseña'}
              </PrimaryButton>
            </div>
          </form>
        </Form>
      </SectionCard>

      <ActiveSessions />

    </div>
  );
}
