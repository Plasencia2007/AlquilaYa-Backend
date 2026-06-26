'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Check, Copy, Crown, Loader2, Trash2, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { notify } from '@/lib/notify';
import { RoommateCard } from '@/components/student/roommate-card';
import { grupoService, type CuotaPago, type GrupoRoommate } from '@/services/grupo-service';
import { pagoService } from '@/services/pago-service';
import { roommateService, type PerfilConvivencia } from '@/services/roommate-service';

export default function GrupoDetallePage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const codigoInvitado = search?.get('codigo') ?? null;
  const id = params?.id;

  const [grupo, setGrupo] = useState<GrupoRoommate | null>(null);
  const [miId, setMiId] = useState<number | null>(null);
  const [perfiles, setPerfiles] = useState<Record<number, PerfilConvivencia>>({});
  const [cuotas, setCuotas] = useState<CuotaPago[]>([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [cargando, setCargando] = useState(true);
  const [accion, setAccion] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const cargar = useCallback(async () => {
    if (!id) return;
    try {
      const [g, mi] = await Promise.all([
        grupoService.obtener(id),
        roommateService.miConvivencia().catch(() => null),
      ]);
      setGrupo(g);
      setMiId(mi?.estudianteId ?? null);
      const entradas = await Promise.all(
        g.miembros.map(async (m) => {
          try {
            return [m.estudianteId, await roommateService.convivenciaDe(m.estudianteId)] as const;
          } catch {
            return null;
          }
        }),
      );
      setPerfiles(Object.fromEntries(entradas.filter(Boolean) as [number, PerfilConvivencia][]));
      if (g.reservaId) {
        grupoService.cuotas(g.reservaId).then(setCuotas).catch(() => setCuotas([]));
      } else {
        setCuotas([]);
      }
    } catch (err) {
      notify.error(err, 'No se pudo cargar el grupo.');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setAccion(true);
    try {
      await fn();
      notify.success(ok);
      await cargar();
    } catch (err) {
      notify.error(err, 'No se pudo completar la acción.');
    } finally {
      setAccion(false);
    }
  };

  const pagarMiParte = async () => {
    if (!grupo?.reservaId) return;
    setAccion(true);
    try {
      const { url } = await pagoService.crearPreferenciaGrupo(grupo.reservaId);
      if (url) {
        const win = window.open(url, '_blank');
        if (!win) window.location.href = url;
      }
    } catch (err) {
      notify.error(err, 'No se pudo iniciar el pago de tu cuota.');
    } finally {
      setAccion(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }
  if (!grupo) return null;

  const miMembresia = grupo.miembros.find((m) => m.estudianteId === miId);
  const soyCreador = grupo.creadorEstudianteId === miId;
  const soyMiembro = miMembresia?.estado === 'CREADOR' || miMembresia?.estado === 'UNIDO';
  const soySolicitante = miMembresia?.estado === 'SOLICITADO';
  const lleno = grupo.cuposOcupados >= grupo.cuposTotales;
  const pct = Math.round((grupo.cuposOcupados / grupo.cuposTotales) * 100);

  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/student/groups/${grupo.id}?codigo=${grupo.codigoInvitacion}`
      : '';

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      notify.error(null, 'No se pudo copiar el link.');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
      {/* Encabezado */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black text-foreground">{grupo.nombre}</h1>
            <Link
              href={`/property/${grupo.propiedadId}`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {grupo.propiedadTitulo}
            </Link>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            {grupo.estado}
          </span>
        </div>
        {grupo.descripcion && <p className="mt-2 text-sm text-muted-foreground">{grupo.descripcion}</p>}

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs font-bold">
            <span className="text-muted-foreground">Cupos</span>
            <span className="text-primary">
              {grupo.cuposOcupados}/{grupo.cuposTotales}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Acciones del visitante */}
        <div className="mt-5 flex flex-wrap gap-2">
          {!miMembresia && grupo.estado === 'ABIERTO' && !lleno && (
            <>
              {codigoInvitado && (
                <Button onClick={() => run(() => grupoService.unirse(codigoInvitado), 'Te uniste al grupo')} disabled={accion} className="gap-1.5 font-bold">
                  <UserPlus className="size-4" /> Unirme con invitación
                </Button>
              )}
              <Button variant={codigoInvitado ? 'outline' : 'default'} onClick={() => run(() => grupoService.solicitar(grupo.id), 'Solicitud enviada')} disabled={accion} className="gap-1.5 font-bold">
                Solicitar unirme
              </Button>
            </>
          )}
          {soySolicitante && <span className="text-sm font-semibold text-amber-600">Tu solicitud está pendiente de aprobación.</span>}
          {soyMiembro && !soyCreador && (
            <Button variant="outline" onClick={() => run(() => grupoService.salir(grupo.id), 'Saliste del grupo')} disabled={accion}>
              Salir del grupo
            </Button>
          )}
          {soyCreador && (
            <Button variant="outline" className="gap-1.5 text-destructive hover:bg-destructive/5" onClick={() => run(() => grupoService.eliminar(grupo.id), 'Grupo eliminado')} disabled={accion}>
              <Trash2 className="size-4" /> Eliminar grupo
            </Button>
          )}
        </div>
      </div>

      {/* Fase 2: reservar en grupo (creador, grupo COMPLETO) */}
      {soyCreador && grupo.estado === 'COMPLETO' && (
        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <h3 className="font-bold text-foreground">¡Grupo completo! Reserven juntos</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Elige las fechas de la estadía; luego cada miembro paga su parte.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">Entrada</span>
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted-foreground">Salida</span>
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" />
            </label>
          </div>
          <Button className="mt-3 w-full font-bold" disabled={accion || !fechaInicio || !fechaFin}
            onClick={() => run(() => grupoService.reservar(grupo.id, { fechaInicio, fechaFin }), 'Reserva grupal creada')}>
            Reservar en grupo
          </Button>
        </div>
      )}

      {/* Fase 2: pago dividido (grupo RESERVADO) */}
      {grupo.estado === 'RESERVADO' && grupo.reservaId && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground">Pago dividido</h3>
            <Button variant="ghost" size="sm" onClick={() => cargar()} disabled={accion}>
              Actualizar
            </Button>
          </div>
          {(() => {
            const pagadas = cuotas.filter((c) => c.estado === 'PAGADO').length;
            const pct = cuotas.length ? Math.round((pagadas / cuotas.length) * 100) : 0;
            const miCuota = cuotas.find((c) => c.estudianteId === miId);
            return (
              <>
                <div className="mb-1 mt-2 flex justify-between text-xs font-bold">
                  <span className="text-muted-foreground">Pagaron</span>
                  <span className="text-primary">{pagadas}/{cuotas.length}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-3 space-y-1.5">
                  {cuotas.map((c) => (
                    <div key={c.estudianteId} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">
                        {perfiles[c.estudianteId]?.nombre ?? `Estudiante ${c.estudianteId}`}
                        {c.estudianteId === miId ? ' (tú)' : ''}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">S/ {c.monto.toLocaleString('es-PE')}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold',
                          c.estado === 'PAGADO' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                          {c.estado === 'PAGADO' ? 'Pagó' : 'Pendiente'}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                {miCuota && miCuota.estado === 'PENDIENTE' && (
                  <Button className="mt-4 w-full font-bold" disabled={accion} onClick={pagarMiParte}>
                    Pagar mi parte · S/ {miCuota.monto.toLocaleString('es-PE')}
                  </Button>
                )}
                {cuotas.length > 0 && pagadas === cuotas.length && (
                  <p className="mt-3 text-center text-sm font-bold text-green-600">
                    ¡Todos pagaron! La reserva quedará confirmada. 🎉
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Link de invitación (solo miembros) */}
      {soyMiembro && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 text-sm font-bold text-foreground">Invita a tus amigos</p>
          <div className="flex items-center gap-2">
            <input readOnly value={inviteUrl} className="flex-1 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs" />
            <Button size="sm" variant="outline" className="gap-1.5" onClick={copiar}>
              {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copiado ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
        </div>
      )}

      {/* Miembros */}
      <h2 className="mb-3 mt-8 text-lg font-black text-foreground">Integrantes</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {grupo.miembros.map((m) => {
          const perfil = perfiles[m.estudianteId];
          return (
            <div key={m.estudianteId} className="space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
                    m.estado === 'CREADOR'
                      ? 'bg-primary/10 text-primary'
                      : m.estado === 'SOLICITADO'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700',
                  )}
                >
                  {m.estado === 'CREADOR' && <Crown className="size-3" />}
                  {m.estado === 'CREADOR' ? 'Creador' : m.estado === 'SOLICITADO' ? 'Solicitó' : 'Miembro'}
                </span>
                {soyCreador && m.estado === 'SOLICITADO' && (
                  <Button size="sm" disabled={accion || lleno} onClick={() => run(() => grupoService.aprobar(grupo.id, m.estudianteId), 'Miembro aprobado')} className="h-7 gap-1 text-xs">
                    <Check className="size-3.5" /> Aprobar
                  </Button>
                )}
              </div>
              {perfil ? (
                <RoommateCard perfil={perfil} />
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Estudiante #{m.estudianteId}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
