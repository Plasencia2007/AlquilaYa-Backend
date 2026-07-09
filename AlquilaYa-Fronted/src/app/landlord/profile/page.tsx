'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import {
  Eye, EyeOff, Star, Camera, Upload, CheckCircle, Clock, XCircle,
  Loader2, FileImage, FileText, MapPin,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { notify } from '@/lib/notify';
import { profileService } from '@/services/profile-service';
import { documentsService } from '@/services/documents-service';
import { EmailVerificationBanner } from '@/components/auth/email-verification-banner';
import { ActiveSessions } from '@/components/auth/active-sessions';
import { UPEU_COORDS } from '@/lib/geo';
import type { Perfil, Documento, TipoDocumento, EstadoUsuario } from '@/types/profile';

const MapPicker = dynamic(() => import('@/components/shared/MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] w-full animate-pulse rounded-xl bg-slate-700/50 flex items-center justify-center text-slate-400 text-sm">
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-6 space-y-5">
      <h2 className="text-white text-lg font-black">{title}</h2>
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
      <span className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-2.5 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      />
    </label>
  );
}

function PasswordField({
  label, value, onChange, show, onToggle,
}: {
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">{label}</span>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-4 py-2.5 pr-11 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-primary transition-colors"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

function PrimaryButton({
  children, onClick, disabled, loading, type = 'button',
}: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  loading?: boolean; type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary text-white text-sm font-bold transition-colors disabled:opacity-50"
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
          className={i <= Math.round(valor) ? 'fill-yellow-400 text-yellow-400' : 'fill-slate-700 text-slate-700'}
        />
      ))}
      <span className="text-slate-400 text-xs ml-1">{valor.toFixed(1)}</span>
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
    <div className="bg-slate-700/50 border border-slate-600/50 rounded-xl p-4 space-y-3 flex flex-col">
      <p className="text-white text-sm font-bold">{titulo}</p>

      <div className="h-32 rounded-lg overflow-hidden bg-slate-600/50 flex items-center justify-center flex-1">
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
          <div className="flex flex-col items-center gap-1 text-slate-500">
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
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-600/80 hover:bg-slate-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
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

  const [formPersonal, setFormPersonal] = useState({ nombre: '', apellido: '', dni: '', telefono: '' });
  const [formArrendador, setFormArrendador] = useState({ nombreComercial: '', ruc: '', esEmpresa: false });
  const [formUbicacion, setFormUbicacion] = useState({
    lat: UPEU_COORDS.lat, lng: UPEU_COORDS.lng, direccionCuartos: '',
  });
  const [formSeguridad, setFormSeguridad] = useState({ actual: '', nueva: '', confirmar: '' });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingArrendador, setSavingArrendador] = useState(false);
  const [verificandoRuc, setVerificandoRuc] = useState(false);
  const [verificandoDni, setVerificandoDni] = useState(false);
  const [savingUbicacion, setSavingUbicacion] = useState(false);
  const [savingSeguridad, setSavingSeguridad] = useState(false);
  const [savingFoto, setSavingFoto] = useState(false);
  const [subiendoDoc, setSubiendoDoc] = useState<string | null>(null);

  const [showActual, setShowActual] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    Promise.allSettled([
      profileService.obtenerMiPerfil(),
      documentsService.listarMisDocumentos(),
    ]).then(([perfilRes, docsRes]) => {
      if (cancelado) return;
      if (perfilRes.status === 'fulfilled') {
        const p = perfilRes.value;
        setPerfil(p);
        setFormPersonal({ nombre: p.nombre, apellido: p.apellido, dni: p.dni ?? '', telefono: p.telefono ?? '' });
        if (p.detallesArrendador) {
          setFormArrendador({
            nombreComercial: p.detallesArrendador.nombreComercial ?? '',
            ruc: p.detallesArrendador.ruc ?? '',
            esEmpresa: p.detallesArrendador.esEmpresa ?? false,
          });
          setFormUbicacion({
            lat: p.detallesArrendador.latitud ?? UPEU_COORDS.lat,
            lng: p.detallesArrendador.longitud ?? UPEU_COORDS.lng,
            direccionCuartos: p.detallesArrendador.direccionPropiedades ?? '',
          });
        }
      } else {
        notify.error(perfilRes.reason, 'No se pudo cargar el perfil');
      }
      if (docsRes.status === 'fulfilled') setDocumentos(docsRes.value);
      setCargando(false);
    });
    return () => { cancelado = true; };
  }, []);

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

  const guardarPersonal = async () => {
    setSavingPersonal(true);
    try {
      const actualizado = await profileService.actualizarPerfil({
        nombre: formPersonal.nombre,
        apellido: formPersonal.apellido,
        dni: formPersonal.dni || undefined,
        telefono: formPersonal.telefono || undefined,
      });
      setPerfil(actualizado);
      notify.success('Datos personales actualizados');
    } catch (err) {
      notify.error(err, 'No se pudo actualizar');
    } finally {
      setSavingPersonal(false);
    }
  };

  const buildDetallesArrendador = () => ({
    nombreComercial: formArrendador.nombreComercial || undefined,
    ruc: formArrendador.ruc || undefined,
    esEmpresa: formArrendador.esEmpresa,
    direccionCuartos: formUbicacion.direccionCuartos,
    latitud: formUbicacion.lat,
    longitud: formUbicacion.lng,
  });

  const handleVerificarDni = async () => {
    if (formPersonal.dni.length !== 8) {
      notify.error(null, 'El DNI debe tener exactamente 8 dígitos.');
      return;
    }
    setVerificandoDni(true);
    try {
      await documentsService.verificarDniInstantaneo(formPersonal.dni);
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
    if (formArrendador.ruc.length !== 11) {
      notify.error(null, 'El RUC debe tener exactamente 11 dígitos.');
      return;
    }
    setVerificandoRuc(true);
    try {
      const res = await profileService.verificarRuc(formArrendador.ruc);
      if (res.success) {
        notify.success('RUC verificado con SUNAT', 'Datos comerciales cargados.');
        setFormArrendador(p => ({
          ...p,
          nombreComercial: res.razonSocial || p.nombreComercial,
        }));
        if (res.direccion) {
          setFormUbicacion(p => ({
            ...p,
            direccionCuartos: res.direccion,
          }));
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

  const guardarArrendador = async () => {
    if (!formUbicacion.direccionCuartos.trim()) {
      notify.error(null, 'Completa la dirección en la sección Ubicación primero');
      return;
    }
    setSavingArrendador(true);
    try {
      const actualizado = await profileService.actualizarPerfil({ detallesArrendador: buildDetallesArrendador() });
      setPerfil(actualizado);
      notify.success('Datos de arrendador actualizados');
    } catch (err) {
      notify.error(err, 'No se pudo actualizar');
    } finally {
      setSavingArrendador(false);
    }
  };

  const guardarUbicacion = async () => {
    if (!formUbicacion.direccionCuartos.trim()) {
      notify.error(null, 'La dirección es obligatoria');
      return;
    }
    setSavingUbicacion(true);
    try {
      const actualizado = await profileService.actualizarPerfil({ detallesArrendador: buildDetallesArrendador() });
      setPerfil(actualizado);
      notify.success('Ubicación actualizada');
    } catch (err) {
      notify.error(err, 'No se pudo actualizar la ubicación');
    } finally {
      setSavingUbicacion(false);
    }
  };

  const guardarSeguridad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formSeguridad.nueva.length < 8) { notify.error(null, 'La nueva contraseña debe tener al menos 8 caracteres'); return; }
    if (formSeguridad.nueva !== formSeguridad.confirmar) { notify.error(null, 'Las contraseñas no coinciden'); return; }
    if (formSeguridad.nueva === formSeguridad.actual) { notify.error(null, 'La nueva contraseña debe ser diferente a la actual'); return; }
    setSavingSeguridad(true);
    try {
      await profileService.cambiarPassword(formSeguridad.actual, formSeguridad.nueva);
      setFormSeguridad({ actual: '', nueva: '', confirmar: '' });
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
        <div className="bg-slate-800 rounded-2xl p-6 h-40" />
        <div className="bg-slate-800 rounded-2xl p-6 h-64" />
        <div className="bg-slate-800 rounded-2xl p-6 h-48" />
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
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-start gap-5 flex-wrap">

          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="w-[110px] h-[110px] rounded-full overflow-hidden bg-slate-700 flex items-center justify-center cursor-pointer group ring-4 ring-slate-700/50 hover:ring-primary/40 transition-all"
            >
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-white/70">{initials}</span>
              )}
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={22} className="text-white" />
              </div>
            </div>
            <input ref={avatarInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={onAvatarChange} />
          </div>

          {/* Info */}
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-white text-2xl font-black tracking-tight">
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

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400 text-sm">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField label="Nombre" value={formPersonal.nombre}
            onChange={v => setFormPersonal(p => ({ ...p, nombre: v }))} />
          <InputField label="Apellido" value={formPersonal.apellido}
            onChange={v => setFormPersonal(p => ({ ...p, apellido: v }))} />
          <div className="flex flex-col sm:flex-row items-end gap-2">
            <div className="flex-1 w-full">
              <InputField label="DNI" value={formPersonal.dni}
                onChange={v => setFormPersonal(p => ({ ...p, dni: v }))}
                placeholder="12345678" />
            </div>
            <button
              type="button"
              onClick={handleVerificarDni}
              disabled={verificandoDni || formPersonal.dni.length !== 8}
              className="h-[42px] px-4 bg-gradient-to-r from-primary to-violet-600 hover:from-primary/95 hover:to-violet-600/95 disabled:from-slate-700 disabled:to-slate-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {verificandoDni ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  Validar DNI
                </>
              )}
            </button>
          </div>
          <InputField label="Teléfono" value={formPersonal.telefono}
            onChange={v => setFormPersonal(p => ({ ...p, telefono: v }))}
            placeholder="+51 9XX XXX XXX" />
          <div className="sm:col-span-2">
            <InputField label="Correo electrónico" value={perfil?.correo ?? ''} disabled />
          </div>
        </div>
        <div className="flex justify-end">
          <PrimaryButton onClick={guardarPersonal} loading={savingPersonal}>
            {savingPersonal ? 'Guardando…' : 'Guardar datos personales'}
          </PrimaryButton>
        </div>
      </SectionCard>

      {/* ── Datos de arrendador ─────────────────────────────────────────────── */}
      {esArrendador && (
        <SectionCard title="Datos de arrendador">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Nombre comercial" value={formArrendador.nombreComercial}
              onChange={v => setFormArrendador(p => ({ ...p, nombreComercial: v }))}
              placeholder="Ej: Cuartos Plasencia" />
            <div className="flex flex-col sm:flex-row items-end gap-2">
              <div className="flex-1 w-full">
                <InputField label="RUC" value={formArrendador.ruc}
                  onChange={v => setFormArrendador(p => ({ ...p, ruc: v }))}
                  placeholder="20XXXXXXXXX" />
              </div>
              <button
                type="button"
                onClick={handleVerificarRuc}
                disabled={verificandoRuc || formArrendador.ruc.length !== 11}
                className="h-[42px] px-4 bg-gradient-to-r from-primary to-violet-600 hover:from-primary/95 hover:to-violet-600/95 disabled:from-slate-700 disabled:to-slate-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                {verificandoRuc ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    Validar RUC
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SwitchPrimitive.Root
              checked={formArrendador.esEmpresa}
              onCheckedChange={v => setFormArrendador(p => ({ ...p, esEmpresa: v }))}
              className="w-11 h-6 rounded-full bg-slate-600 transition-colors data-[state=checked]:bg-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <SwitchPrimitive.Thumb className="block w-5 h-5 rounded-full bg-white shadow-md transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
            </SwitchPrimitive.Root>
            <span className="text-slate-300 text-sm font-medium">Soy empresa / persona jurídica</span>
          </div>

          <div className="flex justify-end">
            <PrimaryButton onClick={guardarArrendador} loading={savingArrendador}>
              {savingArrendador ? 'Guardando…' : 'Guardar datos de arrendador'}
            </PrimaryButton>
          </div>
        </SectionCard>
      )}

      {/* ── Ubicación ───────────────────────────────────────────────────────── */}
      {esArrendador && (
        <SectionCard title="Ubicación de propiedades">
          <p className="text-slate-400 text-xs -mt-2">
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

          <div className="flex items-center gap-2 text-slate-500 text-xs">
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
        <p className="text-slate-400 text-xs -mt-2">
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
        <form onSubmit={guardarSeguridad} className="space-y-4">
          <PasswordField
            label="Contraseña actual"
            value={formSeguridad.actual}
            onChange={v => setFormSeguridad(p => ({ ...p, actual: v }))}
            show={showActual}
            onToggle={() => setShowActual(s => !s)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PasswordField
              label="Nueva contraseña"
              value={formSeguridad.nueva}
              onChange={v => setFormSeguridad(p => ({ ...p, nueva: v }))}
              show={showNueva}
              onToggle={() => setShowNueva(s => !s)}
            />
            <PasswordField
              label="Confirmar nueva contraseña"
              value={formSeguridad.confirmar}
              onChange={v => setFormSeguridad(p => ({ ...p, confirmar: v }))}
              show={showConfirmar}
              onToggle={() => setShowConfirmar(s => !s)}
            />
          </div>
          <p className="text-slate-500 text-xs">Mínimo 8 caracteres. Diferente a la contraseña actual.</p>
          <div className="flex justify-end">
            <PrimaryButton type="submit" loading={savingSeguridad}>
              {savingSeguridad ? 'Cambiando…' : 'Cambiar contraseña'}
            </PrimaryButton>
          </div>
        </form>
      </SectionCard>

      <ActiveSessions />

    </div>
  );
}
