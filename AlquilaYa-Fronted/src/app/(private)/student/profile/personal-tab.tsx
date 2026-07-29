'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, KeyRound, Pencil, User } from 'lucide-react';
import Cropper, { type Area } from 'react-easy-crop';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { useVerificationStatus } from '@/hooks/use-verification-status';
import { useTabParam } from '@/hooks/use-tab-param';
import { studentProfileService } from '@/services/student-profile-service';
import { profileService } from '@/services/profile-service';
import { roommateService, type PerfilConvivencia } from '@/services/roommate-service';
import { notify } from '@/lib/notify';
import {
  datosPersonalesSchema,
  type DatosPersonalesData,
} from '@/schemas/student-profile-schema';
import { TAB_VALUES } from './page';

/** Normaliza un teléfono a formato +51XXXXXXXXX (toma los últimos 9 dígitos). */
function normalizarTelefono(t?: string | null): string {
  if (!t) return '';
  const digits = t.replace(/\D/g, '').slice(-9);
  return digits ? '+51' + digits : '';
}

function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (e) => reject(e));
    img.src = url;
  });
}

/** Recorta `imagenSrc` al área `pixelCrop` (patrón estándar de react-easy-crop, vía canvas). */
async function recortarImagenABlob(imagenSrc: string, pixelCrop: Area): Promise<Blob> {
  const imagen = await cargarImagen(imagenSrc);
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');
  ctx.drawImage(
    imagen,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height,
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('No se pudo procesar la imagen'));
    }, 'image/jpeg', 0.92);
  });
}

