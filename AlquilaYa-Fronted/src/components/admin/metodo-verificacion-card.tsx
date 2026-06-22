'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  adminAuthConfigService,
  type MetodoVerificacion,
} from '@/services/admin-auth-config-service';

const OPCIONES: { value: MetodoVerificacion; titulo: string; desc: string }[] = [
  { value: 'EMAIL', titulo: 'Solo correo', desc: 'Link de verificación por Gmail. Gratis.' },
  { value: 'WHATSAPP_OTP', titulo: 'Solo WhatsApp (OTP)', desc: 'Código de 6 dígitos por WhatsApp.' },
  { value: 'AMBOS', titulo: 'Correo y WhatsApp', desc: 'Exige verificar ambos.' },
  { value: 'NINGUNO', titulo: 'Sin verificación', desc: 'Acceso libre, sin verificar nada.' },
];

export function MetodoVerificacionCard() {
  const [actual, setActual] = useState<MetodoVerificacion | null>(null);
  const [sel, setSel] = useState<MetodoVerificacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const m = await adminAuthConfigService.obtener();
      setActual(m);
      setSel(m);
    } catch {
      setError('No se pudo cargar el método de verificación.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const guardar = async () => {
    if (!sel) return;
    setError(null);
    setOk(false);
    setGuardando(true);
    try {
      const m = await adminAuthConfigService.actualizar(sel);
      setActual(m);
      setSel(m);
      setOk(true);
    } catch {
      setError('No se pudo guardar el cambio. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const sinCambios = actual !== null && sel === actual;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Método de verificación al iniciar sesión</CardTitle>
        <CardDescription>
          Define qué debe verificar un usuario para poder entrar. Aplica en caliente a los
          <strong> logins y registros futuros</strong>; no cierra sesiones activas.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {cargando ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Cargando…
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {OPCIONES.map((o) => {
              const activo = sel === o.value;
              return (
                <label
                  key={o.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                    activo ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="metodo-verificacion"
                    value={o.value}
                    checked={activo}
                    onChange={() => {
                      setSel(o.value);
                      setOk(false);
                    }}
                    className="mt-1 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-bold text-foreground">{o.titulo}</span>
                    <span className="block text-xs text-muted-foreground">{o.desc}</span>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {actual && (
          <p className="text-xs text-muted-foreground opacity-70">
            Método actual: <strong>{OPCIONES.find((o) => o.value === actual)?.titulo}</strong>
          </p>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}
        {ok && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-600/10 rounded-md px-3 py-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            Método actualizado.
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-3">
        <Button onClick={guardar} disabled={cargando || guardando || sinCambios}>
          {guardando ? 'Guardando…' : 'Guardar método'}
        </Button>
        <Button variant="outline" onClick={cargar} disabled={cargando || guardando}>
          Restablecer
        </Button>
      </CardFooter>
    </Card>
  );
}
