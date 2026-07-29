'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { QRCodeSVG } from 'qrcode.react';
import {
  Bell,
  CheckCircle2,
  Copy,
  KeyRound,
  Lock,
  MessageSquare,
  Megaphone,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import { PasswordStrength } from '@/components/auth/password-strength';
import { ActiveSessions } from '@/components/auth/active-sessions';
import { useAuth } from '@/hooks/use-auth';
import { studentProfileService } from '@/services/student-profile-service';
import {
  notificacionPreferenciasService,
  type PreferenciasNotificacion,
} from '@/services/notificacion-preferencias-service';
import { twoFactorService, type Generar2faResponse } from '@/services/two-factor-service';
import { notify } from '@/lib/notify';
import {
  cambioPasswordSchema,
  type CambioPasswordData,
} from '@/schemas/student-profile-schema';

/* ── Banner Google ── */
function GoogleAccountBanner() {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-warning/20 bg-warning-light p-5">
      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/15">
        <ShieldAlert className="size-5 text-warning" />
      </span>
      <div>
        <p className="text-sm font-bold text-warning">
          Cuenta vinculada con Google
        </p>
        <p className="mt-1 text-xs leading-relaxed text-warning/80">
          Tu cuenta usa Google para iniciar sesión, por lo que la contraseña se gestiona directamente desde{' '}
          <span className="font-semibold">myaccount.google.com</span>.
          Aquí no puedes cambiarla.
        </p>
      </div>
    </div>
  );
}

/* ── Checklist de fortaleza de la contraseña ── */
const TIPS = [
  'Al menos 8 caracteres',
  'Letras mayúsculas y minúsculas',
  'Al menos un número',
  'Al menos un símbolo (!@#$…)',
];

/* ── Preferencias de notificación (ítem 210) ── */
const CATEGORIAS: {
  campo: keyof PreferenciasNotificacion;
  titulo: string;
  descripcion: string;
  icon: typeof MessageSquare;
}[] = [
  {
    campo: 'notificarMensajes',
    titulo: 'Mensajes de chat',
    descripcion: 'Avisos cuando un arrendador te escribe en la conversación.',
    icon: MessageSquare,
  },
  {
    campo: 'notificarReservas',
    titulo: 'Reservas y pagos',
    descripcion: 'Aprobación, rechazo, confirmación de pago y recordatorios de tus reservas.',
    icon: Bell,
  },
  {
    campo: 'notificarMarketing',
    titulo: 'Nuevas propiedades',
    descripcion: 'Alertas de zona cuando aparecen cuartos nuevos que calzan con tu búsqueda.',
    icon: Megaphone,
  },
];

