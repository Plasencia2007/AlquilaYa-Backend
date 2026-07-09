'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, KeyRound, Pencil, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
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
import { studentProfileService } from '@/services/student-profile-service';
import { notify } from '@/lib/notify';
import {
  datosPersonalesSchema,
  type DatosPersonalesData,
} from '@/schemas/student-profile-schema';

/** Normaliza un teléfono a formato +51XXXXXXXXX (toma los últimos 9 dígitos). */
function normalizarTelefono(t?: string | null): string {
  if (!t) return '';
  const digits = t.replace(/\D/g, '').slice(-9);
  return digits ? '+51' + digits : '';
}

export function PersonalTab() {
  const { usuario, inicializar } = useAuth();
  const perfilId = usuario?.perfilId;
  const { verificado } = useVerificationStatus();
  const [confirmando,      setConfirmando]      = useState(false);
  const [pendiente,        setPendiente]        = useState<DatosPersonalesData | null>(null);
  const [password,         setPassword]         = useState('');
  const [enviando,         setEnviando]         = useState(false);
  const [telefonoOriginal, setTelefonoOriginal] = useState('');
  const [fotoUrl,          setFotoUrl]          = useState<string | undefined>(undefined);

  const partes      = (usuario?.nombre ?? '').split(' ');
  const inicial     = partes[0]?.charAt(0).toUpperCase() ?? '?';
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
            {fotoMostrar ? (
              <img
                src={fotoMostrar}
                alt={usuario?.nombre ?? 'Avatar'}
                referrerPolicy="no-referrer"
                className="size-20 rounded-full object-cover ring-2 ring-primary/10"
              />
            ) : (
              <span className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-3xl font-black text-primary">
                {inicial}
              </span>
            )}
            <button
              type="button"
              aria-label="Editar foto"
              className="absolute bottom-0 right-0 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-white"
            >
              <Pencil className="size-3.5" />
            </button>
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
              <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Buscando roomie
              </span>
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
    </>
  );
}
