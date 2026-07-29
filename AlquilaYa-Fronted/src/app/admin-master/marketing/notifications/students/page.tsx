'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Send, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useConfirm } from '@/hooks/use-confirm';
import { useDebounce } from '@/hooks/use-debounce';
import { notify } from '@/lib/notify';
import {
  adminCampanaService,
  type CampanaWhatsapp,
} from '@/services/admin-campana-service';

const ESTADOS: { value: string; label: string }[] = [
  { value: '', label: 'Cualquier estado' },
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'SUSPENDED', label: 'Suspendido' },
  { value: 'BANNED', label: 'Baneado' },
  { value: 'REJECTED', label: 'Rechazado' },
];

const ESTADO_ENVIO_BADGE: Record<CampanaWhatsapp['estadoEnvio'], string> = {
  PENDIENTE: 'bg-amber-100 text-amber-700',
  ENVIADA: 'bg-emerald-100 text-emerald-700',
  ERROR: 'bg-destructive/10 text-destructive',
};

function formatFecha(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-PE', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Campañas de WhatsApp a estudiantes segmentados por carrera/estado (ítem 381). El backend
 * resuelve el segmento (siempre respetando el opt-in `notificarMarketing`) y encola un evento
 * Kafka por destinatario que servicio-notificaciones envía (ver KafkaConsumer.js).
 */
export default function CampanasWhatsappStudentsPage() {
  const [carreras, setCarreras] = useState<string[]>([]);
  const [carrera, setCarrera] = useState('');
  const [estado, setEstado] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [programar, setProgramar] = useState(false);
  const [programadoPara, setProgramadoPara] = useState('');

  const [conteo, setConteo] = useState<number | null>(null);
  const [cargandoConteo, setCargandoConteo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [campanas, setCampanas] = useState<CampanaWhatsapp[]>([]);
  const [cargandoCampanas, setCargandoCampanas] = useState(true);

  const { confirm, ConfirmDialog } = useConfirm();

  const segmentoKey = useDebounce(`${carrera}|${estado}`, 400);

  useEffect(() => {
    adminCampanaService.carreras().then(setCarreras).catch(() => setCarreras([]));
  }, []);

  const cargarCampanas = useCallback(async () => {
    setCargandoCampanas(true);
    try {
      const data = await adminCampanaService.listar(0, 10);
      setCampanas(data.content ?? []);
    } catch (err) {
      notify.error(err, 'No se pudieron cargar las campañas recientes');
    } finally {
      setCargandoCampanas(false);
    }
  }, []);

  useEffect(() => {
    void cargarCampanas();
  }, [cargarCampanas]);

  useEffect(() => {
    const [c, e] = segmentoKey.split('|');
    setCargandoConteo(true);
    adminCampanaService
      .contarDestinatarios(c || undefined, e || undefined)
      .then(setConteo)
      .catch(() => setConteo(null))
      .finally(() => setCargandoConteo(false));
  }, [segmentoKey]);

  const handleEnviar = () => {
    if (mensaje.trim().length === 0) {
      notify.error(null, 'Escribe el mensaje de la campaña antes de continuar.');
      return;
    }
    if (programar && !programadoPara) {
      notify.error(null, 'Elige fecha y hora de envío, o desactiva la programación.');
      return;
    }

    const estadoLabel = ESTADOS.find((s) => s.value === estado)?.label ?? 'Cualquier estado';
    confirm({
      title: programar ? '¿Programar esta campaña?' : '¿Enviar esta campaña ahora?',
      tone: 'primary',
      confirmLabel: programar ? 'Programar' : 'Enviar ahora',
      description: (
        <div className="space-y-2 text-left">
          <p>
            Segmento: <b>{carrera || 'Todas las carreras'}</b> · <b>{estadoLabel}</b>
          </p>
          <p>
            Destinatarios estimados: <b>{conteo ?? '—'}</b> estudiante(s) (solo quienes aceptaron
            notificaciones de marketing).
          </p>
          {programar && (
            <p>
              Se enviará el: <b>{formatFecha(programadoPara)}</b>
            </p>
          )}
          <p className="rounded-lg bg-muted p-2.5 text-xs italic text-muted-foreground">
            &ldquo;{mensaje}&rdquo;
          </p>
        </div>
      ),
      onConfirm: async () => {
        try {
          setEnviando(true);
          await adminCampanaService.crear({
            carrera: carrera || undefined,
            estado: estado || undefined,
            mensaje: mensaje.trim(),
            programadoPara: programar ? programadoPara : undefined,
          });
          notify.success(programar ? 'Campaña programada correctamente' : 'Campaña enviada correctamente');
          setMensaje('');
          setProgramar(false);
          setProgramadoPara('');
          await cargarCampanas();
        } catch (err) {
          notify.error(err, 'No se pudo crear la campaña');
          return false;
        } finally {
          setEnviando(false);
        }
      },
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-2xl">notifications_active</span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tighter">Campañas WhatsApp — Estudiantes</h1>
          <p className="text-sm text-muted-foreground">
            Envía alertas, recordatorios o promociones a un segmento de estudiantes.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Carrera
            </Label>
            <select
              value={carrera}
              onChange={(e) => setCarrera(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Todas las carreras</option>
              {carreras.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Estado de cuenta
            </Label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {ESTADOS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
          <Users className="size-4 text-primary shrink-0" aria-hidden />
          <p className="text-sm text-foreground">
            {cargandoConteo ? (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden /> Calculando destinatarios…
              </span>
            ) : (
              <>
                <b>{conteo ?? 0}</b> estudiante(s) recibirán este mensaje (solo quienes aceptaron
                notificaciones de marketing).
              </>
            )}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="campana-mensaje" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Mensaje
          </Label>
          <textarea
            id="campana-mensaje"
            rows={4}
            maxLength={1000}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Ej. ¡Nuevas habitaciones cerca de tu campus ya disponibles! Revisa la app."
            className="w-full rounded-xl bg-muted border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all resize-none"
          />
          <p className="text-right text-[10px] text-muted-foreground">{mensaje.length}/1000</p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
          <div>
            <p className="text-sm font-bold text-foreground">Programar envío</p>
            <p className="text-xs text-muted-foreground">
              Si lo dejas apagado, la campaña se envía de inmediato al confirmar.
            </p>
          </div>
          <input
            type="checkbox"
            checked={programar}
            onChange={(e) => setProgramar(e.target.checked)}
            className="size-5 accent-primary"
          />
        </div>

        {programar && (
          <div className="space-y-1.5">
            <Label htmlFor="campana-fecha" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Fecha y hora de envío
            </Label>
            <input
              id="campana-fecha"
              type="datetime-local"
              value={programadoPara}
              onChange={(e) => setProgramadoPara(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="h-11 w-full rounded-xl border border-input bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border">
          <Button onClick={handleEnviar} disabled={enviando} className="gap-1.5 font-bold">
            {enviando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
            {programar ? 'Programar campaña' : 'Enviar campaña'}
          </Button>
        </div>
      </div>

      {/* Campañas recientes */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-black text-foreground uppercase tracking-wide">Campañas recientes</h2>
        </div>
        {cargandoCampanas ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Cargando…</div>
        ) : campanas.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Aún no se ha enviado ninguna campaña.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground font-black uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-3">Segmento</th>
                  <th className="px-5 py-3">Mensaje</th>
                  <th className="px-5 py-3">Destinatarios</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {campanas.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-3 text-foreground font-semibold">
                      {c.carrera || 'Todas'} {c.estado ? `· ${c.estado}` : ''}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground max-w-xs truncate">{c.mensaje}</td>
                    <td className="px-5 py-3 text-foreground">{c.destinatarios ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-lg font-black uppercase tracking-wider ${ESTADO_ENVIO_BADGE[c.estadoEnvio]}`}>
                        {c.estadoEnvio}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {c.programadoPara ? formatFecha(c.programadoPara) : formatFecha(c.enviadoAt ?? c.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {ConfirmDialog}
    </div>
  );
}