function NotificationPreferencesSection() {
  const [prefs, setPrefs] = useState<PreferenciasNotificacion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificacionPreferenciasService
      .obtener()
      .then(setPrefs)
      .catch((err) => notify.error(err, 'No pudimos cargar tus preferencias de notificación'))
      .finally(() => setLoading(false));
  }, []);

  const cambiar = async (campo: keyof PreferenciasNotificacion, valor: boolean) => {
    if (!prefs) return;
    const anterior = prefs;
    const nuevo = { ...prefs, [campo]: valor };
    setPrefs(nuevo); // optimista

    const promesa = notificacionPreferenciasService.actualizar(nuevo);
    notify.promise(promesa, {
      loading: 'Guardando…',
      success: 'Preferencia actualizada',
      error: 'No pudimos guardar el cambio',
    });
    try {
      await promesa;
    } catch {
      setPrefs(anterior); // revierte el toggle si el backend rechazó el cambio
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="relative flex items-center gap-4 border-b border-border bg-gradient-to-r from-primary/5 via-transparent to-transparent px-6 py-5">
        <div className="absolute left-0 top-0 h-full w-1 rounded-l-3xl bg-primary" />
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <Bell className="size-5 text-primary" />
        </span>
        <div>
          <h3 className="text-sm font-extrabold tracking-tight text-foreground">Notificaciones</h3>
          <p className="text-xs text-muted-foreground">Elige qué avisos quieres recibir</p>
        </div>
      </div>

      <div className="divide-y divide-border p-6 pt-2">
        {loading ? (
          <div className="space-y-4 py-4">
            {CATEGORIAS.map((c) => (
              <Skeleton key={c.campo} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
        ) : !prefs ? (
          <p className="py-4 text-sm text-muted-foreground">
            No pudimos cargar tus preferencias. Recarga la página para intentarlo de nuevo.
          </p>
        ) : (
          CATEGORIAS.map(({ campo, titulo, descripcion, icon: Icon }) => (
            <div key={campo} className="flex items-center justify-between gap-4 py-4 first:pt-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/60">
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">{titulo}</p>
                  <p className="text-xs text-muted-foreground">{descripcion}</p>
                </div>
              </div>
              <Switch
                checked={prefs[campo]}
                onCheckedChange={(checked) => cambiar(campo, checked)}
                aria-label={titulo}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── 2FA / TOTP (ítem 229) ── */
function TwoFactorSection() {
  const [habilitado, setHabilitado] = useState<boolean | null>(null);
  const [cargandoEstado, setCargandoEstado] = useState(true);
  const [setup, setSetup] = useState<Generar2faResponse | null>(null);
  const [generando, setGenerando] = useState(false);
  const [mostrarDesactivar, setMostrarDesactivar] = useState(false);

  const codigoForm = useForm<{ codigo: string }>({ defaultValues: { codigo: '' } });
  const desactivarForm = useForm<{ password: string; codigo: string }>({
    defaultValues: { password: '', codigo: '' },
  });

  useEffect(() => {
    twoFactorService
      .estado()
      .then(setHabilitado)
      .catch(() => setHabilitado(false))
      .finally(() => setCargandoEstado(false));
  }, []);

  const activar = async () => {
    setGenerando(true);
    try {
      const res = await twoFactorService.generar();
      setSetup(res);
    } catch (err) {
      notify.error(err, 'No pudimos iniciar la configuración de 2FA');
    } finally {
      setGenerando(false);
    }
  };

  const confirmar = async (data: { codigo: string }) => {
    try {
      await twoFactorService.confirmar(data.codigo);
      notify.success('Autenticación de dos factores activada');
      setSetup(null);
      codigoForm.reset({ codigo: '' });
      setHabilitado(true);
    } catch (err) {
      notify.error(err, 'Código incorrecto. Verifica la hora de tu dispositivo e inténtalo de nuevo.');
    }
  };

  const desactivar = async (data: { password: string; codigo: string }) => {
    try {
      await twoFactorService.deshabilitar({
        password: data.password || undefined,
        codigo: data.codigo || undefined,
      });
      notify.success('Autenticación de dos factores desactivada');
      setHabilitado(false);
      setMostrarDesactivar(false);
      desactivarForm.reset({ password: '', codigo: '' });
    } catch (err) {
      notify.error(err, 'No pudimos desactivar la autenticación de dos factores');
    }
  };

  const copiarSecret = async () => {
    if (!setup) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
      notify.success('Código copiado');
    } catch {
      notify.error(null, 'No pudimos copiar el código');
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="relative flex items-center gap-4 border-b border-border bg-gradient-to-r from-primary/5 via-transparent to-transparent px-6 py-5">
        <div className="absolute left-0 top-0 h-full w-1 rounded-l-3xl bg-primary" />
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <KeyRound className="size-5 text-primary" />
        </span>
        <div>
          <h3 className="text-sm font-extrabold tracking-tight text-foreground">
            Autenticación de dos factores
          </h3>
          <p className="text-xs text-muted-foreground">
            Protege tu cuenta con un código de una app autenticadora (Google Authenticator, Authy…)
          </p>
        </div>
        {!cargandoEstado && habilitado != null && (
          <span
            className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
              habilitado ? 'bg-success-light text-success' : 'bg-muted text-muted-foreground'
            }`}
          >
            {habilitado ? <ShieldCheck className="size-3" /> : <ShieldOff className="size-3" />}
            {habilitado ? 'Activado' : 'Desactivado'}
          </span>
        )}
      </div>

      <div className="p-6">
        {cargandoEstado ? (
          <Skeleton className="h-11 w-40 rounded-full" />
        ) : habilitado && !mostrarDesactivar ? (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Tu cuenta está protegida con un segundo factor. Necesitarás tu app autenticadora
              cada vez que inicies sesión.
            </p>
            <Button
              type="button"
              variant="outline"
              className="shrink-0 gap-2 rounded-full border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => setMostrarDesactivar(true)}
            >
              <ShieldOff className="size-4" />
              Desactivar
            </Button>
          </div>
        ) : habilitado && mostrarDesactivar ? (
          <Form {...desactivarForm}>
            <form
              onSubmit={desactivarForm.handleSubmit(desactivar)}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground">
                Ingresa tu contraseña actual o un código vigente de tu app autenticadora para
                desactivar 2FA.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={desactivarForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Contraseña actual
                      </Label>
                      <FormControl>
                        <PasswordInput {...field} autoComplete="current-password" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={desactivarForm.control}
                  name="codigo"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        O código de la app
                      </Label>
                      <FormControl>
                        <input
                          {...field}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="123456"
                          className="h-11 w-full rounded-xl border border-input bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full px-6"
                  onClick={() => {
                    setMostrarDesactivar(false);
                    desactivarForm.reset({ password: '', codigo: '' });
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={desactivarForm.formState.isSubmitting}
                  className="rounded-full px-6"
                >
                  Confirmar desactivación
                </Button>
              </div>
            </form>
          </Form>
        ) : setup ? (
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-2xl border border-border bg-white p-3">
                <QRCodeSVG value={setup.otpauthUri} size={168} />
              </div>
              <button
                type="button"
                onClick={copiarSecret}
                className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground"
              >
                <Copy className="size-3" />
                {setup.secret}
              </button>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm font-bold text-foreground">1. Escanea el código QR</p>
                <p className="text-xs text-muted-foreground">
                  Usa Google Authenticator, Authy o tu app autenticadora favorita. Si no puedes
                  escanear, ingresa el código de texto manualmente.
                </p>
              </div>
              <Form {...codigoForm}>
                <form onSubmit={codigoForm.handleSubmit(confirmar)} className="space-y-3">
                  <p className="text-sm font-bold text-foreground">2. Ingresa el código de 6 dígitos</p>
                  <FormField
                    control={codigoForm.control}
                    name="codigo"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <InputOTP
                            maxLength={6}
                            inputMode="numeric"
                            pattern={REGEXP_ONLY_DIGITS}
                            autoComplete="one-time-code"
                            disabled={codigoForm.formState.isSubmitting}
                            {...field}
                          >
                            <InputOTPGroup>
                              {Array.from({ length: 6 }, (_, i) => (
                                <InputOTPSlot key={i} index={i} />
                              ))}
                            </InputOTPGroup>
                          </InputOTP>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-6"
                      onClick={() => {
                        setSetup(null);
                        codigoForm.reset({ codigo: '' });
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={codigoForm.formState.isSubmitting}
                      className="rounded-full px-6"
                    >
                      Activar 2FA
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Añade una capa extra de seguridad: además de tu contraseña, se te pedirá un código
              de 6 dígitos al iniciar sesión.
            </p>
            <Button
              type="button"
              loading={generando}
              onClick={activar}
              className="shrink-0 gap-2 rounded-full px-6"
            >
              <Smartphone className="size-4" />
              Activar 2FA
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Security Tab principal ── */
export function SecurityTab() {
  const { usuario } = useAuth();
  const esGoogle = usuario?.tipoLogin === 'GOOGLE';

  const form = useForm<CambioPasswordData>({
    resolver: zodResolver(cambioPasswordSchema),
    defaultValues: { actual: '', nueva: '', confirmar: '' },
  });

  const nueva = form.watch('nueva');

  const onSubmit = async (data: CambioPasswordData) => {
    try {
      await studentProfileService.cambiarPassword(data);
      notify.success('Contraseña actualizada correctamente');
      form.reset({ actual: '', nueva: '', confirmar: '' });
    } catch (err) {
      notify.error(err, 'No pudimos cambiar tu contraseña');
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Sección cambio de contraseña ── */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">

        {/* Cabecera */}
        <div className="relative flex items-center gap-4 border-b border-border bg-gradient-to-r from-primary/5 via-transparent to-transparent px-6 py-5">
          <div className="absolute left-0 top-0 h-full w-1 rounded-l-3xl bg-primary" />
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <Lock className="size-5 text-primary" />
          </span>
          <div>
            <h3 className="text-sm font-extrabold tracking-tight text-foreground">Cambiar contraseña</h3>
            <p className="text-xs text-muted-foreground">
              {esGoogle
                ? 'Gestionada por tu cuenta de Google'
                : 'Actualiza tu contraseña regularmente para mayor seguridad'}
            </p>
          </div>
          <span className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${esGoogle ? 'bg-warning-light text-warning' : 'bg-success-light text-success'}`}>
            <ShieldCheck className="size-3" />
            {esGoogle ? 'Google OAuth' : 'Cuenta local'}
          </span>
        </div>

        <div className="p-6">
          {esGoogle ? (
            <GoogleAccountBanner />
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
              {/* Formulario */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                  <FormField
                    control={form.control}
                    name="actual"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Contraseña actual
                        </Label>
                        <FormControl>
                          <PasswordInput {...field} autoComplete="current-password" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="nueva"
                      render={({ field }) => (
                        <FormItem>
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Nueva contraseña
                          </Label>
                          <FormControl>
                            <PasswordInput {...field} autoComplete="new-password" />
                          </FormControl>
                          <PasswordStrength password={field.value} />
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmar"
                      render={({ field }) => (
                        <FormItem>
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Confirmar contraseña
                          </Label>
                          <FormControl>
                            <PasswordInput {...field} autoComplete="new-password" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={form.formState.isSubmitting}
                      className="rounded-full px-8 gap-2"
                    >
                      <Lock className="size-4" />
                      {form.formState.isSubmitting ? 'Cambiando…' : 'Actualizar contraseña'}
                    </Button>
                  </div>
                </form>
              </Form>

              {/* Checklist lateral */}
              <aside className="hidden lg:block w-52 shrink-0">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Tu contraseña debe tener
                </p>
                <ul className="space-y-2.5">
                  {TIPS.map((tip) => (
                    <li key={tip} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className={`mt-0.5 size-3.5 shrink-0 ${nueva.length > 0 ? 'text-primary' : 'text-muted-foreground/30'}`} />
                      {tip}
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          )}
        </div>
      </div>

      {/* ── 2FA / TOTP (ítem 229) ── */}
      <TwoFactorSection />

      {/* ── Preferencias de notificación (ítem 210) ── */}
      <NotificationPreferencesSection />

      {/* ── Sesiones activas ── */}
      <ActiveSessions />

    </div>
  );
}
