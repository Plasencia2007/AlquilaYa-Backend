'use client';

import { useCallback, useEffect, useState } from 'react';
import { Monitor, Smartphone, Loader2 } from 'lucide-react';
import { UAParser } from 'ua-parser-js';

import { servicioAuth, type SesionDispositivo } from '@/services/auth-service';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/cn';

function hace(creado: number | null): string {
  if (!creado) return '';
  const diff = Date.now() - creado;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d === 1 ? '' : 's'}`;
}

/**
 * Parsea el user-agent crudo de una sesión (`s.dispositivo`) a un formato legible tipo
 * "Chrome · Windows · Lima, Peru" (ítem 188). La ciudad la resuelve el backend por IP
 * (`IpGeolocationService`, hallazgo de backend) y llega en `s.ciudad`, `null` si no se pudo
 * geolocalizar (IP privada/local, o el servicio externo falló).
 * `device.type` de ua-parser-js (mobile/tablet vs. undefined=desktop) es más confiable que el
 * regex anterior, así que reemplaza a `esMovil()` en vez de reusarla en paralelo.
 */
function formatearDispositivo(ua: string, ciudad: string | null): { etiqueta: string; esMovil: boolean } {
  if (!ua) return { etiqueta: 'Dispositivo desconocido', esMovil: false };
  const { browser, os, device } = new UAParser(ua).getResult();
  const partes = [browser.name, os.name, ciudad ?? undefined].filter((v): v is string => Boolean(v));
  return {
    etiqueta: partes.length > 0 ? partes.join(' · ') : ua,
    esMovil: device.type === 'mobile' || device.type === 'tablet',
  };
}

/** Lista de sesiones/dispositivos activos con cierre remoto (#10). Reusable en perfiles. */
export function ActiveSessions() {
  const [sesiones, setSesiones] = useState<SesionDispositivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      setSesiones(await servicioAuth.obtenerSesiones());
    } catch {
      setSesiones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cerrar = async (jti: string) => {
    setBusy(jti);
    try {
      await servicioAuth.cerrarSesionRemota(jti);
      notify.success('Sesión cerrada en ese dispositivo');
      await cargar();
    } catch (err) {
      notify.error(err, 'No se pudo cerrar la sesión');
    } finally {
      setBusy(null);
    }
  };

  const cerrarOtras = async () => {
    setBusy('otras');
    try {
      const n = await servicioAuth.cerrarOtrasSesiones();
      notify.success(n > 0 ? `${n} sesión(es) cerrada(s)` : 'No había otras sesiones');
      await cargar();
    } catch (err) {
      notify.error(err, 'No se pudo cerrar las otras sesiones');
    } finally {
      setBusy(null);
    }
  };

  const otras = sesiones.filter((s) => !s.actual).length;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Dispositivos con sesión activa</h3>
          <p className="text-xs text-muted-foreground">
            Cierra el acceso en cualquier dispositivo que no reconozcas.
          </p>
        </div>
        {otras > 0 && (
          <button
            type="button"
            onClick={cerrarOtras}
            disabled={busy !== null}
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:border-destructive hover:text-destructive disabled:opacity-50"
          >
            Cerrar las demás
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando…
        </div>
      ) : sesiones.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No hay sesiones registradas.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {sesiones.map((s) => {
            const { etiqueta, esMovil } = formatearDispositivo(s.dispositivo, s.ciudad);
            const Icon = esMovil ? Smartphone : Monitor;
            return (
              <li
                key={s.jti}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3',
                  s.actual ? 'border-primary/40 bg-primary/5' : 'border-border',
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    {etiqueta}
                    {s.actual && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                        Este dispositivo
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.ip || 'IP desconocida'}
                    {s.creado ? ` · inició ${hace(s.creado)}` : ''}
                  </p>
                </div>
                {!s.actual && (
                  <button
                    type="button"
                    onClick={() => cerrar(s.jti)}
                    disabled={busy !== null}
                    className="shrink-0 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/20 disabled:opacity-50"
                  >
                    {busy === s.jti ? 'Cerrando…' : 'Cerrar'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
