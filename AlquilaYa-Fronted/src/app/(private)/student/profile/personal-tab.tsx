'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Phone, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { AvatarInitial } from '@/components/student/avatar-initial';
import { useAuth } from '@/hooks/use-auth';
import { studentProfileService } from '@/services/student-profile-service';
import { notify } from '@/lib/notify';
import {
  datosPersonalesSchema,
  type DatosPersonalesData,
} from '@/schemas/student-profile-schema';

export function PersonalTab() {
  const { usuario, inicializar } = useAuth();
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, setPendiente] = useState<DatosPersonalesData | null>(null);
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);

  const partes = (usuario?.nombre ?? '').split(' ');
  const form = useForm<DatosPersonalesData>({
    resolver: zodResolver(datosPersonalesSchema),
    defaultValues: {
      nombre: partes[0] ?? '',
      apellido: partes.slice(1).join(' ') ?? '',
      telefono: usuario?.telefono ?? '',
    },
  });

  const onSubmit = (data: DatosPersonalesData) => {
    const cambioTelefono = data.telefono !== (usuario?.telefono ?? '');
    if (cambioTelefono) {
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
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <AvatarInitial nombre={usuario?.nombre ?? '?'} size="xl" />
          <div>
            <p className="text-sm font-bold text-foreground">{usuario?.nombre}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="size-3" /> {usuario?.correo}
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-xs font-bold uppercase tracking-wider">Nombre</Label>
                    <FormControl>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input {...field} className="h-11 pl-9" />
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
                    <Label className="text-xs font-bold uppercase tracking-wider">Apellido</Label>
                    <FormControl>
                      <Input {...field} className="h-11" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <Label className="text-xs font-bold uppercase tracking-wider">Teléfono</Label>
                  <FormControl>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input {...field} type="tel" className="h-11 pl-9" />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                  <p className="text-[10px] text-muted-foreground">
                    Cambiar el teléfono requiere confirmar tu contraseña actual.
                  </p>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={enviando} className="w-full sm:w-auto">
              {enviando ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </form>
        </Form>
      </div>

      <Dialog open={confirmando} onOpenChange={setConfirmando}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirma tu contraseña</DialogTitle>
            <DialogDescription>
              Por seguridad, ingresa tu contraseña actual para cambiar el teléfono.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-pass">Contraseña actual</Label>
            <Input
              id="confirm-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!password || enviando}
              onClick={() => pendiente && guardar({ ...pendiente, passwordActual: password })}
            >
              {enviando ? 'Guardando…' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
