'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { adminSettingsService } from '@/services/admin-settings-service';

const MIN_HORAS = 1;
const MAX_HORAS = 720; // 30 días

export default function AdminSettingsPage() {
  const [horas, setHoras] = useState('');
  const [valorActual, setValorActual] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardadoOk, setGuardadoOk] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const config = await adminSettingsService.obtenerConfiguracionReserva();
      setValorActual(config.expiracionHoras);
      setHoras(String(config.expiracionHoras));
    } catch {
      setError('No se pudo cargar la configuración. Verifica tu sesión de administrador.');
    } finally {
      setCargando(false);
    }
  };

  const guardar = async () => {
    setError(null);
    setGuardadoOk(false);
    const n = Number(horas);
    if (!Number.isInteger(n) || n < MIN_HORAS || n > MAX_HORAS) {
      setError(`Ingresa un número entero entre ${MIN_HORAS} y ${MAX_HORAS} horas.`);
      return;
    }
    setGuardando(true);
    try {
      const config = await adminSettingsService.actualizarConfiguracionReserva(n);
      setValorActual(config.expiracionHoras);
      setHoras(String(config.expiracionHoras));
      setGuardadoOk(true);
    } catch {
      setError('No se pudo guardar el cambio. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const sinCambios = valorActual !== null && Number(horas) === valorActual;

  return (
    <div className="space-y-8 animate-fade-in p-6 max-w-3xl">
      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-2xl">
            settings_applications
          </span>
        </div>
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter">
            Reglas de la Plataforma
          </h1>
          <p className="text-muted-foreground font-medium opacity-70">
            Parámetros globales del sistema de reservas.
          </p>
        </div>
      </div>

      {/* Tarjeta: expiración de reservas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Expiración de reservas sin pago</CardTitle>
          <CardDescription>
            Una reserva <strong>APROBADA</strong> que no se paga dentro de este plazo pasa
            automáticamente a <strong>EXPIRADA</strong> y libera el cuarto para otros estudiantes.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {cargando ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Cargando configuración…
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="expiracionHoras" className="text-sm font-semibold text-foreground">
                Horas para pagar tras la aprobación
              </label>
              <div className="flex items-center gap-3">
                <Input
                  id="expiracionHoras"
                  type="number"
                  min={MIN_HORAS}
                  max={MAX_HORAS}
                  value={horas}
                  onChange={(e) => {
                    setHoras(e.target.value);
                    setGuardadoOk(false);
                  }}
                  className="w-32"
                />
                <span className="text-muted-foreground text-sm">horas</span>
                {valorActual !== null && (
                  <span className="text-xs text-muted-foreground opacity-70">
                    (valor actual: {valorActual}h)
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground opacity-70">
                Entre {MIN_HORAS} y {MAX_HORAS} horas. El cambio aplica sin reiniciar el servicio,
                en la siguiente ejecución del job de expiración (cada hora).
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}
          {guardadoOk && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-600/10 rounded-md px-3 py-2">
              <span className="material-symbols-outlined text-base">check_circle</span>
              Cambios guardados. El nuevo plazo es de {valorActual}h.
            </div>
          )}
        </CardContent>

        <CardFooter className="gap-3">
          <Button onClick={guardar} disabled={cargando || guardando || sinCambios}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </Button>
          <Button
            variant="outline"
            onClick={cargar}
            disabled={cargando || guardando}
          >
            Restablecer
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