export function PersonalTab() {
  const { usuario, inicializar } = useAuth();
  const perfilId = usuario?.perfilId;
  const { verificado } = useVerificationStatus();
  const [, setTab] = useTabParam({ values: TAB_VALUES, defaultValue: 'personal' });
  const [confirmando,      setConfirmando]      = useState(false);
  const [pendiente,        setPendiente]        = useState<DatosPersonalesData | null>(null);
  const [password,         setPassword]         = useState('');
  const [enviando,         setEnviando]         = useState(false);
  const [telefonoOriginal, setTelefonoOriginal] = useState('');
  const [fotoUrl,          setFotoUrl]          = useState<string | undefined>(undefined);

  // Perfil de convivencia (ítem 223): fuente real del badge "Buscando roomie".
  const [perfilConvivencia, setPerfilConvivencia] = useState<PerfilConvivencia | null>(null);

  // Recorte de avatar (ítem 222): input file oculto + modal de recorte 1:1.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagenParaRecortar, setImagenParaRecortar] = useState<string | null>(null);
  const [recorteAbierto,     setRecorteAbierto]     = useState(false);
  const [crop,               setCrop]               = useState({ x: 0, y: 0 });
  const [zoom,                setZoom]              = useState(1);
  const [areaRecorte,        setAreaRecorte]        = useState<Area | null>(null);
  const [subiendoFoto,       setSubiendoFoto]       = useState(false);

  const partes      = (usuario?.nombre ?? '').split(' ');
  const fotoMostrar = fotoUrl ?? usuario?.avatar;

  const form = useForm<DatosPersonalesData>({
    resolver: zodResolver(datosPersonalesSchema),
    defaultValues: {
      nombre:          partes[0] ?? '',
      apellido:        partes.slice(1).join(' ') ?? '',
      telefono:        '',
      fechaNacimiento: '',
    },
  });

  // El JWT no trae teléfono ni apellido → cargar los datos reales del servidor.
  useEffect(() => {
    if (!perfilId) return;
    studentProfileService
      .obtenerInfo(perfilId)
      .then((info) => {
        const tel = normalizarTelefono(info.telefono);
        setTelefonoOriginal(tel);
        setFotoUrl(info.fotoUrl ?? undefined);
        form.reset({
          nombre:          info.nombre ?? partes[0] ?? '',
          apellido:        info.apellido ?? '',
          telefono:        tel,
          fechaNacimiento: info.fechaNacimiento ?? '',
        });
      })
      .catch(() => {
        /* sin conexión / sin datos: se mantienen los valores por defecto */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfilId]);

  // Perfil de convivencia (ítem 223) — misma fuente que usa convivencia-tab.tsx.
  useEffect(() => {
    roommateService
      .miConvivencia()
      .then((p) => setPerfilConvivencia(p))
      .catch(() => {
        /* sin perfil de convivencia creado aún: el badge queda oculto */
      });
  }, []);

  const abrirSelectorFoto = () => fileInputRef.current?.click();

  const onSeleccionarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo después
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify.error(null, 'Selecciona un archivo de imagen');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify.error(null, 'La foto no puede superar 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImagenParaRecortar(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setAreaRecorte(null);
      setRecorteAbierto(true);
    };
    reader.readAsDataURL(file);
  };

  const cerrarRecorte = () => {
    setRecorteAbierto(false);
    setImagenParaRecortar(null);
    setAreaRecorte(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const guardarFotoRecortada = async () => {
    if (!imagenParaRecortar || !areaRecorte) return;
    setSubiendoFoto(true);

    let archivo: File;
    try {
      const blob = await recortarImagenABlob(imagenParaRecortar, areaRecorte);
      archivo = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
    } catch (err) {
      notify.error(err, 'No se pudo procesar la imagen');
      setSubiendoFoto(false);
      return;
    }

    const promesa = profileService.subirFotoPerfil(archivo);
    notify.promise(promesa, {
      loading: 'Subiendo foto…',
      success: 'Foto de perfil actualizada',
      error: 'No se pudo subir la foto',
    });
    try {
      const url = await promesa;
      setFotoUrl(url);
      inicializar(); // refresca el avatar en toda la app (navbar, etc.)
      cerrarRecorte();
    } catch {
      // el toast de notify.promise ya informó el error
    } finally {
      setSubiendoFoto(false);
    }
  };

  const onSubmit = (data: DatosPersonalesData) => {
    if (data.telefono !== telefonoOriginal) {
      setPendiente(data);
      setConfirmando(true);
      return;
    }
    void guardar(data);
  };

  const guardar = async (data: DatosPersonalesData) => {
    setEnviando(true);
    try {
      await studentProfileService.actualizarPersonal(data);
      notify.success('Datos actualizados');
      setTelefonoOriginal(data.telefono);

      // Releer del servidor para reflejar lo guardado (el JWT no se reemite).
      if (perfilId) {
        const info = await studentProfileService.obtenerInfo(perfilId);
        setFotoUrl(info.fotoUrl ?? undefined);
        form.reset({
          nombre:          info.nombre ?? data.nombre,
          apellido:        info.apellido ?? data.apellido,
          telefono:        normalizarTelefono(info.telefono) || data.telefono,
          fechaNacimiento: info.fechaNacimiento ?? data.fechaNacimiento ?? '',
        });
      }
      inicializar();
    } catch (err) {
      notify.error(err, 'No pudimos actualizar tus datos');
    } finally {
      setEnviando(false);
      setConfirmando(false);
      setPassword('');
      setPendiente(null);
    }
  };

  return (
    <>
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">

        {/* ── Cabecera de avatar ── */}
        <div className="mb-8 flex items-start gap-5">
          {/* Avatar con botón editar */}
          <div className="relative shrink-0">
            <UserAvatar
              src={fotoMostrar}
              nombre={usuario?.nombre ?? 'Avatar'}
              size="xl"
              className="ring-2 ring-primary/10"
            />
            <button
              type="button"
              aria-label="Editar foto"
              onClick={abrirSelectorFoto}
              className="absolute bottom-0 right-0 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-white"
            >
              <Pencil className="size-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onSeleccionarFoto}
              className="hidden"
            />
          </div>

          {/* Info */}
          <div className="space-y-2">
            <p className="text-lg font-extrabold tracking-tight text-foreground">
              {usuario?.nombre}
            </p>
            <p className="text-sm text-primary">{usuario?.correo}</p>
            <div className="flex flex-wrap gap-2">
              {verificado && (
                <span className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                  Estudiante verificado
                </span>
              )}
              {perfilConvivencia?.buscaCompaneros === true && (
                <button
                  type="button"
                  onClick={() => setTab('convivencia')}
                  className="rounded-full border border-border bg-muted/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Buscando roomie
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Formulario ── */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Nombre + Apellido */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Nombre
                    </Label>
                    <FormControl>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input {...field} className="h-11 rounded-xl pl-9" />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apellido"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Apellido
                    </Label>
                    <FormControl>
                      <Input {...field} placeholder="Ingresa tu apellido" className="h-11 rounded-xl" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Teléfono + Fecha de nacimiento */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Teléfono
                    </Label>
                    <FormControl>
                      <div className="flex h-11 overflow-hidden rounded-xl border border-input bg-input focus-within:ring-2 focus-within:ring-primary/30">
                        {/* Prefijo Perú */}
                        <div className="flex shrink-0 items-center gap-1.5 border-r border-input/60 bg-muted/60 px-3">
                          <span className="text-base leading-none">🇵🇪</span>
                          <span className="text-sm font-semibold text-foreground">+51</span>
                        </div>
                        {/* Solo los 9 dígitos */}
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={9}
                          placeholder="9XX XXX XXX"
                          value={field.value.replace(/^\+51/, '')}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                            field.onChange('+51' + digits);
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          className="flex-1 bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fechaNacimiento"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Fecha de nacimiento
                    </Label>
                    <FormControl>
                      <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input {...field} type="date" className="h-11 rounded-xl pl-9" />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="rounded-full px-6"
                onClick={() => form.reset()}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={enviando}
                className="rounded-full px-6 gap-2"
              >
                {enviando ? 'Guardando…' : 'Guardar cambios →'}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Dialog confirmación de contraseña */}
      <Dialog open={confirmando} onOpenChange={(v) => { setConfirmando(v); if (!v) { setPassword(''); } }}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[380px] sm:rounded-2xl">

          {/* Cabecera con ícono */}
          <div className="flex flex-col items-center gap-3 bg-gradient-to-b from-primary/10 to-transparent px-6 pb-5 pt-8">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-4 ring-primary/10">
              <KeyRound className="size-7 text-primary" />
            </div>
            <div className="text-center">
              <DialogTitle className="text-lg font-bold">Confirma tu identidad</DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Por seguridad ingresa tu contraseña actual<br />para guardar el nuevo número.
              </DialogDescription>
            </div>
          </div>

          {/* Cuerpo */}
          <div className="space-y-4 px-6 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pass" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Contraseña actual
              </Label>
              <PasswordInput
                id="confirm-pass"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && password && !enviando) { void (pendiente && guardar({ ...pendiente, passwordActual: password })); } }}
                autoComplete="current-password"
                placeholder="Tu contraseña actual"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 border-t border-border px-6 py-4">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => { setConfirmando(false); setPassword(''); }}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 rounded-xl"
              disabled={!password || enviando}
              onClick={() => pendiente && guardar({ ...pendiente, passwordActual: password })}
            >
              {enviando ? 'Guardando…' : 'Confirmar →'}
            </Button>
          </div>

        </DialogContent>
      </Dialog>

      {/* Dialog de recorte de foto de perfil (ítem 222) */}
      <Dialog open={recorteAbierto} onOpenChange={(v) => { if (!v) cerrarRecorte(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recorta tu foto de perfil</DialogTitle>
            <DialogDescription>
              Ajusta el área cuadrada que se usará como tu avatar.
            </DialogDescription>
          </DialogHeader>

          {imagenParaRecortar && (
            <div className="relative h-72 w-full overflow-hidden rounded-xl bg-muted">
              <Cropper
                image={imagenParaRecortar}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_area, areaPixeles) => setAreaRecorte(areaPixeles)}
              />
            </div>
          )}

          <div className="flex items-center gap-3 px-1">
            <span className="text-xs font-semibold text-muted-foreground">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cerrarRecorte} disabled={subiendoFoto}>
              Cancelar
            </Button>
            <Button onClick={() => void guardarFotoRecortada()} disabled={!areaRecorte || subiendoFoto}>
              {subiendoFoto ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
